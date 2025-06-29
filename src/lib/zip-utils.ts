import JSZip from 'jszip';
import { generateSlug } from './utils';

export interface ZipFileInfo {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
  relativePath: string;
}

export interface ParsedMarkdownFile {
  filename: string;
  content: string;
  frontMatter: Record<string, any>;
  body: string;
  relativePath: string;
  folderPath: string;
}

export interface ZipParseResult {
  markdownFiles: ParsedMarkdownFile[];
  totalFiles: number;
  totalEntries: number;
}

/**
 * Parse ZIP file and extract markdown files
 */
export async function parseZipFile(file: File): Promise<ZipParseResult> {
  try {
    console.log('Starting ZIP file parsing:', file.name, file.size, 'bytes');
    
    const zip = new JSZip();
    
    // Convert File to ArrayBuffer for better compatibility
    const arrayBuffer = await file.arrayBuffer();
    console.log('Converted to ArrayBuffer:', arrayBuffer.byteLength, 'bytes');
    
    const zipContent = await zip.loadAsync(arrayBuffer);
    
    // Count total entries
    const totalEntries = Object.keys(zipContent.files).length;
    console.log('ZIP loaded successfully, total entries:', totalEntries);
    
    const markdownFiles: ParsedMarkdownFile[] = [];

  // Process each file in the ZIP
  for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
    // Skip directories, system files, and non-markdown files
    if (zipEntry.dir || shouldIgnoreFile(relativePath) || !isMarkdownFile(relativePath)) {
      continue;
    }

    try {
      const content = await zipEntry.async('text');
      const { frontMatter, body } = parseMarkdownFrontMatter(content);
      
      // Extract folder path for slug generation
      const folderPath = extractFolderPath(relativePath);
      
      markdownFiles.push({
        filename: zipEntry.name.split('/').pop() || '',
        content,
        frontMatter,
        body,
        relativePath,
        folderPath
      });
    } catch (error) {
      console.error(`Error parsing file ${relativePath}:`, error);
    }
  }

  console.log('Successfully parsed', markdownFiles.length, 'markdown files');
  return {
    markdownFiles,
    totalFiles: markdownFiles.length, // Only count actual found markdown files
    totalEntries
  };
  
  } catch (error) {
    console.error('Error parsing ZIP file:', error);
    throw new Error(`Failed to parse ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create ZIP file from posts
 */
export async function createZipFromPosts(posts: any[]): Promise<Blob> {
  const zip = new JSZip();

  for (const post of posts) {
    try {
      const content = generateMarkdownContent(post);
      const filename = `${post.slug || generateSlug(post.title || 'untitled')}.md`;
      
      // Organize by type and date with safe date handling
      let dateStr = 'unknown';
      if (post.created_at) {
        // Handle different date formats
        let parsedDate = null;
        
        // Try different parsing strategies
        if (typeof post.created_at === 'string') {
          // Handle SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
          if (post.created_at.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
            parsedDate = new Date(post.created_at + 'Z'); // Add Z for UTC
          }
          // Handle ISO format
          else if (post.created_at.match(/^\d{4}-\d{2}-\d{2}T/)) {
            parsedDate = new Date(post.created_at);
          }
          // Handle date-only format: "YYYY-MM-DD"
          else if (post.created_at.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parsedDate = new Date(post.created_at + 'T00:00:00Z');
          }
          // Try general parsing
          else {
            parsedDate = new Date(post.created_at);
          }
        } else {
          // Assume it's already a Date object or timestamp
          parsedDate = new Date(post.created_at);
        }
        
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          dateStr = parsedDate.toISOString().slice(0, 7); // YYYY-MM
        } else {
          // Fallback: use current date
          dateStr = new Date().toISOString().slice(0, 7);
        }
      } else {
        // Fallback: use current date
        dateStr = new Date().toISOString().slice(0, 7);
      }
      
      const folder = post.type === 'article' ? 'articles' : 'notes';
      const fullPath = `${folder}/${dateStr}/${filename}`;
      
      zip.file(fullPath, content);
    } catch (error) {
      console.error(`Error processing post ${post.slug || post.id}:`, error);
      // Continue with other posts even if one fails
      const fallbackContent = generateFallbackMarkdownContent(post);
      const fallbackFilename = `${post.slug || `post-${post.id}` || 'untitled'}.md`;
      const fallbackPath = `${post.type === 'article' ? 'articles' : 'notes'}/unknown/${fallbackFilename}`;
      zip.file(fallbackPath, fallbackContent);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generate markdown content with front matter
 */
function generateMarkdownContent(post: any): string {
  // Safe date handling
  const createdDate = safeDateString(post.created_at);
  const updatedDate = safeDateString(post.updated_at);
  
  const frontMatter: Record<string, any> = {
    title: post.title || undefined,
    type: post.type || 'article',
    date: createdDate,
    updated: updatedDate && updatedDate !== createdDate ? updatedDate : undefined,
    status: post.status || 'published',
    slug: post.slug,
  };

  // Add tags if available
  if (post.tags && post.tags.length > 0) {
    frontMatter.tags = post.tags.map((tag: any) => tag.name || tag);
  }

  // Add excerpt for articles
  if (post.type === 'article' && post.excerpt) {
    frontMatter.excerpt = post.excerpt;
  }

  // Add language if not auto
  if (post.language && post.language !== 'auto') {
    frontMatter.language = post.language;
  }

  // Build front matter YAML
  let yaml = '---\n';
  for (const [key, value] of Object.entries(frontMatter)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        yaml += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
      } else if (typeof value === 'string' && (value.includes(':') || value.includes('\n'))) {
        yaml += `${key}: "${value.replace(/"/g, '\\"')}"\n`;
      } else {
        yaml += `${key}: ${value}\n`;
      }
    }
  }
  yaml += '---\n\n';

  // Add content
  return yaml + (post.content || '');
}

/**
 * Parse front matter from markdown content
 */
function parseMarkdownFrontMatter(content: string): { frontMatter: Record<string, any>; body: string } {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return {
      frontMatter: {},
      body: content
    };
  }

  const [, yamlContent, body] = match;
  const frontMatter = parseYamlFrontMatter(yamlContent);

  return {
    frontMatter,
    body: body.trim()
  };
}

/**
 * Simple YAML parser for front matter (handles basic cases)
 */
function parseYamlFrontMatter(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    result[key] = parseYamlValue(value);
  }

  return result;
}

/**
 * Parse YAML value (basic types)
 */
function parseYamlValue(value: string): any {
  if (!value) return '';

  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Arrays
  if (value.startsWith('[') && value.endsWith(']')) {
    const arrayContent = value.slice(1, -1);
    return arrayContent
      .split(',')
      .map(item => item.trim())
      .map(item => {
        // Remove quotes from array items
        if ((item.startsWith('"') && item.endsWith('"')) || 
            (item.startsWith("'") && item.endsWith("'"))) {
          return item.slice(1, -1);
        }
        return item;
      })
      .filter(item => item.length > 0);
  }

  // Booleans
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // Dates (basic ISO format detection)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value; // Keep as string, will be processed later
  }

  return value;
}

/**
 * Check if file is a markdown file
 */
function isMarkdownFile(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return extension === 'md' || extension === 'markdown';
}

/**
 * Check if file should be ignored (system files, hidden files, etc.)
 */
function shouldIgnoreFile(filename: string): boolean {
  const name = filename.toLowerCase();
  
  // Ignore __MACOSX system files
  if (name.includes('__macosx')) {
    return true;
  }
  
  // Ignore .DS_Store and other hidden files
  if (name.includes('.ds_store') || name.includes('thumbs.db')) {
    return true;
  }
  
  // Ignore files starting with ._
  const baseName = filename.split('/').pop() || '';
  if (baseName.startsWith('._')) {
    return true;
  }
  
  return false;
}

/**
 * Extract folder path from file path
 */
function extractFolderPath(filePath: string): string {
  const parts = filePath.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}

/**
 * Extract date from filename or folder structure
 */
export function extractDateFromPath(filePath: string, frontMatterDate?: string): Date | null {
  // Priority: front matter date > filename date > folder date
  
  if (frontMatterDate) {
    const date = new Date(frontMatterDate);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Check filename for date patterns
  const filename = filePath.split('/').pop() || '';
  
  // Pattern: YYYY-MM-DD-title.md
  const filenameDateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  if (filenameDateMatch) {
    const date = new Date(filenameDateMatch[1]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Check folder structure for date
  const pathParts = filePath.split('/');
  for (const part of pathParts) {
    const folderDateMatch = part.match(/^(\d{4})-?(\d{2})?-?(\d{2})?$/);
    if (folderDateMatch) {
      const [, year, month = '01', day = '01'] = folderDateMatch;
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Validate ZIP file contents
 */
export async function validateZipFile(file: File): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check file size (max 100MB)
  if (file.size > 100 * 1024 * 1024) {
    errors.push('File size exceeds 100MB limit');
  }

  // Check file type
  if (!file.type.includes('zip') && !file.name.toLowerCase().endsWith('.zip')) {
    errors.push('File must be a ZIP archive');
  }

  try {
    const zip = new JSZip();
    // Convert File to ArrayBuffer for better compatibility
    const arrayBuffer = await file.arrayBuffer();
    const zipContent = await zip.loadAsync(arrayBuffer);
    
    // Check for at least one markdown file
    const hasMarkdownFiles = Object.keys(zipContent.files).some(path => 
      !zipContent.files[path].dir && isMarkdownFile(path)
    );

    if (!hasMarkdownFiles) {
      errors.push('ZIP file must contain at least one markdown file');
    }

    // Check for maximum number of files (1000)
    const fileCount = Object.keys(zipContent.files).filter(path => !zipContent.files[path].dir).length;
    if (fileCount > 1000) {
      errors.push('ZIP file contains too many files (max 1000)');
    }

  } catch (error) {
    errors.push('Invalid ZIP file or corrupted');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Safely convert date to ISO string
 */
function safeDateString(dateInput: any): string | undefined {
  if (!dateInput) return undefined;
  
  try {
    let parsedDate = null;
    
    if (typeof dateInput === 'string') {
      // Handle SQLite datetime format: "YYYY-MM-DD HH:MM:SS"
      if (dateInput.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        parsedDate = new Date(dateInput + 'Z'); // Add Z for UTC
      }
      // Handle ISO format
      else if (dateInput.match(/^\d{4}-\d{2}-\d{2}T/)) {
        parsedDate = new Date(dateInput);
      }
      // Handle date-only format: "YYYY-MM-DD"
      else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        parsedDate = new Date(dateInput + 'T00:00:00Z');
      }
      // Try general parsing
      else {
        parsedDate = new Date(dateInput);
      }
    } else {
      // Assume it's already a Date object or timestamp
      parsedDate = new Date(dateInput);
    }
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    
    return undefined;
  } catch (error) {
    console.error('Invalid date:', dateInput, error);
    return undefined;
  }
}

/**
 * Generate fallback markdown content when main generation fails
 */
function generateFallbackMarkdownContent(post: any): string {
  const title = post.title || 'Untitled Post';
  const content = post.content || 'No content available';
  const type = post.type || 'article';
  const status = post.status || 'published';
  const slug = post.slug || 'untitled';
  
  let yaml = '---\n';
  yaml += `title: "${title}"\n`;
  yaml += `type: ${type}\n`;
  yaml += `status: ${status}\n`;
  yaml += `slug: ${slug}\n`;
  yaml += `date: ${new Date().toISOString()}\n`;
  yaml += '---\n\n';
  
  return yaml + content;
}