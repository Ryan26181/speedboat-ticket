/**
 * User Database Operations
 * 
 * Handles user-related database operations for authentication.
 * Follows security best practices.
 */

import { prisma } from "./prisma";
import { hashPassword } from "./password";
import { 
  generateSecureToken, 
  hashToken,
  isTokenExpired,
  generateVerificationToken,
  generatePasswordResetToken
} from "./tokens";

/**
 * Find user by email
 * @param email - User email (case insensitive)
 * @returns User or null
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      emailVerified: true,
      role: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });
}

/**
 * Find user by ID
 * @param id - User ID
 * @returns User or null
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      role: true,
    },
  });
}

/**
 * Create a new user with email/password
 * @param email - User email
 * @param password - Plain text password (will be hashed)
 * @param name - User's name
 * @returns Created user
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string
) {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      // emailVerified is null - user must verify email
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

/**
 * Check if email exists in database
 * @param email - Email to check
 * @returns True if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return !!user;
}

/**
 * Create email verification token
 * Invalidates any existing tokens for the user
 * @param userId - User ID
 * @returns Plain text token (to send in email)
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  // Delete any existing tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  // Generate new token
  const token = generateSecureToken();
  const tokenHash = hashToken(token);

  // Store hashed token
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  // Return plain token to send in email
  return token;
}

/**
 * Verify email verification token and mark email as verified
 * @param token - Plain text token from email
 * @returns Object with success status and user info
 */
export async function verifyEmailToken(token: string): Promise<{
  success: boolean;
  error?: string;
  user?: { id: string; email: string; name: string | null };
}> {
  const tokenHash = hashToken(token);

  // Find token
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, name: true, emailVerified: true } } },
  });

  if (!verificationToken) {
    return { success: false, error: "Invalid or expired verification link" };
  }

  // Check if already used
  if (verificationToken.usedAt) {
    return { success: false, error: "This verification link has already been used" };
  }

  // Check if expired
  if (isTokenExpired(verificationToken.expiresAt)) {
    return { success: false, error: "This verification link has expired. Please request a new one." };
  }

  // Check if already verified
  if (verificationToken.user.emailVerified) {
    // Mark token as used anyway
    await prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });
    return { success: true, user: verificationToken.user };
  }

  // Update user and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    user: { ...verificationToken.user, emailVerified: new Date() } as { id: string; email: string; name: string | null },
  };
}

/**
 * Create password reset token
 * Invalidates any existing tokens for the user
 * @param userId - User ID
 * @returns Plain text token (to send in email)
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Delete any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  // Generate new token
  const token = generateSecureToken();
  const tokenHash = hashToken(token);

  // Store hashed token
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
    },
  });

  // Return plain token to send in email
  return token;
}

/**
 * Verify password reset token and reset password
 * @param token - Plain text token from email
 * @param newPassword - New password (plain text, will be hashed)
 * @returns Object with success status
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const tokenHash = hashToken(token);

  // Find token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true } } },
  });

  if (!resetToken) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  // Check if already used
  if (resetToken.usedAt) {
    return { success: false, error: "This reset link has already been used" };
  }

  // Check if expired
  if (isTokenExpired(resetToken.expiresAt)) {
    return { success: false, error: "This reset link has expired. Please request a new one." };
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        // Also reset login attempts and verify email if not already
        failedLoginAttempts: 0,
        lockedUntil: null,
        emailVerified: new Date(), // Verify email on password reset
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all sessions for this user (security measure)
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  return { success: true };
}

/**
 * Update user password
 * @param userId - User ID
 * @param newPassword - New password (plain text, will be hashed)
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    }),
    // Invalidate all sessions (security measure)
    prisma.session.deleteMany({
      where: { userId },
    }),
  ]);
}

/**
 * Set password for OAuth user (linking accounts)
 * @param userId - User ID
 * @param password - Password (plain text, will be hashed)
 */
export async function setUserPassword(
  userId: string,
  password: string
): Promise<void> {
  const hashedPassword = await hashPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
  });
}

// ============================================
// STEP 5 COMPATIBILITY ALIASES
// ============================================

/**
 * Get user by email (alias for findUserByEmail)
 */
export async function getUserByEmail(email: string) {
  if (!email) return null;
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

/**
 * Get user by ID (alias for findUserById)
 */
export async function getUserById(id: string) {
  if (!id) return null;
  return await prisma.user.findUnique({ where: { id } });
}

/**
 * Create a new user with email/password
 */
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  const hashed = await hashPassword(data.password);
  return await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      password: hashed,
      emailVerified: null,
      failedLoginAttempts: 0,
    },
  });
}

/**
 * Mark user's email as verified
 */
export async function verifyUserEmail(email: string) {
  return await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { emailVerified: new Date() },
  });
}

/**
 * Update user password by email
 */
export async function updatePasswordByEmail(email: string, newPassword: string) {
  const hashed = await hashPassword(newPassword);
  return await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: {
      password: hashed,
      emailVerified: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Check if email is already registered
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  return !!user;
}
