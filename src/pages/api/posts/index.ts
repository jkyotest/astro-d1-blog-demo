// Posts API - GET /api/posts (list) and POST /api/posts (create)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { generateSlug, generateNoteSlug, generateExcerpt, isValidSlug, isValidTimestampSlug } from '../../../lib/utils';
import type { CreatePostInput, PostQueryParams } from '../../../types/database';

interface CreatePostRequest {
  title?: string;
  content: string;
  excerpt?: string;
  slug?: string;
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
  language?: 'auto' | 'chinese' | 'japanese' | 'english';
  tag_ids?: number[];
  tags?: string[]; // Support tag name arrays
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const params: PostQueryParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '10'), 50), // Maximum 50 records
      type: searchParams.get('type') as 'article' | 'note' | undefined,
      status: (() => {
        const statusParam = searchParams.get('status');
        if (!searchParams.has('status')) return 'published'; // Default
        if (statusParam === '' || statusParam === 'all') return undefined; // Show all
        return statusParam as 'draft' | 'published';
      })(),
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined
    };

    const result = await repositories.posts.findMany(params);
    
    return new Response(JSON.stringify({
      success: true,
      data: result.posts,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit!),
        hasNext: params.page! < Math.ceil(result.total / params.limit!),
        hasPrev: params.page! > 1
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('GET /api/posts error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch posts'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    // Check authentication (simple version, can be improved later)
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

    const body = await request.json() as CreatePostRequest;
    
    // Validate required fields
    if (!body.content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Content is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!body.status) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Status is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['draft', 'published'].includes(body.status)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Status must be either "draft" or "published"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle slug generation
    let slug = body.slug;
    if (!slug) {
      if (body.type === 'note') {
        // Notes use timestamp-based slugs
        slug = generateNoteSlug();
      } else if (body.title) {
        // Articles use title-based slugs with Chinese/Japanese support
        slug = generateSlug(body.title, body.language);
      } else {
        // Fallback for articles without titles
        slug = generateSlug(body.content.substring(0, 50), body.language);
      }
    }

    // Validate slug format
    const isValidFormat = body.type === 'note' 
      ? isValidTimestampSlug(slug!) || isValidSlug(slug!) // Allow both formats for notes
      : isValidSlug(slug!);
      
    if (!isValidFormat) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid slug format for ${body.type || 'article'}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    		// Generate excerpt (articles only)
    let excerpt = body.excerpt;
    if (!excerpt && body.type === 'article' && body.content) {
      excerpt = generateExcerpt(body.content);
    }

    // Handle tags: convert tag names to tag IDs
    let tagIds: number[] = [];
    if (body.tags && body.tags.length > 0) {
      // Handle tag name arrays, create non-existent tags and get all tag IDs
      for (const tagName of body.tags) {
        if (!tagName.trim()) continue;
        
        // First try to find existing tag by name
        let existingTag = null;
        try {
          const tagResult = await repositories.tags.findAll();
          existingTag = tagResult.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
        } catch (error) {
          console.error('Error finding existing tags:', error);
        }

        if (existingTag) {
          tagIds.push(existingTag.id);
        } else {
          // Create new tag
          try {
            const newTag = await repositories.tags.create({
              name: tagName.trim(),
              slug: generateSlug(tagName.trim()),
              description: undefined
            });
            tagIds.push(newTag.id);
          } catch (error) {
            console.error('Error creating new tag:', error);
            // If creation fails (e.g., slug duplicate), try to find again
            try {
              const tagResult = await repositories.tags.findAll();
              const foundTag = tagResult.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
              if (foundTag) {
                tagIds.push(foundTag.id);
              }
            } catch (findError) {
              console.error('Error finding tag after creation failed:', findError);
            }
          }
        }
      }
    } else if (body.tag_ids) {
      tagIds = body.tag_ids;
    }

    const postInput: CreatePostInput = {
      title: body.title || undefined,
      content: body.content,
      excerpt: excerpt || undefined,
      slug,
      type: body.type || 'article',
      status: body.status || 'draft',
      language: body.language || 'auto',
      tag_ids: tagIds
    };

    const post = await repositories.posts.create(postInput);
    
    return new Response(JSON.stringify({
      success: true,
      data: post
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('POST /api/posts error:', error);
    
    // Handle duplicate slug errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Slug already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create post'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};