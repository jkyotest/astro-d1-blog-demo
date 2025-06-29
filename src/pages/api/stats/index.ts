// Stats API - GET /api/stats (blog statistics)

export const prerender = false;

import type { APIRoute } from 'astro';
import { createRepositories } from '../../../db/database';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const { env } = locals.runtime;
    const repositories = createRepositories(env.DB);
    
    const stats = await repositories.stats.getBlogStats();
    
    // Transform the data to match what the admin dashboard expects
    const transformedStats = {
      total_posts: stats.totalPosts,
      total_articles: stats.totalArticles,
      short_posts: stats.totalNotes, // Notes are considered short posts
      total_tags: stats.totalTags,
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: transformedStats
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch statistics'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};