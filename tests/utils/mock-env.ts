// Mock environment and D1 database for testing

export interface MockD1Result {
  success: boolean;
  results: unknown[];
  meta: {
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export class MockD1Database {
  private data: Record<string, unknown[]> = {
    posts: [],
    tags: [],
    post_tags: []
  };

  prepare(query: string) {
    return {
      bind: (...args: unknown[]) => ({
        first: async () => {
          // Mock implementation for testing
          if (query.includes('SELECT * FROM posts WHERE id')) {
            return this.data.posts[0] || null;
          }
          if (query.includes('SELECT * FROM tags WHERE id')) {
            return this.data.tags[0] || null;
          }
          if (query.includes('COUNT(*) as total')) {
            return { total: 1 };
          }
          return null;
        },
        all: async (): Promise<MockD1Result> => ({
          success: true,
          results: this.data.tags || [],
          meta: { rows_read: 0 }
        }),
        run: async (): Promise<MockD1Result> => ({
          success: true,
          results: [],
          meta: { last_row_id: 1, rows_written: 1 }
        })
      })
    };
  }

  // Helper methods for tests
  setMockData(table: string, data: unknown[]) {
    this.data[table] = data;
  }

  getMockData(table: string) {
    return this.data[table];
  }
}

export function createMockEnv() {
  return {
    DB: new MockD1Database(),
    ADMIN_PASSWORD: 'test-password',
    ENVIRONMENT: 'test'
  };
}

export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
} = {}) {
  const {
    method = 'GET',
    url = 'https://example.com/api/test',
    body,
    headers = {}
  } = options;

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

export function createMockLocals(env = createMockEnv()) {
  return {
    runtime: {
      env
    }
  };
}