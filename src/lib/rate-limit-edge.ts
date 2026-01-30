// ============================================
// EDGE-COMPATIBLE RATE LIMITER (IN-MEMORY)
// For use in middleware and Edge Runtime
// ============================================

// Different limits for different endpoints
export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  forgotPassword: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  resendVerification: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  resetPassword: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  verifyEmail: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
} as const;

// Configuration from environment variables
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

// In-memory store
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if an identifier (IP or email) is rate limited (SYNCHRONOUS)
 * Edge Runtime compatible - uses in-memory storage
 * 
 * @param identifier - IP address or email
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @param maxRequests - Maximum requests allowed (default: 5)
 */
export function checkRateLimit(
  identifier: string,
  windowMs: number = DEFAULT_WINDOW_MS,
  maxRequests: number = DEFAULT_MAX_ATTEMPTS
): {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
  isLimited?: boolean;
  remainingAttempts?: number;
  resetTime?: number;
} {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous attempts
  if (!entry) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
      retryAfterMs: 0,
      isLimited: false,
      remainingAttempts: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
      retryAfterMs: 0,
      isLimited: false,
      remainingAttempts: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Within window - check count
  const newCount = entry.count + 1;
  const remaining = Math.max(0, maxRequests - newCount);
  const retryAfterMs = entry.firstAttempt + windowMs - now;

  if (newCount > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.firstAttempt + windowMs),
      retryAfterMs,
      isLimited: true,
      remainingAttempts: 0,
      resetTime: entry.firstAttempt + windowMs,
    };
  }

  // Update count
  rateLimitStore.set(key, { count: newCount, firstAttempt: entry.firstAttempt });

  return {
    allowed: true,
    remaining,
    resetAt: new Date(entry.firstAttempt + windowMs),
    retryAfterMs: 0,
    isLimited: false,
    remainingAttempts: remaining,
    resetTime: entry.firstAttempt + windowMs,
  };
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier.toLowerCase());
}

/**
 * Cleanup expired entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstAttempt > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}
