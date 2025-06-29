// Tags API - GET /api/tags (list) and POST /api/tags (create)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { generateSlug, isValidSlug } from '../../../lib/utils';
import type { CreateTagInput } from '../../../types/database';

interface CreateTagRequest {
  name: string;
  slug?: string;
  description?: string;
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    const tags = await repositories.tags.findAllWithPostCount();
    
    return new Response(JSON.stringify({
      success: true,
      data: tags
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch tags'
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

    const body = await request.json() as CreateTagRequest;
    
    // Validate required fields
    if (!body.name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tag name is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle slug generation
    let slug = body.slug;
    if (!slug) {
      slug = generateSlug(body.name);
    }

    // Validate slug format
    if (!isValidSlug(slug)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid slug format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tagInput: CreateTagInput = {
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || undefined
    };

    const tag = await repositories.tags.create(tagInput);
    
    return new Response(JSON.stringify({
      success: true,
      data: tag
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('POST /api/tags error:', error);
    
    // Handle duplicate name or slug errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tag name or slug already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create tag'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
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

    const body = await request.json() as { name: string };
    
    if (!body.name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tag name is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find tag by name
    const existingTags = await repositories.tags.findAll();
    const tagToDelete = existingTags.find(tag => tag.name === body.name);
    
    if (!tagToDelete) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Tag not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await repositories.tags.delete(tagToDelete.id);
    
    if (success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Tag deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to delete tag'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('DELETE /api/tags error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete tag'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};