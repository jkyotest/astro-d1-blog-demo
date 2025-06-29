import { marked } from 'marked';
import type { ParsedMarkdownFile } from './zip-utils';
import { generateSlug, generateExcerpt } from './utils';

/**
 * Configure marked with safe defaults
 */
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

// Configure renderer for custom styling
const renderer = new marked.Renderer();

// Custom link renderer to add classes and target="_blank"
renderer.link = function({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline" ${title ? `title="${title}"` : ''}>${text}</a>`;
};

// Custom code renderer
renderer.code = function({ text }) {
  return `<pre class="bg-gray-100 p-2 rounded overflow-x-auto"><code class="text-sm">${text}</code></pre>`;
};

renderer.codespan = function({ text }) {
  return `<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">${text}</code>`;
};

marked.use({ renderer });

/**
 * Process markdown text for display using marked library
 */
export function processMarkdown(text: string): string {
  if (!text) return '';
  
  try {
    return marked(text) as string;
  } catch (error) {
    console.error('Failed to parse markdown:', error);
    // Fallback to plain text with line breaks
    return text.replace(/\n/g, '<br />');
  }
}

// Import/Export related types and functions
export interface ParsedPost {
  title?: string;
  content: string;
  excerpt?: string;
  slug: string;
  type: 'article' | 'note';
  status: 'draft' | 'published';
  language?: 'auto' | 'chinese' | 'japanese' | 'english';
  tags: string[];
  created_at: string;
  updated_at?: string;
  originalPath?: string;
  errors: string[];
}

export interface ImportSummary {
  totalFiles: number;
  validPosts: number;
  posts: ParsedPost[];
  conflicts: string[];
  errors: string[];
}

/**
 * Process markdown file and convert to post data
 */
export function processMarkdownFile(file: ParsedMarkdownFile): ParsedPost {
  const errors: string[] = [];
  const frontMatter = file.frontMatter;
  
  // Extract basic information
  const title = frontMatter.title || extractTitleFromContent(file.body);
  const content = file.body || '';
  
  // Determine post type
  let type: 'article' | 'note' = 'article';
  if (frontMatter.type) {
    type = frontMatter.type === 'note' ? 'note' : 'article';
  } else {
    // Auto-detect based on content length and title presence
    type = (!title || content.length < 500) ? 'note' : 'article';
  }

  // Generate slug
  let slug = frontMatter.slug;
  if (!slug) {
    if (title) {
      slug = generateSlug(title);
    } else {
      // Use filename and path
      slug = generateSlug(content.substring(0, 50));
    }
  }

  // Validate slug
  if (!slug || slug.length < 3) {
    slug = `imported-${Date.now()}`;
    errors.push('Generated fallback slug due to invalid original slug');
  }

  // Extract dates
  const created_at = extractCreatedDate(frontMatter, file.relativePath);
  const updated_at = extractUpdatedDate(frontMatter, created_at);

  // Extract tags
  const tags = extractTags(frontMatter);

  // Determine status
  const status = frontMatter.status === 'draft' ? 'draft' : 'published';

  // Generate excerpt for articles
  let excerpt = frontMatter.excerpt;
  if (!excerpt && type === 'article' && content) {
    excerpt = generateExcerpt(content);
  }

  // Extract language
  const language = frontMatter.language || 'auto';

  return {
    title: title || undefined,
    content,
    excerpt,
    slug,
    type,
    status,
    language,
    tags,
    created_at,
    updated_at,
    originalPath: file.relativePath,
    errors
  };
}

/**
 * Process multiple markdown files and return import summary
 */
export function processMarkdownFiles(files: ParsedMarkdownFile[], totalFiles?: number): ImportSummary {
  const posts: ParsedPost[] = [];
  const conflicts: string[] = [];
  const errors: string[] = [];
  const slugs = new Set<string>();

  for (const file of files) {
    try {
      const post = processMarkdownFile(file);
      
      // Check for slug conflicts
      if (slugs.has(post.slug)) {
        conflicts.push(`Duplicate slug: ${post.slug} (${file.relativePath})`);
        post.slug = `${post.slug}-${Date.now()}`;
      }
      slugs.add(post.slug);

      // Collect errors
      if (post.errors.length > 0) {
        errors.push(...post.errors.map(err => `${file.relativePath}: ${err}`));
      }

      posts.push(post);
    } catch (error) {
      errors.push(`Failed to process ${file.relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    totalFiles: files.length, // Only show actual processed markdown file count
    validPosts: posts.length,
    posts,
    conflicts,
    errors
  };
}

/**
 * Extract title from content if not in front matter
 */
function extractTitleFromContent(content: string): string | undefined {
  // Look for markdown H1 at the beginning
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Look for first line that looks like a title
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 5 && trimmed.length < 100 && !trimmed.startsWith('##')) {
      return trimmed;
    }
  }

  return undefined;
}

/**
 * Extract created date from front matter or path
 */
function extractCreatedDate(frontMatter: Record<string, any>, path: string): string {
  // Try front matter date fields
  const dateFields = ['date', 'created', 'created_at', 'published'];
  for (const field of dateFields) {
    if (frontMatter[field]) {
      const date = new Date(frontMatter[field]);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Try to extract from filename (YYYY-MM-DD-title.md)
  const filename = path.split('/').pop() || '';
  const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const date = new Date(dateMatch[1]);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try to extract from folder structure
  const pathParts = path.split('/');
  for (const part of pathParts) {
    // Look for YYYY, YYYY-MM, or YYYY-MM-DD patterns
    const yearMatch = part.match(/^(\d{4})$/);
    const monthMatch = part.match(/^(\d{4})-(\d{2})$/);
    const dayMatch = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    
    if (dayMatch) {
      const date = new Date(`${dayMatch[1]}-${dayMatch[2]}-${dayMatch[3]}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } else if (monthMatch) {
      const date = new Date(`${monthMatch[1]}-${monthMatch[2]}-01`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } else if (yearMatch) {
      const date = new Date(`${yearMatch[1]}-01-01`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Default to current date
  return new Date().toISOString();
}

/**
 * Extract updated date
 */
function extractUpdatedDate(frontMatter: Record<string, any>, createdDate: string): string | undefined {
  const updateFields = ['updated', 'updated_at', 'modified', 'lastmod'];
  
  for (const field of updateFields) {
    if (frontMatter[field]) {
      const date = new Date(frontMatter[field]);
      if (!isNaN(date.getTime()) && date.toISOString() !== createdDate) {
        return date.toISOString();
      }
    }
  }

  return undefined;
}

/**
 * Extract tags from front matter
 */
function extractTags(frontMatter: Record<string, any>): string[] {
  const tagFields = ['tags', 'categories', 'keywords'];
  
  for (const field of tagFields) {
    const value = frontMatter[field];
    if (value) {
      if (Array.isArray(value)) {
        return value
          .map(tag => String(tag).trim())
          .filter(tag => tag.length > 0);
      } else if (typeof value === 'string') {
        // Handle comma-separated tags
        return value
          .split(/[,;]/)
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }
    }
  }

  return [];
}

/**
 * Validate post data before import
 */
export function validatePost(post: ParsedPost): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!post.content || post.content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (!post.slug || post.slug.length < 3) {
    errors.push('Slug must be at least 3 characters');
  }

  // Validate slug format
  if (!/^[a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff-]+$/i.test(post.slug)) {
    errors.push('Slug contains invalid characters');
  }

  // Check content length limits
  if (post.content.length > 100000) {
    errors.push('Content exceeds maximum length (100,000 characters)');
  }

  // Validate title for articles
  if (post.type === 'article' && (!post.title || post.title.trim().length === 0)) {
    errors.push('Articles require a title');
  }

  if (post.title && post.title.length > 200) {
    errors.push('Title exceeds maximum length (200 characters)');
  }

  // Validate tags
  if (post.tags.length > 20) {
    errors.push('Too many tags (maximum 20)');
  }

  for (const tag of post.tags) {
    if (tag.length > 50) {
      errors.push(`Tag "${tag}" exceeds maximum length (50 characters)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize and normalize post data
 */
export function normalizePost(post: ParsedPost): ParsedPost {
  return {
    ...post,
    title: post.title?.trim().substring(0, 200) || undefined,
    content: post.content.trim(),
    excerpt: post.excerpt?.trim().substring(0, 500) || undefined,
    slug: post.slug.toLowerCase().trim(),
    tags: post.tags
      .map(tag => tag.trim().substring(0, 50))
      .filter(tag => tag.length > 0)
      .slice(0, 20), // Limit to 20 tags
    created_at: post.created_at,
    updated_at: post.updated_at,
    originalPath: post.originalPath
  };
}