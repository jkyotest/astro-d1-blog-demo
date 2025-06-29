// Utility functions for the blog system
import { pinyin } from 'pinyin';
import * as wanakana from 'wanakana';
import { franc } from 'franc';

// Supported languages for slug generation
export type SupportedLanguage = 'auto' | 'chinese' | 'japanese' | 'english';

// Convert Chinese characters to pinyin
function chineseToPinyin(text: string): string {
  try {
    return pinyin(text, {
      style: 'normal',
      heteronym: false,
      segment: false
    }).flat().join('-');
  } catch (error) {
    console.warn('Pinyin conversion failed:', error);
    return text;
  }
}

// Convert Japanese text to romaji using WanaKana
function japaneseToRomaji(text: string): string {
  try {
    return wanakana.toRomaji(text, { customKanaMapping: {}, IMEMode: false });
  } catch (error) {
    console.warn('Japanese romaji conversion failed:', error);
    return text;
  }
}

// Detect language using franc library
function detectLanguage(text: string): 'chinese' | 'japanese' | 'english' | 'unknown' {
  try {
    // Remove spaces and normalize text for better detection
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    
    if (normalizedText.length < 3) {
      return 'unknown';
    }
    
    const detected = franc(normalizedText);
    
    // Map franc language codes to our supported languages
    switch (detected) {
      case 'cmn': // Mandarin Chinese
      case 'zho': // Chinese
        return 'chinese';
      case 'jpn': // Japanese
        return 'japanese';
      case 'eng': // English
        return 'english';
      default:
        return 'unknown';
    }
  } catch (error) {
    console.warn('Language detection failed:', error);
    return 'unknown';
  }
}

// Character-based language detection (fallback)
function detectLanguageByCharacters(text: string): 'chinese' | 'japanese' | 'english' | 'mixed' {
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const japaneseKana = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || [];
  const englishChars = text.match(/[a-zA-Z]/g) || [];
  
  const totalChars = text.replace(/\s+/g, '').length;
  const chineseRatio = chineseChars.length / totalChars;
  const japaneseRatio = japaneseKana.length / totalChars;
  const englishRatio = englishChars.length / totalChars;
  
  // If Japanese kana detected, it's likely Japanese
  if (japaneseRatio > 0.1) {
    return 'japanese';
  }
  
  // If mostly Chinese characters without kana, it's likely Chinese
  if (chineseRatio > 0.5 && japaneseRatio === 0) {
    return 'chinese';
  }
  
  // If mostly English
  if (englishRatio > 0.7) {
    return 'english';
  }
  
  // Mixed or unclear
  return 'mixed';
}

// Enhanced language detection combining multiple approaches
export function detectContentLanguage(text: string, userLanguage?: SupportedLanguage): 'chinese' | 'japanese' | 'english' {
  // If user specified a language (not auto), use it
  if (userLanguage && userLanguage !== 'auto') {
    return userLanguage;
  }
  
  // First try automatic detection with franc
  const francDetection = detectLanguage(text);
  if (francDetection !== 'unknown') {
    return francDetection;
  }
  
  // Fallback to character-based detection
  const charDetection = detectLanguageByCharacters(text);
  if (charDetection === 'mixed') {
    // For mixed content, prefer Japanese if kana is present
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'japanese';
    }
    // Otherwise default to Chinese for CJK content
    if (/[\u4e00-\u9fff]/.test(text)) {
      return 'chinese';
    }
  }
  
  return charDetection === 'mixed' ? 'english' : charDetection;
}

// Generate URL-safe slug with language-aware conversion
export function generateSlug(text: string, language?: SupportedLanguage): string {
  const detectedLanguage = detectContentLanguage(text, language);
  let processedText = text;
  
  // Convert based on detected/specified language
  switch (detectedLanguage) {
    case 'chinese':
      // Convert Chinese characters to pinyin
      const chineseMatches = text.match(/[\u4e00-\u9fff]+/g) || [];
      for (const match of chineseMatches) {
        const pinyin = chineseToPinyin(match);
        processedText = processedText.replace(match, pinyin);
      }
      break;
      
    case 'japanese':
      // Convert Japanese kana and kanji to romaji
      const japaneseMatches = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]+/g) || [];
      for (const match of japaneseMatches) {
        const romaji = japaneseToRomaji(match);
        processedText = processedText.replace(match, romaji);
      }
      break;
      
    case 'english':
    default:
      // No conversion needed for English
      break;
  }
  
  return processedText
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Merge multiple hyphens into one
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

// Generate timestamp-based slug for notes (to seconds)
export function generateNoteSlug(timestamp?: Date): string {
  const date = timestamp || new Date();
  // Format: YYYYMMDD-HHMMSS (timestamp to seconds)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// Generate article excerpt
export function generateExcerpt(content: string, maxLength = 160): string {
  // Remove markdown syntax
  const plainText = content
    .replace(/!\[.*?\]\(.*?\)/g, '') // Images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[#*`_~]/g, '') // Markdown symbols
    .replace(/\n+/g, ' ') // Line breaks
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Truncate at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > maxLength * 0.8 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

// Validate if slug is valid (supports Chinese/Japanese characters)
export function isValidSlug(slug: string): boolean {
  // Updated regex to support Chinese (\u4e00-\u9fff), Hiragana (\u3040-\u309f), and Katakana (\u30a0-\u30ff)
  const slugRegex = /^[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ffa-z0-9]+(?:-[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ffa-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 100;
}

// Validate timestamp-based slug (for notes)
export function isValidTimestampSlug(slug: string): boolean {
  // Format: YYYYMMDD-HHMMSS
  const timestampRegex = /^\d{8}-\d{6}$/;
  return timestampRegex.test(slug);
}

// Format date
export function formatDate(dateString: string, locale = 'en-US'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Format relative time
export function formatRelativeTime(dateString: string, locale = 'en-US'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

// Pagination calculation
export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
}

// Simple authentication check
export function verifyAdminPassword(password: string, envPassword?: string): boolean {
  if (!envPassword) {
    // No admin password configured - this is a security error
    throw new Error('ADMIN_PASSWORD environment variable is not configured. Please set it using: npx wrangler secret put ADMIN_PASSWORD');
  }
  return password === envPassword;
}

// Generate random string
export function generateRandomString(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Convert to Markdown format
export function toMarkdown(post: import('../db/database').PostWithTags): string {
  const { title, content, tags, created_at, type } = post;
  
  let markdown = '';
  
  // Front matter
  markdown += '---\n';
  if (title) {
    markdown += `title: "${title}"\n`;
  }
  markdown += `type: ${type}\n`;
  markdown += `date: ${created_at}\n`;
  if (tags.length > 0) {
    markdown += `tags: [${tags.map(tag => `"${tag.name}"`).join(', ')}]\n`;
  }
  markdown += '---\n\n';
  
  // Content
  if (title && type === 'article') {
    markdown += `# ${title}\n\n`;
  }
  
  markdown += content;
  
  return markdown;
}

// Clean HTML tags (for search and display)
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}