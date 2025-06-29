// Authentication API - POST /api/auth/login

export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyAdminPassword, generateRandomString } from '../../../lib/utils';

// Simple in-memory storage (production should use more secure approach)
const activeSessions = new Map<string, { expires: number }>();

// Clean up expired sessions
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expires < now) {
      activeSessions.delete(token);
    }
  }
}

interface LoginRequest {
  password: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { env } = locals.runtime;
    const body = await request.json() as LoginRequest;
    
    if (!body.password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const isValid = verifyAdminPassword(body.password, env.ADMIN_PASSWORD);
    
    if (!isValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up expired sessions
    cleanupExpiredSessions();
    
    // Generate access token
    const token = generateRandomString(32);
    const expires = Date.now() + (24 * 60 * 60 * 1000); // Expires in 24 hours
    
    activeSessions.set(token, { expires });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        token,
        expires: new Date(expires).toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Authentication failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper function to verify tokens
export function verifyToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const session = activeSessions.get(token);
  
  if (!session) {
    return false;
  }
  
  if (session.expires < Date.now()) {
    activeSessions.delete(token);
    return false;
  }
  
  return true;
}