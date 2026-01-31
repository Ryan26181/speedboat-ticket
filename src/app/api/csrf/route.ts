import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken } from '@/middleware/csrf';

// In-memory rate limiting for CSRF endpoint
const csrfRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30;

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * GET /api/csrf
 * 
 * Returns a CSRF token for client-side use.
 * The token should be included in all mutation requests.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip = getClientIP(request);
  const now = Date.now();
  const record = csrfRateLimit.get(ip);

  if (record && record.resetAt > now && record.count >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((record.resetAt - now) / 1000)),
        },
      }
    );
  }

  // Update rate limit
  if (!record || record.resetAt < now) {
    csrfRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  } else {
    record.count++;
  }

  try {
    const { token, signedToken } = generateCsrfToken();
    
    const response = NextResponse.json({ token });

    // Set the signed token in cookie
    response.cookies.set("csrf_token", signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('[CSRF_TOKEN_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
