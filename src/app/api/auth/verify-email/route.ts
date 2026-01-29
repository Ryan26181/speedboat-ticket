/**
 * Email Verification API Route
 * 
 * POST /api/auth/verify-email
 * 
 * Verifies user's email address using the token from the verification email.
 * Security features:
 * - Token hashing
 * - Token expiration
 * - One-time use tokens
 * - Rate limiting
 */

import { NextResponse } from "next/server";
import { verifyEmailSchema } from "@/validations/auth";
import { verifyEmailToken } from "@/lib/user";
import { 
  checkRateLimit, 
  getRateLimitIdentifier, 
  RATE_LIMITS 
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, "verifyEmail");
    const rateLimit = checkRateLimit(
      rateLimitId,
      RATE_LIMITS.verifyEmail.windowMs,
      RATE_LIMITS.verifyEmail.maxRequests
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: "Too many attempts. Please try again later.",
          retryAfter: Math.ceil(rateLimit.retryAfterMs / 1000 / 60)
        },
        { 
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.retryAfterMs / 1000).toString(),
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = verifyEmailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { token } = result.data;

    // Verify token
    const verification = await verifyEmailToken(token);

    if (!verification.success) {
      return NextResponse.json(
        { error: verification.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now sign in.",
      user: {
        email: verification.user?.email,
        name: verification.user?.name,
      },
    });

  } catch (error) {
    console.error("[VerifyEmail] Error:", error);
    return NextResponse.json(
      { error: "An error occurred during verification. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint for direct link clicks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/auth/verify-email?error=missing_token", request.url));
    }

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, "verifyEmail");
    const rateLimit = checkRateLimit(
      rateLimitId,
      RATE_LIMITS.verifyEmail.windowMs,
      RATE_LIMITS.verifyEmail.maxRequests
    );

    if (!rateLimit.allowed) {
      return NextResponse.redirect(new URL("/auth/verify-email?error=rate_limit", request.url));
    }

    // Verify token
    const verification = await verifyEmailToken(token);

    if (!verification.success) {
      return NextResponse.redirect(
        new URL(`/auth/verify-email?error=${encodeURIComponent(verification.error || "invalid")}`, request.url)
      );
    }

    // Redirect to success page
    return NextResponse.redirect(new URL("/auth/verify-email?success=true", request.url));

  } catch (error) {
    console.error("[VerifyEmail GET] Error:", error);
    return NextResponse.redirect(new URL("/auth/verify-email?error=server_error", request.url));
  }
}
