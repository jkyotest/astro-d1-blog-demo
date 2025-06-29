import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, desc, like, sql, count, asc } from 'drizzle-orm';
import { posts, tags, postTags } from '../db/schema';
import { generateSlug, generateNoteSlug, generateExcerpt, type SupportedLanguage } from './utils';
import type { 
  PostWithTags, 
  CreatePostInput, 
  UpdatePostInput, 
  PostQueryParams,
  Tag
} from '../types/database';

// Repository interfaces for better type safety
export interface PostRepository {
  findMany(params: PostQueryParams): Promise<{ posts: PostWithTags[]; total: number }>;
  findById(id: number): Promise<PostWithTags | null>;
  findBySlug(slug: string): Promise<PostWithTags | null>;
  create(input: CreatePostInput): Promise<PostWithTags>;
  update(id: number, input: UpdatePostInput): Promise<PostWithTags>;
  delete(id: number): Promise<void>;
}

export interface TagRepository {
  findMany(params?: { search?: string }): Promise<Tag[]>;
  findAll(): Promise<Tag[]>;
  findById(id: number): Promise<Tag | null>;
  findBySlug(slug: string): Promise<Tag | null>;
  create(input: { name: string; slug: string; description?: string }): Promise<Tag>;
  update(id: number, input: { name?: string; slug?: string; description?: string }): Promise<Tag>;
  delete(id: number): Promise<void>;
}

export interface Repositories {
  posts: PostRepository;
  tags: TagRepository;
}

// Create repositories with database instance
export function createRepositories(db: D1Database): Repositories {
  const d1 = drizzle(db);

  const postRepository: PostRepository = {
    async findMany(params: PostQueryParams) {
      const { page = 1, limit = 10, type, status, tag, search } = params;
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions = [];
      if (type) conditions.push(eq(posts.type, type));
      if (status) conditions.push(eq(posts.status, status));
      if (search) {
        conditions.push(
          or(
            like(posts.title, `%${search}%`),
            like(posts.content, `%${search}%`)
          )
        );
      }

      // Handle tag filtering
      if (tag) {
        const tagSubquery = sql`
          SELECT post_id FROM ${postTags} 
          WHERE tag_id IN (SELECT id FROM ${tags} WHERE slug = ${tag})
        `;
        conditions.push(sql`${posts.id} IN (${tagSubquery})`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const totalResult = await d1.select({ count: count() }).from(posts).where(whereClause);
      const total = totalResult[0]?.count || 0;

      // Get posts with tags
      const postsResult = await d1
        .select()
        .from(posts)
        .where(whereClause)
        .orderBy(desc(posts.created_at))
        .limit(limit)
        .offset(offset);

      // Get tags for each post
      const postsWithTags: PostWithTags[] = await Promise.all(
        postsResult.map(async (post) => {
          const postTagsResult = await d1
            .select({
              id: tags.id,
              name: tags.name,
              slug: tags.slug,
              description: tags.description,
              created_at: tags.created_at
            })
            .from(tags)
            .innerJoin(postTags, eq(tags.id, postTags.tag_id))
            .where(eq(postTags.post_id, post.id));

          return {
            ...post,
            tags: postTagsResult
          };
        })
      );

      return { posts: postsWithTags, total };
    },

    async findById(id: number) {
      const post = await d1.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!post[0]) return null;

      const postTagsResult = await d1
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
          created_at: tags.created_at
        })
        .from(tags)
        .innerJoin(postTags, eq(tags.id, postTags.tag_id))
        .where(eq(postTags.post_id, id));

      return {
        ...post[0],
        tags: postTagsResult
      };
    },

    async findBySlug(slug: string) {
      const post = await d1.select().from(posts).where(eq(posts.slug, slug)).limit(1);
      if (!post[0]) return null;

      const postTagsResult = await d1
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          description: tags.description,
          created_at: tags.created_at
        })
        .from(tags)
        .innerJoin(postTags, eq(tags.id, postTags.tag_id))
        .where(eq(postTags.post_id, post[0].id));

      return {
        ...post[0],
        tags: postTagsResult
      };
    },

    async create(input: CreatePostInput) {
      // Handle slug generation
      let slug = input.slug;
      if (!slug) {
        if (input.type === 'note') {
          // Notes use timestamp-based slugs
          slug = generateNoteSlug();
        } else if (input.title) {
          // Articles use title-based slugs with Chinese/Japanese support
          slug = generateSlug(input.title, input.language as SupportedLanguage);
        } else {
          // Fallback for articles without titles
          slug = generateSlug(input.content.substring(0, 50), input.language as SupportedLanguage);
        }
      }

      // Generate excerpt for articles
      let excerpt = input.excerpt;
      if (!excerpt && input.type === 'article' && input.content) {
        excerpt = generateExcerpt(input.content);
      }

      // Set published_at based on status
      let publishedAt: string | null = null;
      if (input.status === 'published') {
        publishedAt = new Date().toISOString();
      } else if (input.status === 'draft') {
        publishedAt = null;
      }

      // Insert post
      const [newPost] = await d1.insert(posts).values({
        title: input.title,
        content: input.content,
        excerpt,
        slug,
        type: input.type || 'article',
        status: input.status,
        published_at: publishedAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).returning();

      // Handle tags
      if (input.tag_ids && input.tag_ids.length > 0) {
        const tagValues = input.tag_ids.map((tagId: number) => ({
          post_id: newPost.id,
          tag_id: tagId
        }));
        await d1.insert(postTags).values(tagValues);
      }

      // Return post with tags
      return this.findById(newPost.id) as Promise<PostWithTags>;
    },

    async update(id: number, input: UpdatePostInput) {
      // Handle slug generation if title changed
      let slug = input.slug;
      if (!slug && input.title) {
        if (input.type === 'note') {
          slug = generateNoteSlug();
        } else {
          slug = generateSlug(input.title, input.language as SupportedLanguage);
        }
      }

      // Generate excerpt if content changed
      let excerpt = input.excerpt;
      if (!excerpt && input.content && input.type === 'article') {
        excerpt = generateExcerpt(input.content);
      }

      // Handle published_at
      let publishedAt: string | null = null;
      if (input.status === 'published') {
        publishedAt = new Date().toISOString();
      } else if (input.status === 'draft') {
        publishedAt = null;
      }

      // Update post
      const [updatedPost] = await d1.update(posts)
        .set({
          title: input.title,
          content: input.content,
          excerpt,
          slug,
          type: input.type,
          status: input.status,
          published_at: publishedAt,
          updated_at: new Date().toISOString()
        })
        .where(eq(posts.id, id))
        .returning();

      // Handle tag updates
      if (input.tag_ids !== undefined) {
        // Remove existing tags
        await d1.delete(postTags).where(eq(postTags.post_id, id));
        
        // Add new tags
        if (input.tag_ids.length > 0) {
          const tagValues = input.tag_ids.map((tagId: number) => ({
            post_id: id,
            tag_id: tagId
          }));
          await d1.insert(postTags).values(tagValues);
        }
      }

      // Return updated post with tags
      return this.findById(id) as Promise<PostWithTags>;
    },

    async delete(id: number) {
      // Delete post tags first
      await d1.delete(postTags).where(eq(postTags.post_id, id));
      // Delete post
      await d1.delete(posts).where(eq(posts.id, id));
    }
  };

  const tagRepository: TagRepository = {
    async findMany(params: { search?: string } = {}) {
      const { search } = params;
      
      if (search) {
        return d1.select().from(tags).where(like(tags.name, `%${search}%`)).orderBy(asc(tags.name));
      }
      
      return d1.select().from(tags).orderBy(asc(tags.name));
    },

    async findAll() {
      return d1.select().from(tags).orderBy(asc(tags.name));
    },

    async findById(id: number) {
      const result = await d1.select().from(tags).where(eq(tags.id, id)).limit(1);
      return result[0] || null;
    },

    async findBySlug(slug: string) {
      const result = await d1.select().from(tags).where(eq(tags.slug, slug)).limit(1);
      return result[0] || null;
    },

    async create(input: { name: string; slug: string; description?: string }) {
      const [newTag] = await d1.insert(tags).values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        created_at: new Date().toISOString()
      }).returning();
      return newTag;
    },

    async update(id: number, input: { name?: string; slug?: string; description?: string }) {
      const [updatedTag] = await d1.update(tags)
        .set(input)
        .where(eq(tags.id, id))
        .returning();
      return updatedTag;
    },

    async delete(id: number) {
      // Delete post tags first
      await d1.delete(postTags).where(eq(postTags.tag_id, id));
      // Delete tag
      await d1.delete(tags).where(eq(tags.id, id));
    }
  };

  return {
    posts: postRepository,
    tags: tagRepository
  };
} 