import { z } from 'zod';
import {
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeIdNumber,
  sanitizeSearchQuery,
  escapeHtml,
  stripHtmlTags,
  detectInjection,
} from './sanitize';

/**
 * Zod Sanitization Integration
 * 
 * Provides sanitized Zod schemas that automatically clean input
 * while validating. Use these instead of raw z.string() for
 * user input fields.
 * 
 * Benefits:
 * - Validation and sanitization in one step
 * - Consistent sanitization across the codebase
 * - Type-safe sanitized output
 */

// ============================================
// SANITIZED STRING TYPES
// ============================================

/**
 * Sanitized name field (person name, business name)
 */
export const zSanitizedName = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .transform(sanitizeName)
  .refine(val => val.length > 0, 'Name is required');

/**
 * Sanitized email field
 */
export const zSanitizedEmail = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(254, 'Email is too long')
  .transform(sanitizeEmail);

/**
 * Sanitized phone number field
 */
export const zSanitizedPhone = z
  .string()
  .trim()
  .min(8, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .transform(sanitizePhone)
  .refine(val => /^[\d+\-\s()]+$/.test(val), 'Invalid phone number format');

/**
 * Sanitized ID number (KTP, Passport)
 */
export const zSanitizedIdNumber = z
  .string()
  .trim()
  .min(6, 'ID number is too short')
  .max(30, 'ID number is too long')
  .transform(sanitizeIdNumber)
  .refine(val => /^[A-Z0-9\-\s]+$/.test(val), 'Invalid ID number format');

/**
 * Sanitized search query
 */
export const zSanitizedSearch = z
  .string()
  .trim()
  .max(100, 'Search query is too long')
  .transform(sanitizeSearchQuery);

/**
 * Sanitized text field (with HTML stripped)
 */
export const zSanitizedText = z
  .string()
  .trim()
  .transform(stripHtmlTags);

/**
 * Sanitized text field (with HTML escaped)
 */
export const zEscapedText = z
  .string()
  .trim()
  .transform(escapeHtml);

// ============================================
// INJECTION-CHECKED TYPES
// ============================================

/**
 * String that rejects potential injection attempts
 */
export const zSecureString = z
  .string()
  .trim()
  .refine(
    (val: string) => !detectInjection(val).detected,
    { message: 'Potentially dangerous input detected' }
  );

/**
 * Secure name with injection checking
 */
export const zSecureName = zSecureString
  .pipe(zSanitizedName);

/**
 * Secure text with injection checking
 */
export const zSecureText = zSecureString
  .pipe(zSanitizedText);

// ============================================
// UUID VALIDATION
// ============================================

/**
 * Sanitized UUID field
 */
export const zSanitizedUuid = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    val => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(val),
    'Invalid UUID format'
  );

// ============================================
// NUMERIC TYPES
// ============================================

/**
 * Positive integer (for IDs, counts, etc.)
 */
export const zPositiveInt = z
  .number()
  .int('Must be an integer')
  .positive('Must be positive');

/**
 * Non-negative integer
 */
export const zNonNegativeInt = z
  .number()
  .int('Must be an integer')
  .nonnegative('Must be non-negative');

/**
 * Positive decimal (for prices, etc.)
 */
export const zPositiveDecimal = z
  .number()
  .positive('Must be positive')
  .refine(
    val => Number.isFinite(val),
    'Must be a valid number'
  );

/**
 * String to positive integer transform
 */
export const zStringToPositiveInt = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Must be a positive integer')
  .transform(val => parseInt(val, 10))
  .pipe(zPositiveInt);

// ============================================
// DATE TYPES
// ============================================

/**
 * Sanitized date string (ISO format)
 */
export const zSanitizedDateString = z
  .string()
  .trim()
  .datetime({ message: 'Invalid date format' });

/**
 * String to Date transform
 */
export const zStringToDate = z
  .string()
  .trim()
  .transform(val => new Date(val))
  .refine(
    date => !isNaN(date.getTime()),
    'Invalid date'
  );

/**
 * Future date validation
 */
export const zFutureDate = zStringToDate.refine(
  date => date.getTime() > Date.now(),
  'Date must be in the future'
);

// ============================================
// COMMON FIELD SCHEMAS
// ============================================

/**
 * Indonesian KTP number (16 digits)
 */
export const zKtpNumber = z
  .string()
  .trim()
  .regex(/^\d{16}$/, 'KTP must be 16 digits')
  .transform(val => val.replace(/\s/g, ''));

/**
 * Indonesian passport number
 */
export const zPassportNumber = z
  .string()
  .trim()
  .toUpperCase()
  .min(6, 'Passport number is too short')
  .max(20, 'Passport number is too long')
  .regex(/^[A-Z0-9]+$/, 'Invalid passport number format');

/**
 * Indonesian phone number
 */
export const zIndonesianPhone = z
  .string()
  .trim()
  .transform(val => {
    // Remove all non-digits except leading +
    let cleaned = val.replace(/[^\d+]/g, '');
    
    // Convert common formats to +62
    if (cleaned.startsWith('0')) {
      cleaned = '+62' + cleaned.substring(1);
    } else if (cleaned.startsWith('62') && !cleaned.startsWith('+62')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  })
  .refine(
    val => /^\+62\d{9,12}$/.test(val),
    'Invalid Indonesian phone number'
  );

/**
 * Price in IDR (no decimals)
 */
export const zPriceIdr = z
  .number()
  .int('Price must be a whole number')
  .nonnegative('Price cannot be negative')
  .max(1_000_000_000, 'Price exceeds maximum');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a length-limited sanitized string schema
 */
export function createSanitizedString(
  options: {
    min?: number;
    max?: number;
    stripHtml?: boolean;
    escapeHtml?: boolean;
    rejectInjection?: boolean;
  } = {}
) {
  const {
    min,
    max = 1000,
    stripHtml = true,
    escapeHtml: escape = false,
    rejectInjection = false,
  } = options;

  let schema = z.string().trim();

  if (min !== undefined) {
    schema = schema.min(min);
  }
  schema = schema.max(max);

  if (rejectInjection) {
    schema = schema.refine(
      val => !detectInjection(val).detected,
      'Potentially dangerous input detected'
    ) as z.ZodString;
  }

  if (stripHtml) {
    return schema.transform(stripHtmlTags);
  }
  if (escape) {
    return schema.transform(escapeHtml);
  }

  return schema;
}

/**
 * Create an optional sanitized string schema
 */
export function optionalSanitizedString(
  options: Parameters<typeof createSanitizedString>[0] = {}
) {
  return createSanitizedString(options).optional().nullable();
}

// ============================================
// PAGINATION SCHEMAS
// ============================================

/**
 * Standard pagination parameters
 */
export const zPaginationParams = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Search with pagination
 */
export const zSearchParams = zPaginationParams.extend({
  q: zSanitizedSearch.optional(),
});
