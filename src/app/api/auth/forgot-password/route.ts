/**
 * Forgot Password API Route
 * 
 * POST /api/auth/forgot-password
 * 
 * Sends a password reset email to the user.
 * Security features:
 * - Rate limiting
 * - Prevents email enumeration (always returns success)
 * - Token expiration (1 hour)
 */

import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/validations/auth";
import { findUserByEmail, createPasswordResetToken } from "@/lib/user";
import { sendPasswordResetEmail } from "@/lib/email";
import { 
  checkRateLimit, 
  getRateLimitIdentifier,
  getRateLimitIdentifierByEmail,
  RATE_LIMITS 
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const rateLimitId = getRateLimitIdentifier(request, "forgotPassword");
    const rateLimit = checkRateLimit(
      rateLimitId,
      RATE_LIMITS.forgotPassword.windowMs,
      RATE_LIMITS.forgotPassword.maxRequests
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
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
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Rate limiting by email (prevent spam to one email)
    const emailRateLimitId = getRateLimitIdentifierByEmail(email, "forgotPassword");
    const emailRateLimit = checkRateLimit(
      emailRateLimitId,
      RATE_LIMITS.forgotPassword.windowMs,
      RATE_LIMITS.forgotPassword.maxRequests
    );

    // Always return success to prevent email enumeration
    // But only send email if rate limit allows and user exists
    const successResponse = NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });

    if (!emailRateLimit.allowed) {
      // Return success but don't send email (rate limited)
      return successResponse;
    }

    // Find user
    const user = await findUserByEmail(email);

    if (!user) {
      // Return success to prevent email enumeration
      return successResponse;
    }

    // Check if user has a password (credentials account)
    // If they only use OAuth, they can still reset to enable password login
    
    // Create reset token
    const token = await createPasswordResetToken(user.id);

    // Send reset email
    const emailResult = await sendPasswordResetEmail(email, token);
    const emailSent = emailResult.success;

    if (!emailSent) {
      console.error(`[ForgotPassword] Failed to send reset email to ${email}`);
    }

    return successResponse;

  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    // Return success even on error to prevent enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    });
  }
}
