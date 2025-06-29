import rss from "@astrojs/rss";
import { createRepositories } from "../db/database.ts";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts.ts";

export async function GET(context) {
  // Note: In SSR mode, we need to handle the case where runtime might not be available
  let posts = [];
  
  try {
    if (context.locals?.runtime?.env?.DB) {
      const repositories = createRepositories(context.locals.runtime.env.DB);
      const result = await repositories.posts.findMany({
        status: 'published',
        limit: 50, // Limit to recent 50 posts
      });
      posts = result.posts;
    }
  } catch (error) {
    console.error('Error fetching posts for RSS:', error);
    posts = [];
  }

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.title || 'Untitled',
      description: post.excerpt || post.content.substring(0, 160) + '...',
      pubDate: new Date(post.published_at || post.created_at),
      link: `/articles/${post.slug}/`,
      categories: post.tags?.map(tag => tag.name) || [],
    })),
  });
}
