import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';
import { siteConfig } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { SiteConfig, CreateSiteConfigInput } from '../../../types/database';
import { safeJsonParse } from '../../../lib/json-utils';

// GET /api/site-config - Get site configuration
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const { env } = locals.runtime;
    const db = drizzle(env.DB);
    
    // Get active site configuration
    const config = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.is_active, true))
      .limit(1);

    if (config.length === 0) {
      // Return default configuration instead of error
      const defaultConfig = {
        id: 0,
        site_title: 'My Personal Blog',
        site_subtitle: 'Sharing thoughts and experiences',
        author_name: 'Blog Author',
        author_bio: 'Welcome to my blog!',
        author_email: '',
        author_avatar: '',
        social_links: [],
        custom_links: [],
        footer_text: 'Made with ❤️ using Astro',
        meta_description: '',
        meta_keywords: '',
        analytics_code: '',
        custom_css: '',
        custom_js: '',
        favicon_url: '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return new Response(JSON.stringify({
        success: true,
        data: defaultConfig
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse JSON fields
    const configData = config[0];
    const parsedConfig: SiteConfig = {
      ...configData,
      social_links: safeJsonParse(configData.social_links as string),
    };

    return new Response(JSON.stringify({
      success: true,
      data: parsedConfig
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to get site config:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get site configuration'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/site-config - Update site configuration (requires admin permission)
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    console.log('PUT /api/site-config called');
    
    // Check authentication (consistent with other APIs)
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authentication failed - no valid Bearer token');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data: CreateSiteConfigInput = await request.json();
    console.log('Received data:', data);
    const { env } = locals.runtime;
    const db = drizzle(env.DB);

    // Prepare update data
    const updateData = {
      ...data,
      social_links: data.social_links ? JSON.stringify(data.social_links) : null,
      updated_at: new Date().toISOString(),
    };
    console.log('Update data prepared:', updateData);

    // Get current active configuration
    console.log('Checking for existing config...');
    const currentConfig = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.is_active, true))
      .limit(1);
    console.log('Current config found:', currentConfig.length > 0);

    let result;
    if (currentConfig.length > 0) {
      // Update existing configuration
      console.log('Updating existing config with ID:', currentConfig[0].id);
      result = await db
        .update(siteConfig)
        .set(updateData)
        .where(eq(siteConfig.id, currentConfig[0].id))
        .returning();
      console.log('Update result:', result);
    } else {
      // Create new configuration
      console.log('Creating new config...');
      result = await db
        .insert(siteConfig)
        .values({
          ...updateData,
          is_active: true,
        })
        .returning();
      console.log('Insert result:', result);
    }

    // Parse JSON fields
    const updatedConfig = result[0];
    const parsedConfig: SiteConfig = {
      ...updatedConfig,
      social_links: safeJsonParse(updatedConfig.social_links as string),
    };

    return new Response(JSON.stringify({
      success: true,
      data: parsedConfig
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to update site config:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(JSON.stringify({
      success: false,
      error: `Failed to update site configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 