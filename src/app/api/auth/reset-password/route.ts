/**
 * Reset Password API Route
 * 
 * POST /api/auth/reset-password
 * 
 * Resets user's password using the token from the reset email.
 * Security features:
 * - Token hashing
 * - Token expiration (1 hour)
 * - One-time use tokens
 * - Invalidates all sessions
 * - Rate limiting
 */

import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/validations/auth";
import { resetPasswordWithToken } from "@/lib/user";
import { 
  checkRateLimit, 
  getRateLimitIdentifier, 
  RATE_LIMITS 
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, "resetPassword");
    const rateLimit = checkRateLimit(
      rateLimitId,
      RATE_LIMITS.resetPassword.windowMs,
      RATE_LIMITS.resetPassword.maxRequests
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
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Reset password
    const resetResult = await resetPasswordWithToken(token, password);

    if (!resetResult.success) {
      return NextResponse.json(
        { error: resetResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });

  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "An error occurred while resetting your password. Please try again." },
      { status: 500 }
    );
  }
}
