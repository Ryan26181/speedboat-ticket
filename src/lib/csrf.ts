import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF Protection using Double-Submit Cookie Pattern
 * 
 * Implementation:
 * 1. Server generates a random token and signs it with HMAC
 * 2. Token is stored in an HttpOnly cookie
 * 3. Token is also sent to client for inclusion in requests
 * 4. Mutations must include token in header or body
 * 5. Server validates token signature and matches cookie
 * 
 * This protects against CSRF because:
 * - Attackers cannot read the cookie (HttpOnly, SameSite)
 * - Attackers cannot forge a valid signed token
 * - Both cookie and header/body token must match
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get CSRF secret from environment
 */
function getSecret(): string {
  const secret = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('CSRF_SECRET or NEXTAUTH_SECRET must be set');
  }
  return secret;
}

/**
 * Create a signed CSRF token
 */
export function createCsrfToken(): {
  token: string;
  signedToken: string;
  expiresAt: number;
} {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
  
  const payload = `${token}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');
  
  const signedToken = `${payload}:${signature}`;
  
  return { token, signedToken, expiresAt };
}

/**
 * Verify a signed CSRF token
 */
export function verifyCsrfToken(signedToken: string): {
  valid: boolean;
  token?: string;
  error?: string;
} {
  if (!signedToken) {
    return { valid: false, error: 'Token missing' };
  }

  const parts = signedToken.split(':');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  const [token, expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  // Check expiry
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, error: 'Token expired' };
  }

  // Verify signature
  const payload = `${token}:${expiresAtStr}`;
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true, token };
}

/**
 * Set CSRF cookie for the response
 */
export function setCsrfCookie(response: NextResponse): string {
  const { signedToken } = createCsrfToken();
  
  response.cookies.set(CSRF_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_EXPIRY_MS / 1000,
  });

  return signedToken;
}

/**
 * Get CSRF token from cookies (server-side)
 */
export async function getCsrfTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Generate a new CSRF token and set cookie
 * Returns the token for client-side use
 */
export async function generateCsrfToken(): Promise<{
  token: string;
  response?: NextResponse;
}> {
  const { token, signedToken } = createCsrfToken();
  
  // Store in cookie for next request
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_EXPIRY_MS / 1000,
  });

  return { token };
}

/**
 * Validate CSRF token from request
 * Checks both cookie and header/body
 */
export async function validateCsrfToken(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return { valid: false, error: 'CSRF cookie missing' };
  }

  // Verify cookie token
  const cookieResult = verifyCsrfToken(cookieToken);
  if (!cookieResult.valid) {
    return { valid: false, error: `Cookie: ${cookieResult.error}` };
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  // Or from body for form submissions
  let bodyToken: string | null = null;
  if (!headerToken) {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        const body = await request.clone().json();
        bodyToken = body._csrf || body.csrfToken;
      } catch {
        // Ignore JSON parse errors
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const body = await request.clone().formData();
        bodyToken = body.get('_csrf')?.toString() || null;
      } catch {
        // Ignore form parse errors
      }
    }
  }

  const requestToken = headerToken || bodyToken;
  if (!requestToken) {
    return { valid: false, error: 'CSRF token missing from request' };
  }

  // Compare tokens (using the raw token from cookie verification)
  if (requestToken !== cookieResult.token) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  return { valid: true };
}

/**
 * CSRF protection middleware for API routes
 */
export async function csrfProtectionMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // Skip CSRF check for safe methods
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  // Skip for webhook endpoints (they use signature verification)
  const pathname = request.nextUrl.pathname;
  if (pathname.includes('/webhook') || pathname.includes('/callback')) {
    return null;
  }

  // Validate CSRF token
  const result = await validateCsrfToken(request);
  
  if (!result.valid) {
    return NextResponse.json(
      { error: 'CSRF validation failed', details: result.error },
      { status: 403 }
    );
  }

  return null;
}

// ============================================
// CLIENT-SIDE HELPERS
// ============================================

/**
 * Get CSRF token for client-side use
 * Call this from a server action or API route
 */
export async function getClientCsrfToken(): Promise<string> {
  const cookieToken = await getCsrfTokenFromCookie();
  
  if (cookieToken) {
    const result = verifyCsrfToken(cookieToken);
    if (result.valid && result.token) {
      return result.token;
    }
  }

  // Generate new token if none exists or expired
  const { token } = await generateCsrfToken();
  return token;
}

/**
 * Create headers with CSRF token for fetch requests
 */
export function createCsrfHeaders(
  token: string,
  additionalHeaders?: HeadersInit
): HeadersInit {
  return {
    ...additionalHeaders,
    [CSRF_HEADER_NAME]: token,
  };
}

// ============================================
// REACT HOOK SUPPORT
// ============================================

/**
 * API response type for CSRF token endpoint
 */
export interface CsrfTokenResponse {
  token: string;
}

/**
 * Export constants for client use
 */
export const CSRF_CONSTANTS = {
  COOKIE_NAME: CSRF_COOKIE_NAME,
  HEADER_NAME: CSRF_HEADER_NAME,
} as const;
