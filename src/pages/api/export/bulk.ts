// Bulk Export API - POST /api/export/bulk (export multiple posts as ZIP)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { createZipFromPosts } from '../../../lib/zip-utils';

interface BulkExportRequest {
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
  format?: 'zip' | 'json';
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const body = await request.json() as BulkExportRequest;
    const { type, status, format = 'zip' } = body;
    
    // Get all posts matching criteria
    const result = await repositories.posts.findMany({
      type,
      status: status || undefined, // Show all if not specified
      limit: 1000 // Export up to 1000 posts
    });

    if (result.posts.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No posts found matching the criteria'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get posts with tags and normalize dates
    const postsWithTags = await Promise.all(
      result.posts.map(async (post) => {
        try {
          const tags = await repositories.posts.getPostTags(post.id);
          
          // Normalize dates to ensure they are valid ISO strings
          const normalizedPost = {
            ...post,
            tags,
            created_at: normalizeDate(post.created_at),
            updated_at: normalizeDate(post.updated_at),
            published_at: normalizeDate(post.published_at)
          };
          
          return normalizedPost;
        } catch (error) {
          console.error(`Error processing post ${post.id}:`, error);
          // Return post with basic error handling
          return {
            ...post,
            tags: [],
            created_at: normalizeDate(post.created_at),
            updated_at: normalizeDate(post.updated_at),
            published_at: normalizeDate(post.published_at)
          };
        }
      })
    );

    if (format === 'zip') {
      // Create ZIP file
      const zipBlob = await createZipFromPosts(postsWithTags);
      
      // Generate filename
      const dateStr = new Date().toISOString().slice(0, 10);
      const typeStr = type ? `-${type}s` : '';
      const statusStr = status ? `-${status}` : '';
      const filename = `blog-export${typeStr}${statusStr}-${dateStr}.zip`;
      
      return new Response(zipBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // JSON format
      const exportData = {
        export_date: new Date().toISOString(),
        export_info: {
          total_posts: result.posts.length,
          type_filter: type || 'all',
          status_filter: status || 'all',
          format: 'json'
        },
        posts: postsWithTags.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          slug: post.slug,
          type: post.type,
          status: post.status,
          language: post.language,
          created_at: post.created_at,
          updated_at: post.updated_at,
          published_at: post.published_at,
          tags: post.tags?.map(tag => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            description: tag.description
          })) || []
        }))
      };
      
      const dateStr = new Date().toISOString().slice(0, 10);
      const typeStr = type ? `-${type}s` : '';
      const statusStr = status ? `-${status}` : '';
      const filename = `blog-export${typeStr}${statusStr}-${dateStr}.json`;
      
      return new Response(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }
  } catch (error) {
    console.error('POST /api/export/bulk error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to export posts'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Normalize date to valid ISO string or null
 */
function normalizeDate(dateInput: any): string | null {
  if (!dateInput) return null;
  
  try {
    let parsedDate = null;
    
    if (typeof dateInput === 'string') {
      // Handle SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
      if (dateInput.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        parsedDate = new Date(dateInput + 'Z'); // Add Z for UTC
      }
      // Handle ISO format
      else if (dateInput.match(/^\d{4}-\d{2}-\d{2}T/)) {
        parsedDate = new Date(dateInput);
      }
      // Handle date-only format: "YYYY-MM-DD"
      else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        parsedDate = new Date(dateInput + 'T00:00:00Z');
      }
      // Try general parsing
      else {
        parsedDate = new Date(dateInput);
      }
    } else {
      // Assume it's already a Date object or timestamp
      parsedDate = new Date(dateInput);
    }
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    
    console.warn('Failed to normalize date:', dateInput);
    return null;
  } catch (error) {
    console.error('Error normalizing date:', dateInput, error);
    return null;
  }
}