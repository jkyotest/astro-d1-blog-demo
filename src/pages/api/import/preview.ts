// Import Preview API - POST /api/import/preview (preview import without saving)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { parseZipFile, validateZipFile } from '../../../lib/zip-utils';
import { processMarkdownFiles, validatePost, normalizePost } from '../../../lib/markdown-utils';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle single markdown file
    if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown')) {
      try {
        console.log('Processing single markdown file:', file.name);
        const content = await file.text();
        const { frontMatter, body } = parseFrontMatter(content);
        
        const markdownFiles = [{
          filename: file.name,
          content,
          frontMatter,
          body,
          relativePath: file.name,
          folderPath: ''
        }];

        console.log('Processing markdown files...');
        const summary = processMarkdownFiles(markdownFiles);
        console.log('Checking for conflicts...');
        const conflicts = await checkForConflicts(repositories, summary.posts);
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            ...summary,
            conflicts,
            fileType: 'markdown'
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error processing markdown file:', error);
        throw new Error(`Failed to process markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Handle ZIP file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'File must be a ZIP archive or markdown file'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate ZIP file
    console.log('Validating ZIP file...');
    const validation = await validateZipFile(file);
    if (!validation.valid) {
      console.error('ZIP validation failed:', validation.errors);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid ZIP file',
        details: validation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse ZIP file
    console.log('Parsing ZIP file...');
    const zipResult = await parseZipFile(file);
    console.log('Found markdown files:', zipResult.markdownFiles.length, 'out of', zipResult.totalFiles, 'total files');
    
    if (zipResult.markdownFiles.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid markdown files found in ZIP'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process files and generate summary
    console.log('Processing markdown files...');
    const summary = processMarkdownFiles(zipResult.markdownFiles);
    
    // Check for conflicts with existing posts
    const conflicts = await checkForConflicts(repositories, summary.posts);

    // Validate each post
    const validationResults = summary.posts.map(post => {
      const normalized = normalizePost(post);
      const validation = validatePost(normalized);
      return {
        post: normalized,
        validation
      };
    });

    const validPosts = validationResults.filter(r => r.validation.valid).map(r => r.post);
    const invalidPosts = validationResults.filter(r => !r.validation.valid);

    // Collect all validation errors
    const allErrors = [
      ...summary.errors,
      ...invalidPosts.flatMap(r => r.validation.errors.map(err => `${r.post.originalPath}: ${err}`))
    ];

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalFiles: summary.totalFiles,
        validPosts: validPosts.length,
        invalidPosts: invalidPosts.length,
        posts: validPosts.slice(0, 10), // Limit preview to first 10 posts
        totalPostsPreview: validPosts.length > 10,
        conflicts,
        errors: allErrors,
        fileType: 'zip',
        statistics: {
          articles: validPosts.filter(p => p.type === 'article').length,
          notes: validPosts.filter(p => p.type === 'note').length,
          published: validPosts.filter(p => p.status === 'published').length,
          drafts: validPosts.filter(p => p.status === 'draft').length,
          uniqueTags: [...new Set(validPosts.flatMap(p => p.tags))].length
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('POST /api/import/preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: typeof error
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to preview import',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Check for conflicts with existing posts
 */
async function checkForConflicts(repositories: any, posts: any[]): Promise<string[]> {
  const conflicts: string[] = [];
  
  try {
    // Get all existing posts
    const existingPosts = await repositories.posts.findMany({
      limit: 10000 // Get all posts for conflict checking
    });

    const existingSlugs = new Set(existingPosts.posts.map((p: any) => p.slug));

    for (const post of posts) {
      if (existingSlugs.has(post.slug)) {
        conflicts.push(`Slug already exists: ${post.slug} (${post.originalPath || 'unknown'})`);
      }
    }
  } catch (error) {
    console.error('Error checking conflicts:', error);
    conflicts.push('Failed to check for conflicts with existing posts');
  }

  return conflicts;
}

/**
 * Simple front matter parser (copied from zip-utils to avoid circular dependency)
 */
function parseFrontMatter(content: string): { frontMatter: Record<string, any>; body: string } {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return {
      frontMatter: {},
      body: content
    };
  }

  const [, yamlContent, body] = match;
  const frontMatter = parseYamlFrontMatter(yamlContent);

  return {
    frontMatter,
    body: body.trim()
  };
}

/**
 * Simple YAML parser for front matter
 */
function parseYamlFrontMatter(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    result[key] = parseYamlValue(value);
  }

  return result;
}

/**
 * Parse YAML value
 */
function parseYamlValue(value: string): any {
  if (!value) return '';

  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Arrays
  if (value.startsWith('[') && value.endsWith(']')) {
    const arrayContent = value.slice(1, -1);
    return arrayContent
      .split(',')
      .map(item => item.trim())
      .map(item => {
        if ((item.startsWith('"') && item.endsWith('"')) || 
            (item.startsWith("'") && item.endsWith("'"))) {
          return item.slice(1, -1);
        }
        return item;
      })
      .filter(item => item.length > 0);
  }

  // Booleans
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  return value;
}