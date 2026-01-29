// ============================================
// SIMPLE IN-MEMORY RATE LIMITER
// For production, use Redis-based solution
// ============================================

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

// In-memory store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration from environment variables
const DEFAULT_MAX_ATTEMPTS = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || "5");
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "900") * 1000;

// Different limits for different endpoints
export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  forgotPassword: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  resendVerification: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  resetPassword: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  verifyEmail: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
} as const;

/**
 * Check if an identifier (IP or email) is rate limited
 * 
 * @param identifier - IP address or email
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @param maxRequests - Maximum requests allowed (default: 5)
 * @returns Object with allowed status and retry information
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
  // Legacy compatibility
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
  const resetAt = new Date(entry.firstAttempt + windowMs);
  const retryAfterMs = entry.firstAttempt + windowMs - now;

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs,
      isLimited: true,
      remainingAttempts: 0,
      resetTime: entry.firstAttempt + windowMs,
    };
  }

  // Allow request and increment counter
  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);

  return {
    allowed: true,
    remaining,
    resetAt,
    retryAfterMs: 0,
    isLimited: false,
    remainingAttempts: remaining,
    resetTime: entry.firstAttempt + windowMs,
  };
}

/**
 * Record an attempt for rate limiting (standalone function)
 */
export function recordAttempt(identifier: string): void {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.firstAttempt > DEFAULT_WINDOW_MS) {
    // Start new window
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
  } else {
    // Increment existing window
    entry.count++;
  }
}

/**
 * Get rate limit identifier from request
 * Combines IP address with endpoint for unique identification
 */
export function getRateLimitIdentifier(
  request: Request,
  endpoint: string
): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] ?? realIp ?? "unknown";

  return `${endpoint}:${ip}`;
}

/**
 * Get rate limit identifier by email
 * Used for per-user rate limiting
 */
export function getRateLimitIdentifierByEmail(
  email: string,
  endpoint: string
): string {
  return `${endpoint}:email:${email.toLowerCase()}`;
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier.toLowerCase());
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstAttempt > DEFAULT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
