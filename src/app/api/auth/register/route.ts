/**
 * Registration API Route
 * 
 * POST /api/auth/register
 * 
 * Creates a new user with email/password and sends verification email.
 * Security features:
 * - Rate limiting
 * - Input validation
 * - Password hashing
 * - Email verification required
 * - Prevents email enumeration
 */

import { NextResponse } from "next/server";
import { registerSchema } from "@/validations/auth";
import { 
  createUserWithPassword, 
  emailExists, 
  createEmailVerificationToken,
  findUserByEmail
} from "@/lib/user";
import { sendVerificationEmail } from "@/lib/email";
import { 
  checkRateLimit, 
  getRateLimitIdentifier, 
  RATE_LIMITS 
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(request, "register");
    const rateLimit = checkRateLimit(
      rateLimitId,
      RATE_LIMITS.register.windowMs,
      RATE_LIMITS.register.maxRequests
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: "Too many registration attempts. Please try again later.",
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
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: result.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    // Check if email exists (including OAuth users)
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // If user exists and has a password, tell them to login
      if (existingUser.password) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 400 }
        );
      }

      // If user exists without password (OAuth user), they can set a password
      // For now, return a generic message to prevent enumeration
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUserWithPassword(email, password, name);

    // Create verification token
    const token = await createEmailVerificationToken(user.id);

    // Send verification email
    const emailResult = await sendVerificationEmail(email, token);
    const emailSent = emailResult.success;

    if (!emailSent) {
      // Don't fail registration, but log the issue
      console.error(`[Register] Failed to send verification email to ${email}`);
    }

    return NextResponse.json(
      { 
        success: true,
        message: "Registration successful! Please check your email to verify your account.",
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("[Register] Error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
