import { drizzle } from 'drizzle-orm/d1';
import { siteConfig } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { SiteConfig } from '../types/database';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { safeJsonParse } from './json-utils';

/**
 * Get site configuration from database with fallback to constants
 */
export async function getSiteConfig(DB: D1Database): Promise<SiteConfig | null> {
  try {
    const db = drizzle(DB);
    
    const configResult = await db
      .select()
      .from(siteConfig)
      .where(eq(siteConfig.is_active, true))
      .limit(1);
    
    if (configResult.length > 0) {
      const configData = configResult[0];
      
      // Parse social links JSON
      const parsedSocialLinks = safeJsonParse(configData.social_links);
      
      return {
        ...configData,
        social_links: parsedSocialLinks,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get site config:', error);
    return null;
  }
}

/**
 * Get simplified site configuration - no defaults, compact layout
 */
export async function getSiteConfigWithFallback(DB?: D1Database) {
  let config: SiteConfig | null = null;
  
  if (DB) {
    config = await getSiteConfig(DB);
  }
  
  // Only essential fallbacks for core functionality
  const title = config?.site_title || SITE_TITLE;
  const description = config?.meta_description || SITE_DESCRIPTION;
  
  return {
    // Core fields (always needed for basic functionality)
    title,
    description,
    brandName: title,
    heroTitle: config?.site_subtitle || title,
    
    // Optional fields (only include if they exist)
    ...(config?.author_name && { authorName: config.author_name }),
    ...(config?.social_links && config.social_links.length > 0 && { socialLinks: config.social_links }),
    
    config // Original configuration object
  };
}