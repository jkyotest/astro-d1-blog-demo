import { describe, it, expect } from 'vitest';
import type { Post, Tag, CreatePostInput, CreateTagInput, PostQueryParams } from '../../src/types/database.js';

describe('Database Types and Interfaces', () => {
  describe('Post Type', () => {
    it('should validate Post interface structure', () => {
      const post: Post = {
        id: 1,
        title: 'Test Post',
        content: 'This is test content',
        excerpt: 'Test excerpt',
        slug: 'test-post',
        type: 'article',
        status: 'published',
        language: 'auto',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        published_at: '2023-01-01T00:00:00Z'
      };

      expect(post.id).toBe(1);
      expect(post.type).toBeOneOf(['article', 'note']);
      expect(post.status).toBeOneOf(['draft', 'published']);
      expect(post.slug).toBe('test-post');
    });

    it('should handle optional fields in Post', () => {
      const minimalPost: Post = {
        id: 1,
        title: null,
        content: 'Minimal content',
        excerpt: null,
        slug: 'minimal-post',
        type: 'note',
        status: 'draft',
        language: 'auto',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        published_at: null
      };

      expect(minimalPost.title).toBeNull();
      expect(minimalPost.excerpt).toBeNull();
      expect(minimalPost.published_at).toBeNull();
    });
  });

  describe('Tag Type', () => {
    it('should validate Tag interface structure', () => {
      const tag: Tag = {
        id: 1,
        name: 'JavaScript',
        slug: 'javascript',
        description: 'JavaScript programming language',
        created_at: '2023-01-01T00:00:00Z'
      };

      expect(tag.id).toBe(1);
      expect(tag.name).toBe('JavaScript');
      expect(tag.slug).toBe('javascript');
      expect(tag.description).toBe('JavaScript programming language');
    });

    it('should handle optional description in Tag', () => {
      const minimalTag: Tag = {
        id: 1,
        name: 'TypeScript',
        slug: 'typescript',
        description: null,
        created_at: '2023-01-01T00:00:00Z'
      };

      expect(minimalTag.description).toBeNull();
    });
  });

  describe('Input Types', () => {
    it('should validate CreatePostInput', () => {
      const input: CreatePostInput = {
        title: 'New Post',
        content: 'Post content',
        excerpt: 'Post excerpt',
        slug: 'new-post',
        type: 'article',
        status: 'draft',
        tag_ids: [1, 2, 3]
      };

      expect(input.type).toBeOneOf(['article', 'note']);
      expect(input.status).toBeOneOf(['draft', 'published', undefined]);
      expect(input.tag_ids).toBeInstanceOf(Array);
    });

    it('should validate CreateTagInput', () => {
      const input: CreateTagInput = {
        name: 'React',
        slug: 'react',
        description: 'React library'
      };

      expect(input.name).toBe('React');
      expect(input.slug).toBe('react');
      expect(input.description).toBe('React library');
    });

    it('should handle minimal CreatePostInput', () => {
      const minimalInput: CreatePostInput = {
        content: 'Just content',
        slug: 'just-content',
        type: 'note'
      };

      expect(minimalInput.content).toBe('Just content');
      expect(minimalInput.title).toBeUndefined();
      expect(minimalInput.status).toBeUndefined();
    });
  });

  describe('Query Parameters', () => {
    it('should validate PostQueryParams', () => {
      const params: PostQueryParams = {
        page: 2,
        limit: 20,
        type: 'article',
        status: 'published',
        tag: 'javascript',
        search: 'react hooks'
      };

      expect(params.page).toBe(2);
      expect(params.limit).toBe(20);
      expect(params.type).toBeOneOf(['article', 'note', undefined]);
      expect(params.status).toBeOneOf(['draft', 'published', undefined]);
    });

    it('should handle empty query parameters', () => {
      const params: PostQueryParams = {};

      expect(params.page).toBeUndefined();
      expect(params.limit).toBeUndefined();
      expect(params.type).toBeUndefined();
    });
  });

  describe('Type Guards and Validation', () => {
    it('should validate post types', () => {
      const validTypes = ['article', 'note'];
      const invalidTypes = ['medium', 'video', ''];

      validTypes.forEach(type => {
        expect(['article', 'note']).toContain(type);
      });

      invalidTypes.forEach(type => {
        expect(['article', 'note']).not.toContain(type);
      });
    });

    it('should validate post statuses', () => {
      const validStatuses = ['draft', 'published'];
      const invalidStatuses = ['pending', 'archived', ''];

      validStatuses.forEach(status => {
        expect(['draft', 'published']).toContain(status);
      });

      invalidStatuses.forEach(status => {
        expect(['draft', 'published']).not.toContain(status);
      });
    });
  });
});