/**
 * Safely parse JSON string with error handling
 */
export function safeJsonParse<T = any>(input: any): T | null {
  // If already an array or object, return as-is
  if (Array.isArray(input) || (typeof input === 'object' && input !== null)) {
    return input as T;
  }
  
  // If null, undefined, or empty string
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', {
      input: input,
      error: error instanceof Error ? error.message : error
    });
    return null;
  }
}

/**
 * Safely stringify object to JSON
 */
export function safeJsonStringify(obj: any): string | null {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('Failed to stringify object:', {
      input: obj,
      error: error instanceof Error ? error.message : error
    });
    return null;
  }
}