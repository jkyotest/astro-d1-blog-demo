import { sqliteTable, text, integer, primaryKey, index, foreignKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Posts table
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title'),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  slug: text('slug').notNull().unique(),
  type: text('type', { enum: ['article', 'note'] }).default('article').notNull(),
  status: text('status', { enum: ['draft', 'published'] }).default('draft').notNull(),
  language: text('language', { enum: ['auto', 'chinese', 'japanese', 'english'] }).default('auto').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP').notNull(),
  published_at: text('published_at'),
}, (table) => [
  index('idx_posts_status').on(table.status),
  index('idx_posts_type').on(table.type),
  index('idx_posts_published_at').on(table.published_at),
  index('idx_posts_slug').on(table.slug),
]);

// Tags table
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_tags_slug').on(table.slug),
]);

// Post-tags association table
export const postTags = sqliteTable('post_tags', {
  post_id: integer('post_id').notNull(),
  tag_id: integer('tag_id').notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  primaryKey({ columns: [table.post_id, table.tag_id] }),
  index('idx_post_tags_post_id').on(table.post_id),
  index('idx_post_tags_tag_id').on(table.tag_id),
  foreignKey({
    columns: [table.post_id],
    foreignColumns: [posts.id],
    name: 'post_tags_post_id_fk'
  }).onDelete('cascade'),
  foreignKey({
    columns: [table.tag_id],
    foreignColumns: [tags.id],
    name: 'post_tags_tag_id_fk'
  }).onDelete('cascade'),
]);

// Relations
export const postsRelations = relations(posts, ({ many }) => ({
  postTags: many(postTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.post_id],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tag_id],
    references: [tags.id],
  }),
}));

// Site configuration table (simplified)
export const siteConfig = sqliteTable('site_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  site_title: text('site_title').default('My Blog').notNull(),
  site_subtitle: text('site_subtitle'),
  author_name: text('author_name').default('Author').notNull(),
  meta_description: text('meta_description'),
  social_links: text('social_links', { mode: 'json' }), // JSON array of social links
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').default('CURRENT_TIMESTAMP').notNull(),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP').notNull(),
}, (table) => [
  index('idx_site_config_active').on(table.is_active),
]);

// Type exports
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type PostTag = typeof postTags.$inferSelect;
export type NewPostTag = typeof postTags.$inferInsert;
export type SiteConfig = typeof siteConfig.$inferSelect;
export type NewSiteConfig = typeof siteConfig.$inferInsert;
