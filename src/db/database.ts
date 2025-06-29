import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, desc, like, sql, count } from 'drizzle-orm';
import { posts, tags, postTags, type Post, type Tag, type NewPost, type NewTag } from './schema';
import { generateSlug, generateNoteSlug, generateExcerpt, type SupportedLanguage } from '../lib/utils';
import type { 
  PostWithTags, 
  CreatePostInput, 
  UpdatePostInput, 
  CreateTagInput, 
  PostQueryParams, 
  BlogStats 
} from '../types/database';

export class PostRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  // Create post
  async create(input: CreatePostInput): Promise<Post> {
    const now = new Date().toISOString();
    const published_at = input.status === 'published' ? now : null;

    // Handle slug generation
    let slug = input.slug;
    if (!slug) {
      if (input.type === 'note') {
        // Notes use timestamp-based slugs
        slug = generateNoteSlug(new Date(now));
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

    const postData: NewPost = {
      title: input.title || null,
      content: input.content,
      excerpt: excerpt || null,
      slug,
      type: input.type || 'article',
      status: input.status,
      language: input.language || 'auto',
      created_at: now,
      updated_at: now,
      published_at,
    };

    const [newPost] = await this.db.insert(posts).values(postData).returning();

    // Associate tags
    if (input.tag_ids && input.tag_ids.length > 0) {
      await this.addTagsToPost(newPost.id, input.tag_ids);
    }

    return newPost;
  }

  // Find post by ID
  async findById(id: number): Promise<Post | null> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id));
    return post || null;
  }

  // Find post by slug with tags
  async findBySlug(slug: string): Promise<PostWithTags | null> {
    const [post] = await this.db.select().from(posts).where(eq(posts.slug, slug));
    if (!post) return null;

    const postTagsData = await this.getPostTags(post.id);
    return { ...post, tags: postTagsData };
  }

  // Find posts list with pagination and filtering
  async findMany(params: PostQueryParams = {}): Promise<{ posts: PostWithTags[], total: number }> {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status = 'published', 
      tag, 
      search 
    } = params;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(posts.status, status));
    }
    
    if (type) {
      conditions.push(eq(posts.type, type));
    }
    
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
      // For tag filtering, use subquery approach
      const tagFilteredPostIds = this.db
        .select({ post_id: postTags.post_id })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tag_id, tags.id))
        .where(eq(tags.slug, tag));

      const whereCondition = conditions.length > 0 
        ? and(sql`${posts.id} IN ${tagFilteredPostIds}`, and(...conditions))
        : sql`${posts.id} IN ${tagFilteredPostIds}`;

      // Get total count
      const totalResult = await this.db
        .select({ count: count() })
        .from(posts)
        .where(whereCondition);
      const total = totalResult[0].count;

      // Get posts
      const postsData = await this.db
        .select()
        .from(posts)
        .where(whereCondition)
        .orderBy(desc(posts.published_at), desc(posts.created_at))
        .limit(limit)
        .offset(offset);

      // Get tags for each post
      const postsWithTags = await Promise.all(
        postsData.map(async (post) => {
          const postTagsData = await this.getPostTags(post.id);
          return { ...post, tags: postTagsData };
        })
      );

      return {
        posts: postsWithTags,
        total
      };
    } else {
      // No tag filtering
      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const totalResult = await this.db
        .select({ count: count() })
        .from(posts)
        .where(whereCondition);
      const total = totalResult[0].count;

      // Get posts
      const postsData = await this.db
        .select()
        .from(posts)
        .where(whereCondition)
        .orderBy(desc(posts.published_at), desc(posts.created_at))
        .limit(limit)
        .offset(offset);

      // Get tags for each post
      const postsWithTags = await Promise.all(
        postsData.map(async (post) => {
          const postTagsData = await this.getPostTags(post.id);
          return { ...post, tags: postTagsData };
        })
      );

      return {
        posts: postsWithTags,
        total
      };
    }
  }

  // Update post
  async update(input: UpdatePostInput): Promise<Post> {
    const { id, tag_ids, ...updateData } = input;
    const now = new Date().toISOString();
    
    const updateValues: Partial<NewPost> = {
      ...updateData,
      updated_at: now,
    };

    // If status becomes published, set publish time
    if (updateData.status === 'published') {
      updateValues.published_at = now;
    }

    const [updatedPost] = await this.db
      .update(posts)
      .set(updateValues)
      .where(eq(posts.id, id))
      .returning();

    // Update tags if provided
    if (tag_ids !== undefined) {
      await this.updatePostTags(id, tag_ids);
    }

    return updatedPost;
  }

  // Delete post
  async delete(id: number): Promise<boolean> {
    try {
      await this.db.delete(posts).where(eq(posts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  // Get post tags
  async getPostTags(postId: number): Promise<Tag[]> {
    const tagData = await this.db
      .select({ tag: tags })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tag_id, tags.id))
      .where(eq(postTags.post_id, postId))
      .orderBy(tags.name);

    return tagData.map(item => item.tag);
  }

  // Add tags to post
  async addTagsToPost(postId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;

    const now = new Date().toISOString();
    const tagData = tagIds.map(tagId => ({
      post_id: postId,
      tag_id: tagId,
      created_at: now,
    }));

    await this.db.insert(postTags).values(tagData);
  }

  // Update post tags
  async updatePostTags(postId: number, tagIds: number[]): Promise<void> {
    // Remove existing tags
    await this.db.delete(postTags).where(eq(postTags.post_id, postId));

    // Add new tags
    if (tagIds.length > 0) {
      await this.addTagsToPost(postId, tagIds);
    }
  }
}

export class TagRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  // Create tag
  async create(input: CreateTagInput): Promise<Tag> {
    const now = new Date().toISOString();
    const slug = input.slug || generateSlug(input.name);

    const tagData: NewTag = {
      name: input.name,
      slug,
      description: input.description || null,
      created_at: now,
    };

    const [newTag] = await this.db.insert(tags).values(tagData).returning();
    return newTag;
  }

  // Find tag by ID
  async findById(id: number): Promise<Tag | null> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, id));
    return tag || null;
  }

  // Find tag by slug
  async findBySlug(slug: string): Promise<Tag | null> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.slug, slug));
    return tag || null;
  }

  // Find all tags
  async findAll(): Promise<Tag[]> {
    return await this.db.select().from(tags).orderBy(tags.name);
  }

  // Find all tags with post count
  async findAllWithPostCount(): Promise<(Tag & { post_count: number })[]> {
    const result = await this.db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        description: tags.description,
        created_at: tags.created_at,
        post_count: count(postTags.post_id)
      })
      .from(tags)
      .leftJoin(postTags, eq(tags.id, postTags.tag_id))
      .groupBy(tags.id, tags.name, tags.slug, tags.description, tags.created_at)
      .orderBy(tags.name);

    return result;
  }

  // Update tag
  async update(id: number, input: Partial<CreateTagInput>): Promise<Tag> {
    const updateData: Partial<NewTag> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.slug !== undefined) {
      updateData.slug = input.slug;
    } else if (input.name !== undefined) {
      updateData.slug = generateSlug(input.name);
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    const [updatedTag] = await this.db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, id))
      .returning();

    return updatedTag;
  }

  // Delete tag
  async delete(id: number): Promise<boolean> {
    try {
      await this.db.delete(tags).where(eq(tags.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  }
}

export class StatsRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async getBlogStats(): Promise<BlogStats> {
    const [
      totalPostsResult,
      totalPublishedResult,
      totalDraftsResult,
      totalTagsResult,
      totalArticlesResult,
      totalNotesResult,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(posts),
      this.db.select({ count: count() }).from(posts).where(eq(posts.status, 'published')),
      this.db.select({ count: count() }).from(posts).where(eq(posts.status, 'draft')),
      this.db.select({ count: count() }).from(tags),
      this.db.select({ count: count() }).from(posts).where(eq(posts.type, 'article')),
      this.db.select({ count: count() }).from(posts).where(eq(posts.type, 'note')),
    ]);

    return {
      totalPosts: totalPostsResult[0].count,
      totalPublished: totalPublishedResult[0].count,
      totalDrafts: totalDraftsResult[0].count,
      totalTags: totalTagsResult[0].count,
      totalArticles: totalArticlesResult[0].count,
      totalNotes: totalNotesResult[0].count,
    };
  }
}

export function createRepositories(d1Database: D1Database) {
  const db = drizzle(d1Database);
  
  return {
    posts: new PostRepository(db),
    tags: new TagRepository(db),
    stats: new StatsRepository(db),
  };
}

// Re-export types for convenience
export type { 
  PostWithTags, 
  CreatePostInput, 
  UpdatePostInput, 
  CreateTagInput, 
  PostQueryParams, 
  BlogStats 
} from '../types/database'; 