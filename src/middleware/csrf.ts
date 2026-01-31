/**
 * CSRF Protection Middleware
 * Enhanced double-submit cookie pattern with additional security
 */

import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-change-in-production";

// Routes that require CSRF protection (mutations)
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Routes exempt from CSRF (webhooks use signature verification)
const CSRF_EXEMPT_ROUTES = [
  "/api/payments/notification",
  "/api/payments/webhook",
  "/api/webhooks",
  "/api/cron",
  "/api/external",
  "/api/auth", // NextAuth handles its own CSRF
];

/**
 * Check if route is exempt from CSRF
 */
function isExemptRoute(pathname: string): boolean {
  return CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Generate CSRF token using Web Crypto API (Edge compatible)
 */
export function generateCsrfToken(): { token: string; signedToken: string } {
  // Generate random bytes
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const token = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  
  const timestamp = Date.now().toString();
  
  // Simple signature using base64 encoding (Edge compatible)
  const data = `${token}:${timestamp}:${CSRF_SECRET}`;
  const signature = btoa(data).slice(0, 64);
  
  return {
    token,
    signedToken: `${token}:${timestamp}:${signature}`,
  };
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(signedToken: string): {
  valid: boolean;
  error?: string;
} {
  if (!signedToken) {
    return { valid: false, error: "Token missing" };
  }
  
  const parts = signedToken.split(":");
  if (parts.length !== 3) {
    return { valid: false, error: "Invalid token format" };
  }
  
  const [token, timestamp, signature] = parts;
  
  // Check timestamp (24 hour expiry)
  const tokenTime = parseInt(timestamp, 10);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (isNaN(tokenTime) || now - tokenTime > maxAge) {
    return { valid: false, error: "Token expired" };
  }
  
  // Verify signature
  const data = `${token}:${timestamp}:${CSRF_SECRET}`;
  const expectedSignature = btoa(data).slice(0, 64);
  
  if (signature !== expectedSignature) {
    return { valid: false, error: "Invalid signature" };
  }
  
  return { valid: true };
}

/**
 * CSRF protection middleware
 */
export async function csrfMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  
  // Only protect mutation methods
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return null;
  }
  
  // Skip non-API routes
  if (!pathname.startsWith("/api")) {
    return null;
  }
  
  // Skip exempt routes
  if (isExemptRoute(pathname)) {
    return null;
  }
  
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return NextResponse.json(
      { error: "CSRF validation failed", message: "Missing CSRF cookie" },
      { status: 403 }
    );
  }
  
  // Verify cookie token
  const cookieResult = verifyCsrfToken(cookieToken);
  if (!cookieResult.valid) {
    return NextResponse.json(
      { error: "CSRF validation failed", message: cookieResult.error },
      { status: 403 }
    );
  }
  
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!headerToken) {
    return NextResponse.json(
      { error: "CSRF validation failed", message: "Missing CSRF token in request header" },
      { status: 403 }
    );
  }
  
  // Extract raw token from cookie's signed token for comparison
  const cookieRawToken = cookieToken.split(":")[0];
  
  // Compare tokens
  if (headerToken !== cookieRawToken) {
    return NextResponse.json(
      { error: "CSRF validation failed", message: "Token mismatch" },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Set CSRF cookie on response
 */
export function setCsrfCookie(response: NextResponse): string {
  const { token, signedToken } = generateCsrfToken();
  
  response.cookies.set(CSRF_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  });
  
  return token;
}
