// Export API - GET /api/export/[id] (export post as markdown)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { toMarkdown } from '../../../lib/utils';

interface ExportRequest {
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
}

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    const id = parseInt(params.id as string);
    if (isNaN(id)) {
      return new Response('Invalid post ID', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const post = await repositories.posts.findBySlug(''); // Need to use findById then get tags
    const postData = await repositories.posts.findById(id);
    
    if (!postData) {
      return new Response('Post not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Get tag information
    const tags = await repositories.posts.getPostTags(id);
    const postWithTags = { ...postData, tags };
    
    // Convert to Markdown
    const markdownContent = toMarkdown(postWithTags);
    
    // Generate filename
    const filename = postWithTags.slug + '.md';
    
    return new Response(markdownContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error(`GET /api/export/${params.id} error:`, error);
    return new Response('Failed to export post', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

// Batch export all posts
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

    const body = await request.json() as ExportRequest;
    const { type, status = 'published' } = body;
    
    // Get all posts matching criteria
    const result = await repositories.posts.findMany({
      type,
      status,
      limit: 1000 // Export up to 1000 posts
    });

    if (result.posts.length === 0) {
      return new Response('No posts found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Create JSON for compressed content (simplified version, could use JSZip in practice)
    const exportData = {
      export_date: new Date().toISOString(),
      total_posts: result.posts.length,
      posts: result.posts.map(post => ({
        filename: `${post.slug}.md`,
        content: toMarkdown(post)
      }))
    };
    
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="blog-export-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('POST /api/export error:', error);
    return new Response('Failed to export posts', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};