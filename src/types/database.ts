// Database types for the blog system

export interface Post {
  id: number;
  title: string | null; // Can be null for notes
  content: string;
  excerpt: string | null; // Summary for articles
  slug: string;
  type: 'article' | 'note';
  status: 'draft' | 'published';
  language: 'auto' | 'chinese' | 'japanese' | 'english';
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface PostTag {
  post_id: number;
  tag_id: number;
  created_at: string;
}

// Extended Post type with tag information
export interface PostWithTags extends Post {
  tags: Tag[];
}

// Input types for creating and updating
export interface CreatePostInput {
  title?: string;
  content: string;
  excerpt?: string;
  slug?: string;
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
  language?: 'auto' | 'chinese' | 'japanese' | 'english';
  tag_ids?: number[];
}

export interface UpdatePostInput {
  id: number;
  title?: string;
  content?: string;
  excerpt?: string;
  slug?: string;
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
  language?: 'auto' | 'chinese' | 'japanese' | 'english';
  tag_ids?: number[];
}

export interface CreateTagInput {
  name: string;
  slug?: string;
  description?: string;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// Query parameters
export interface PostQueryParams extends PaginationParams {
  type?: 'article' | 'note';
  status?: 'draft' | 'published';
  tag?: string; // tag slug
  search?: string; // Search keywords
}

// Statistics information
export interface BlogStats {
  totalPosts: number;
  totalPublished: number;
  totalDrafts: number;
  totalTags: number;
  totalArticles: number;
  totalNotes: number;
}

// Site configuration types
export interface SocialLink {
  platform: string; // e.g., 'twitter', 'github', 'linkedin', 'instagram', 'youtube', 'email'
  url: string;
  icon?: string; // Custom icon URL or icon name
  display_text?: string; // Optional display text
}

export interface SiteConfig {
  id: number;
  site_title: string;
  site_subtitle: string | null;
  author_name: string;
  meta_description: string | null;
  social_links: SocialLink[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSiteConfigInput {
  site_title?: string;
  site_subtitle?: string;
  author_name?: string;
  meta_description?: string;
  social_links?: SocialLink[];
}

export interface UpdateSiteConfigInput extends CreateSiteConfigInput {
  id: number;
}

// Predefined social platforms with their icons
export const SOCIAL_PLATFORMS = {
  twitter: { name: 'Twitter', icon: 'fa-twitter', color: '#1DA1F2' },
  github: { name: 'GitHub', icon: 'fa-github', color: '#333' },
  linkedin: { name: 'LinkedIn', icon: 'fa-linkedin', color: '#0077B5' },
  instagram: { name: 'Instagram', icon: 'fa-instagram', color: '#E4405F' },
  youtube: { name: 'YouTube', icon: 'fa-youtube', color: '#FF0000' },
  facebook: { name: 'Facebook', icon: 'fa-facebook', color: '#1877F2' },
  telegram: { name: 'Telegram', icon: 'fa-telegram', color: '#0088cc' },
  wechat: { name: 'WeChat', icon: 'fa-weixin', color: '#07C160' },
  weibo: { name: 'Weibo', icon: 'fa-weibo', color: '#E6162D' },
  email: { name: 'Email', icon: 'fa-envelope', color: '#D44638' },
  rss: { name: 'RSS', icon: 'fa-rss', color: '#FFA500' },
  custom: { name: 'Custom', icon: 'fa-link', color: '#666' }
} as const;

// Cloudflare D1 database binding types
export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  ADMIN_PASSWORD?: string;
}