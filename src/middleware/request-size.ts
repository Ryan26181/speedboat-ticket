/**
 * Request Size Limiting Middleware
 * Prevents DoS attacks via large payloads
 */

import { NextRequest, NextResponse } from "next/server";

// Size limits in bytes
export const SIZE_LIMITS = {
  // Default limit for most API routes
  default: 100 * 1024, // 100KB
  
  // Specific route limits
  "/api/auth": 10 * 1024, // 10KB - auth payloads should be small
  "/api/bookings": 50 * 1024, // 50KB - booking with passengers
  "/api/payments": 20 * 1024, // 20KB - payment data
  "/api/admin": 500 * 1024, // 500KB - admin operations may need more
  "/api/upload": 5 * 1024 * 1024, // 5MB - file uploads
} as const;

/**
 * Get size limit for a route
 */
function getSizeLimit(pathname: string): number {
  for (const [route, limit] of Object.entries(SIZE_LIMITS)) {
    if (route !== "default" && pathname.startsWith(route)) {
      return limit;
    }
  }
  return SIZE_LIMITS.default;
}

/**
 * Request size limiting middleware
 */
export function requestSizeMiddleware(
  request: NextRequest
): NextResponse | null {
  // Only check POST, PUT, PATCH requests
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(method)) {
    return null;
  }
  
  const pathname = request.nextUrl.pathname;
  
  // Skip non-API routes
  if (!pathname.startsWith("/api")) {
    return null;
  }
  
  // Check Content-Length header
  const contentLength = request.headers.get("content-length");
  const sizeLimit = getSizeLimit(pathname);
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > sizeLimit) {
      return NextResponse.json(
        {
          error: "Payload too large",
          message: `Request body exceeds maximum size of ${Math.round(sizeLimit / 1024)}KB`,
          maxSize: sizeLimit,
        },
        { status: 413 }
      );
    }
  }
  
  return null;
}

/**
 * Validate JSON body size (for use in API routes)
 */
export function validateBodySize(body: unknown, maxSize: number = SIZE_LIMITS.default): boolean {
  const jsonString = JSON.stringify(body);
  return Buffer.byteLength(jsonString, "utf8") <= maxSize;
}
