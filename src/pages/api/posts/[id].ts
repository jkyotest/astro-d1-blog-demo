// Posts API - GET /api/posts/[id], PUT /api/posts/[id], DELETE /api/posts/[id]

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { generateExcerpt, isValidSlug, generateSlug } from '../../../lib/utils';
import type { UpdatePostInput } from '../../../types/database';

interface UpdatePostRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  slug?: string;
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
  language?: 'auto' | 'chinese' | 'japanese' | 'english';
  tag_ids?: number[];
  tags?: string[]; // Support tag name arrays
}

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    const id = parseInt(params.id as string);
    if (isNaN(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid post ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const post = await repositories.posts.findById(id);
    
    if (!post) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Post not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get tag information
    const tags = await repositories.posts.getPostTags(id);
    
    return new Response(JSON.stringify({
      success: true,
      data: { ...post, tags }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`GET /api/posts/${params.id} error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch post'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
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

    const id = parseInt(params.id as string);
    if (isNaN(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid post ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as UpdatePostRequest;
    
    // Validate slug format (if provided)
    if (body.slug && !isValidSlug(body.slug)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid slug format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate status (if provided)
    if (body.status && !['draft', 'published'].includes(body.status)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Status must be either "draft" or "published"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    		// Auto-generate excerpt (if content is updated and it's an article)
    if (body.content && body.type === 'article' && !body.excerpt) {
      body.excerpt = generateExcerpt(body.content);
    }

    // Process tags: convert tag names to tag IDs
    let tagIds: number[] | undefined = undefined;
    if (body.tags && body.tags.length > 0) {
      tagIds = [];
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
    } else if (body.tag_ids !== undefined) {
      tagIds = body.tag_ids;
    }

    const updateInput: UpdatePostInput = {
      id,
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      slug: body.slug,
      type: body.type,
      status: body.status,
      language: body.language,
      tag_ids: tagIds
    };

    const updatedPost = await repositories.posts.update(updateInput);
    
    return new Response(JSON.stringify({
      success: true,
      data: updatedPost
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`PUT /api/posts/${params.id} error:`, error);
    
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
      error: 'Failed to update post'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
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

    const id = parseInt(params.id as string);
    if (isNaN(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid post ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await repositories.posts.delete(id);
    
    if (!success) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Post not found or failed to delete'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Post deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`DELETE /api/posts/${params.id} error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete post'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};