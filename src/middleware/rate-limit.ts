/**
 * Rate Limiting Middleware
 * Provides route-specific rate limiting
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Route-specific rate limit configurations
export const ROUTE_RATE_LIMITS = {
  // Auth routes - stricter limits (10 req/min)
  "/api/auth/login": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/auth/register": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/auth/forgot-password": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/auth/reset-password": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/auth/verify-email": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/auth/resend-verification": { windowMs: 60 * 1000, maxRequests: 5 },
  
  // Payment routes - very strict limits (5 req/min)
  "/api/payments": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/payments/create": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/payments/cancel": { windowMs: 60 * 1000, maxRequests: 5 },
  
  // Booking routes
  "/api/bookings": { windowMs: 60 * 1000, maxRequests: 20 },
  
  // Search routes - more permissive
  "/api/schedules": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/routes": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/ports": { windowMs: 60 * 1000, maxRequests: 60 },
  
  // Admin routes
  "/api/admin": { windowMs: 60 * 1000, maxRequests: 100 },
  
  // Default for unspecified API routes
  default: { windowMs: 60 * 1000, maxRequests: 100 },
} as const;

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  
  // Cloudflare
  if (cfConnectingIP) return cfConnectingIP;
  
  // Proxy/Load balancer
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  
  // Direct
  if (realIP) return realIP;
  
  return "unknown";
}

/**
 * Get rate limit config for a route
 */
function getRateLimitConfig(pathname: string): { windowMs: number; maxRequests: number } {
  // Check exact match first
  if (pathname in ROUTE_RATE_LIMITS) {
    return ROUTE_RATE_LIMITS[pathname as keyof typeof ROUTE_RATE_LIMITS];
  }
  
  // Check prefix matches for auth routes (10 req/min)
  if (pathname.startsWith("/api/auth")) {
    return { windowMs: 60 * 1000, maxRequests: 10 };
  }
  
  // Check prefix matches for payment routes (5 req/min)
  if (pathname.startsWith("/api/payments")) {
    return { windowMs: 60 * 1000, maxRequests: 5 };
  }
  
  // Admin routes
  if (pathname.startsWith("/api/admin")) {
    return ROUTE_RATE_LIMITS["/api/admin"];
  }
  
  return ROUTE_RATE_LIMITS.default;
}

/**
 * Check rate limit
 */
function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number; resetAt: Date; retryAfterMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    // Create new window
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(resetAt),
      retryAfterMs: 0,
    };
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetAt),
      retryAfterMs: record.resetAt - now,
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: new Date(record.resetAt),
    retryAfterMs: 0,
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  
  // Skip rate limiting for certain paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return null;
  }
  
  // Only rate limit API routes
  if (!pathname.startsWith("/api")) {
    return null;
  }
  
  // Skip webhooks (they have their own verification)
  if (pathname.includes("/webhook") || pathname.includes("/notification")) {
    return null;
  }
  
  const ip = getClientIP(request);
  const config = getRateLimitConfig(pathname);
  
  // Create unique identifier combining IP and route prefix
  const routePrefix = pathname.split("/").slice(0, 4).join("/");
  const identifier = `${routePrefix}:${ip}`;
  
  const result = checkRateLimit(identifier, config.windowMs, config.maxRequests);
  
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil(result.retryAfterMs / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt.getTime()),
        },
      }
    );
  }
  
  return null;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  resetAt: Date
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(resetAt.getTime()));
  return response;
}
