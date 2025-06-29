// Bulk Import API - POST /api/import/markdown (import posts from ZIP or markdown files)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { parseZipFile, validateZipFile } from '../../../lib/zip-utils';
import { processMarkdownFiles, validatePost, normalizePost } from '../../../lib/markdown-utils';
import { generateSlug } from '../../../lib/utils';

interface ImportOptions {
  overwriteExisting?: boolean;
  createMissingTags?: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  newTags: number;
  overwritten: number;
}

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
    const overwriteExisting = formData.get('overwriteExisting') === 'true';
    const createMissingTags = formData.get('createMissingTags') !== 'false'; // Default true

    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const options: ImportOptions = {
      overwriteExisting,
      createMissingTags
    };

    let markdownFiles: any[] = [];

    // Handle single markdown file
    if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown')) {
      const content = await file.text();
      const { frontMatter, body } = parseFrontMatter(content);
      
      markdownFiles = [{
        filename: file.name,
        content,
        frontMatter,
        body,
        relativePath: file.name,
        folderPath: ''
      }];
    } else if (file.name.toLowerCase().endsWith('.zip')) {
      // Handle ZIP file
      const validation = await validateZipFile(file);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid ZIP file',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const zipResult = await parseZipFile(file);
      markdownFiles = zipResult.markdownFiles;
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'File must be a ZIP archive or markdown file'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (markdownFiles.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid markdown files found'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process files
    const summary = processMarkdownFiles(markdownFiles);
    
    // Import posts
    const result = await importPosts(repositories, summary.posts, options);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('POST /api/import/markdown error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to import posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Import posts into database
 */
async function importPosts(repositories: any, posts: any[], options: ImportOptions): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    newTags: 0,
    overwritten: 0
  };

  // Get existing posts for conflict checking
  const existingPosts = await repositories.posts.findMany({
    limit: 10000
  });
  const existingPostMap = new Map(existingPosts.posts.map((p: any) => [p.slug, p]));

  // Get existing tags
  const existingTags = await repositories.tags.findAll();
  const existingTagMap = new Map(existingTags.map((t: any) => [t.name.toLowerCase(), t]));

  for (const post of posts) {
    try {
      // Normalize and validate post
      const normalizedPost = normalizePost(post);
      const validation = validatePost(normalizedPost);

      if (!validation.valid) {
        result.errors.push(`${post.originalPath}: ${validation.errors.join(', ')}`);
        result.skipped++;
        continue;
      }

      // Check for existing post
      const existingPost = existingPostMap.get(normalizedPost.slug);
      if (existingPost && !options.overwriteExisting) {
        result.errors.push(`${post.originalPath}: Slug "${normalizedPost.slug}" already exists (skipped)`);
        result.skipped++;
        continue;
      }

      // Handle tags
      const tagIds: number[] = [];
      for (const tagName of normalizedPost.tags) {
        let tag = existingTagMap.get(tagName.toLowerCase());
        
        if (!tag && options.createMissingTags) {
          // Create new tag
          try {
            tag = await repositories.tags.create({
              name: tagName,
              slug: generateSlug(tagName),
              description: undefined
            });
            existingTagMap.set(tagName.toLowerCase(), tag);
            result.newTags++;
          } catch (error) {
            console.error(`Failed to create tag "${tagName}":`, error);
            result.errors.push(`${post.originalPath}: Failed to create tag "${tagName}"`);
            continue;
          }
        }

        if (tag) {
          tagIds.push((tag as any).id);
        }
      }

      // Prepare post data
      const postData = {
        title: normalizedPost.title,
        content: normalizedPost.content,
        excerpt: normalizedPost.excerpt,
        slug: normalizedPost.slug,
        type: normalizedPost.type,
        status: normalizedPost.status,
        language: normalizedPost.language || 'auto',
        tag_ids: tagIds
      };

      if (existingPost && options.overwriteExisting) {
        // Update existing post
        await repositories.posts.update((existingPost as any).id, {
          ...postData,
          updated_at: new Date().toISOString()
        });
        result.overwritten++;
      } else {
        // Create new post
        await repositories.posts.create({
          ...postData,
          created_at: normalizedPost.created_at,
          updated_at: normalizedPost.updated_at || normalizedPost.created_at,
          published_at: normalizedPost.status === 'published' ? (normalizedPost.created_at || new Date().toISOString()) : undefined
        });
        result.imported++;
      }

    } catch (error) {
      console.error(`Failed to import post ${post.originalPath}:`, error);
      result.errors.push(`${post.originalPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.skipped++;
    }
  }

  return result;
}

/**
 * Simple front matter parser
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