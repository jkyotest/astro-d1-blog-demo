import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '../../src/pages/api/auth/login.ts';

// Mock environment
const createMockEnv = () => ({
  ADMIN_PASSWORD: 'test-password',
  DB: null
});

const createMockLocals = (env = createMockEnv()) => ({
  runtime: { env }
});

const createMockRequest = (options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
} = {}) => {
  const { method = 'POST', body, headers = {} } = options;
  
  return {
    json: async () => body,
    headers: {
      get: (name: string) => headers[name] || null
    }
  } as any;
};

describe('Authentication API - Real Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should reject empty password', async () => {
      const request = createMockRequest({
        body: {}
      });
      const locals = createMockLocals();

      const response = await POST({ request, locals } as any);
      const result = await response.json() as { success: boolean; error?: string; data?: any };

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject wrong password', async () => {
      const request = createMockRequest({
        body: { password: 'wrong-password' }
      });
      const locals = createMockLocals();

      const response = await POST({ request, locals } as any);
      const result = await response.json() as { success: boolean; error?: string; data?: any };

      expect(response.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });

    it('should accept correct password', async () => {
      const request = createMockRequest({
        body: { password: 'test-password' }
      });
      const locals = createMockLocals();

      const response = await POST({ request, locals } as any);
      const result = await response.json() as { success: boolean; error?: string; data?: any };

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.token).toBeDefined();
      expect(result.data.expires).toBeDefined();
      expect(typeof result.data.token).toBe('string');
      expect(result.data.token.length).toBeGreaterThan(10);
    });

    it('should handle missing environment password (fallback to default)', async () => {
      const request = createMockRequest({
        body: { password: 'admin123' } // Default development password
      });
      const locals = createMockLocals({
        ADMIN_PASSWORD: undefined as any,
        DB: null
      });

      const response = await POST({ request, locals } as any);
      const result = await response.json() as { success: boolean; error?: string; data?: any };

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should handle server errors gracefully', async () => {
      const request = createMockRequest({
        body: { password: 'test-password' }
      });
      
      // Create malformed locals to trigger error
      const locals = {
        runtime: {
          env: null
        }
      };

      const response = await POST({ request, locals } as any);
      const result = await response.json() as { success: boolean; error?: string; data?: any };

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });
});