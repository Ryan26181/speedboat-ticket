/**
 * Input Sanitization Library
 * 
 * Provides comprehensive input sanitization to prevent:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - NoSQL Injection
 * - Command Injection
 * - Path Traversal
 * 
 * All user input should be sanitized before:
 * - Storing in database
 * - Rendering in HTML
 * - Using in queries
 * - Processing in commands
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// Dangerous patterns for detection
const DANGEROUS_PATTERNS = {
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|DECLARE)\b)/gi,
    /(--|#|\/\*|\*\/|;)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+|\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /('\s*(OR|AND)\s*')/gi,
  ],
  noSqlInjection: [
    /(\$where|\$gt|\$lt|\$ne|\$eq|\$regex|\$or|\$and|\$not|\$nor|\$in|\$nin)/gi,
    /(\{\s*["']?\$)/g,
  ],
  xss: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:\s*text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
  ],
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\+/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
  ],
  commandInjection: [
    /[;&|`$(){}[\]]/g,
    /\$\(/g,
    /`.*`/g,
  ],
};

// ============================================
// CORE SANITIZATION FUNCTIONS
// ============================================

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Strip all HTML tags from string
 */
export function stripHtmlTags(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Sanitize string for safe database storage
 * Removes null bytes and controls characters
 */
export function sanitizeForDb(str: string): string {
  if (!str) return '';
  return str
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim();
}

/**
 * Sanitize string for use in URLs
 */
export function sanitizeForUrl(str: string): string {
  if (!str) return '';
  return encodeURIComponent(str.trim());
}

/**
 * Sanitize file path to prevent traversal
 */
export function sanitizeFilePath(path: string): string {
  if (!path) return '';
  return path
    .replace(/\.\./g, '')
    .replace(/\/\//g, '/')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();
}

// ============================================
// TYPE-SPECIFIC SANITIZERS
// ============================================

/**
 * Sanitize name (person name, business name, etc.)
 */
export function sanitizeName(name: string): string {
  if (!name) return '';
  return stripHtmlTags(name)
    .replace(/[<>'"`;\\]/g, '') // Remove dangerous chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>'"`;\\{}()[\]]/g, '') // Remove dangerous chars
    .substring(0, 254); // Max email length per RFC
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';
  return phone
    .replace(/[^\d+\-\s()]/g, '') // Keep only digits and phone chars
    .trim()
    .substring(0, 20);
}

/**
 * Sanitize ID number (KTP, Passport, etc.)
 */
export function sanitizeIdNumber(idNumber: string): string {
  if (!idNumber) return '';
  return idNumber
    .replace(/[^a-zA-Z0-9\-\s]/g, '') // Alphanumeric, hyphen, space only
    .toUpperCase()
    .trim()
    .substring(0, 30);
}

/**
 * Sanitize UUID
 */
export function sanitizeUuid(uuid: string): string | null {
  if (!uuid) return null;
  const cleaned = uuid.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return uuidRegex.test(cleaned) ? cleaned : null;
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return stripHtmlTags(query)
    .replace(/[<>'"`;\\{}()[\]$]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

/**
 * Sanitize integer
 */
export function sanitizeInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = parseInt(String(value), 10);
  return Number.isNaN(num) ? null : num;
}

/**
 * Sanitize positive integer
 */
export function sanitizePositiveInt(value: unknown): number | null {
  const num = sanitizeInt(value);
  return num !== null && num > 0 ? num : null;
}

/**
 * Sanitize decimal/float
 */
export function sanitizeDecimal(value: unknown, decimals = 2): number | null {
  if (value === null || value === undefined) return null;
  const num = parseFloat(String(value));
  return Number.isNaN(num) ? null : parseFloat(num.toFixed(decimals));
}

/**
 * Sanitize boolean
 */
export function sanitizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return Boolean(value);
}

/**
 * Sanitize date string
 */
export function sanitizeDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ============================================
// INJECTION DETECTION
// ============================================

/**
 * Check if string contains potential SQL injection
 */
export function detectSqlInjection(str: string): boolean {
  if (!str) return false;
  return DANGEROUS_PATTERNS.sqlInjection.some(pattern => pattern.test(str));
}

/**
 * Check if string contains potential NoSQL injection
 */
export function detectNoSqlInjection(str: string): boolean {
  if (!str) return false;
  return DANGEROUS_PATTERNS.noSqlInjection.some(pattern => pattern.test(str));
}

/**
 * Check if string contains potential XSS
 */
export function detectXss(str: string): boolean {
  if (!str) return false;
  return DANGEROUS_PATTERNS.xss.some(pattern => pattern.test(str));
}

/**
 * Check if string contains path traversal attempt
 */
export function detectPathTraversal(str: string): boolean {
  if (!str) return false;
  return DANGEROUS_PATTERNS.pathTraversal.some(pattern => pattern.test(str));
}

/**
 * Comprehensive injection detection
 */
export function detectInjection(str: string): {
  detected: boolean;
  types: string[];
} {
  if (!str) return { detected: false, types: [] };

  const types: string[] = [];

  if (detectSqlInjection(str)) types.push('sql');
  if (detectNoSqlInjection(str)) types.push('nosql');
  if (detectXss(str)) types.push('xss');
  if (detectPathTraversal(str)) types.push('path');

  return {
    detected: types.length > 0,
    types,
  };
}

// ============================================
// OBJECT SANITIZATION
// ============================================

/**
 * Recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    stripHtml?: boolean;
    maxDepth?: number;
    maxStringLength?: number;
  } = {}
): T {
  const {
    stripHtml = true,
    maxDepth = 10,
    maxStringLength = 10000,
  } = options;

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return value;

    if (typeof value === 'string') {
      let result = sanitizeForDb(value);
      if (stripHtml) {
        result = stripHtmlTags(result);
      }
      if (result.length > maxStringLength) {
        result = result.substring(0, maxStringLength);
      }
      return result;
    }

    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item, depth + 1));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[sanitizeForDb(key)] = sanitizeValue(val, depth + 1);
      }
      return sanitized;
    }

    return value;
  }

  return sanitizeValue(obj, 0) as T;
}

// ============================================
// REQUEST SANITIZATION
// ============================================

/**
 * Sanitize request body for API endpoints
 */
export function sanitizeRequestBody<T extends Record<string, unknown>>(
  body: T
): T {
  // Check for injection attempts
  const bodyStr = JSON.stringify(body);
  const injection = detectInjection(bodyStr);
  
  if (injection.detected) {
    throw new Error(`Potential ${injection.types.join(', ')} injection detected`);
  }

  return sanitizeObject(body);
}

/**
 * Create a sanitized copy of params object
 */
export function sanitizeParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  const sanitized: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      sanitized[key] = undefined;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => sanitizeSearchQuery(v));
    } else {
      sanitized[key] = sanitizeSearchQuery(value);
    }
  }

  return sanitized;
}
