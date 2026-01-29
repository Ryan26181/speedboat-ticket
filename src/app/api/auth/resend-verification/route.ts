/**
 * Resend Verification Email API Route
 * 
 * POST /api/auth/resend-verification
 * 
 * Resends the email verification link.
 * Security features:
 * - Rate limiting
 * - Prevents email enumeration (always returns success)
 */

import { NextResponse } from "next/server";
import { resendVerificationSchema } from "@/validations/auth";
import { findUserByEmail, createEmailVerificationToken } from "@/lib/user";
import { sendVerificationEmail } from "@/lib/email";
import { 
  checkRateLimit, 
  getRateLimitIdentifier,
  getRateLimitIdentifierByEmail,
  RATE_LIMITS 
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const rateLimitId = getRateLimitIdentifier(request, "resendVerification");
    const rateLimit = checkRateLimit(
      rateLimitId,
      RATE_LIMITS.resendVerification.windowMs,
      RATE_LIMITS.resendVerification.maxRequests
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
    const result = resendVerificationSchema.safeParse(body);

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

    // Rate limiting by email
    const emailRateLimitId = getRateLimitIdentifierByEmail(email, "resendVerification");
    const emailRateLimit = checkRateLimit(
      emailRateLimitId,
      RATE_LIMITS.resendVerification.windowMs,
      RATE_LIMITS.resendVerification.maxRequests
    );

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: "If an account exists with this email and is not yet verified, you will receive a verification link.",
    });

    if (!emailRateLimit.allowed) {
      return successResponse;
    }

    // Find user
    const user = await findUserByEmail(email);

    if (!user) {
      return successResponse;
    }

    // Check if already verified
    if (user.emailVerified) {
      return successResponse;
    }

    // Create new verification token
    const token = await createEmailVerificationToken(user.id);

    // Send verification email
    const emailResult = await sendVerificationEmail(email, token);
    const emailSent = emailResult.success;

    if (!emailSent) {
      console.error(`[ResendVerification] Failed to send verification email to ${email}`);
    }

    return successResponse;

  } catch (error) {
    console.error("[ResendVerification] Error:", error);
    // Return success even on error to prevent enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email and is not yet verified, you will receive a verification link.",
    });
  }
}
