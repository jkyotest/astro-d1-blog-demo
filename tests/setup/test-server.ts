// Real API test server setup
import { spawn, ChildProcess } from 'child_process';

let serverProcess: ChildProcess | null = null;
const TEST_PORT = 4333;
const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;

// Mock D1 database for testing
class MockD1Database {
  private posts = new Map<number, any>();
  private tags = new Map<number, any>();
  private postTags = new Map<string, any>();
  private nextPostId = 1;
  private nextTagId = 1;

  constructor() {
    // Initialize with some test data
    this.tags.set(1, { id: 1, name: 'JavaScript', slug: 'javascript', created_at: new Date().toISOString() });
    this.tags.set(2, { id: 2, name: 'TypeScript', slug: 'typescript', created_at: new Date().toISOString() });
    this.nextTagId = 3;
  }

  prepare(query: string) {
    return {
      bind: (...args: any[]) => ({
        first: async () => {
          if (query.includes('SELECT * FROM posts WHERE id')) {
            const id = args[0];
            return this.posts.get(id) || null;
          }
          if (query.includes('SELECT * FROM tags WHERE id')) {
            const id = args[0];
            return this.tags.get(id) || null;
          }
          if (query.includes('COUNT(*) as total')) {
            if (query.includes('posts')) {
              return { total: this.posts.size };
            }
            return { total: this.tags.size };
          }
          return null;
        },
        all: async () => {
          if (query.includes('SELECT * FROM tags ORDER BY name')) {
            return { 
              success: true, 
              results: Array.from(this.tags.values()).sort((a, b) => a.name.localeCompare(b.name))
            };
          }
          if (query.includes('SELECT t.* FROM tags t INNER JOIN post_tags')) {
            const postId = args[0];
            const postTagEntries = Array.from(this.postTags.entries())
              .filter(([key]) => key.startsWith(`${postId}-`))
              .map(([, value]) => value);
            
            const tagIds = postTagEntries.map(entry => entry.tag_id);
            const postTagsData = tagIds.map(tagId => this.tags.get(tagId)).filter(Boolean);
            
            return { success: true, results: postTagsData };
          }
          if (query.includes('SELECT') && query.includes('FROM posts')) {
            const results = Array.from(this.posts.values())
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { success: true, results };
          }
          return { success: true, results: [] };
        },
        run: async () => {
          if (query.includes('INSERT INTO posts')) {
            const post = {
              id: this.nextPostId++,
              title: args[0] || null,
              content: args[1],
              excerpt: args[2] || null,
              slug: args[3],
              type: args[4] || 'article',
              status: args[5] || 'draft',
              created_at: args[6],
              updated_at: args[7],
              published_at: args[8] || null
            };
            this.posts.set(post.id, post);
            return { success: true, meta: { last_row_id: post.id } };
          }
          
          if (query.includes('INSERT INTO tags')) {
            const tag = {
              id: this.nextTagId++,
              name: args[0],
              slug: args[1],
              description: args[2] || null,
              created_at: args[3]
            };
            this.tags.set(tag.id, tag);
            return { success: true, meta: { last_row_id: tag.id } };
          }

          if (query.includes('INSERT OR IGNORE INTO post_tags')) {
            const postId = args[0];
            const tagId = args[1];
            const createdAt = args[2];
            this.postTags.set(`${postId}-${tagId}`, { post_id: postId, tag_id: tagId, created_at: createdAt });
            return { success: true };
          }

          if (query.includes('UPDATE posts')) {
            // Simple update logic - would need to parse SET clause properly in real implementation
            return { success: true };
          }

          if (query.includes('DELETE FROM posts WHERE id')) {
            const id = args[args.length - 1]; // Last parameter is usually the ID
            const existed = this.posts.has(id);
            this.posts.delete(id);
            // Delete related post_tags
            for (const [key] of this.postTags.entries()) {
              if (key.startsWith(`${id}-`)) {
                this.postTags.delete(key);
              }
            }
            return { success: existed };
          }

          if (query.includes('DELETE FROM post_tags WHERE post_id')) {
            const postId = args[0];
            for (const [key] of this.postTags.entries()) {
              if (key.startsWith(`${postId}-`)) {
                this.postTags.delete(key);
              }
            }
            return { success: true };
          }

          return { success: true };
        }
      })
    };
  }

  // Helper method to get data for testing
  getData() {
    return {
      posts: Array.from(this.posts.values()),
      tags: Array.from(this.tags.values()),
      postTags: Array.from(this.postTags.entries())
    };
  }

  // Helper method to reset data
  reset() {
    this.posts.clear();
    this.tags.clear();
    this.postTags.clear();
    this.nextPostId = 1;
    this.nextTagId = 1;
    
    // Re-initialize default tags
    this.tags.set(1, { id: 1, name: 'JavaScript', slug: 'javascript', created_at: new Date().toISOString() });
    this.tags.set(2, { id: 2, name: 'TypeScript', slug: 'typescript', created_at: new Date().toISOString() });
    this.nextTagId = 3;
  }
}

export const mockDB = new MockD1Database();

export async function startTestServer(): Promise<string> {
  if (serverProcess) {
    return TEST_BASE_URL;
  }

  // Create test environment variables
  process.env.NODE_ENV = 'test';
  process.env.ADMIN_PASSWORD = 'test-password';

  return new Promise((resolve, reject) => {
    // Start Astro dev server on test port
    serverProcess = spawn('npm', ['run', 'dev', '--', '--port', TEST_PORT.toString()], {
      stdio: 'pipe',
      env: { ...process.env }
    });

    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 30000);

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Local') && output.includes(TEST_PORT.toString())) {
          clearTimeout(timeout);
          // Wait a bit more for server to be fully ready
          setTimeout(() => resolve(TEST_BASE_URL), 2000);
        }
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });
    }

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export async function stopTestServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
  }
}

export function getTestBaseUrl(): string {
  return TEST_BASE_URL;
}

export async function loginAsAdmin(baseUrl: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'test-password' })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const result = await response.json() as { success: boolean; error?: string; data?: { token: string } };
  if (!result.success) {
    throw new Error(`Login failed: ${result.error}`);
  }

  return result.data!.token;
}

export function createAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}