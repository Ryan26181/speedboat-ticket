import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { prisma } from "./prisma";

// ============================================
// CONFIGURATION
// ============================================

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

// ============================================
// TOKEN GENERATION (Cryptographically Secure)
// ============================================

/**
 * Generate a cryptographically secure random token
 * Uses UUID v4 which is based on crypto.randomBytes
 */
export function generateSecureToken(): string {
  return uuidv4();
}

/**
 * Hash a token for storage
 * We store hashed tokens so even if DB is compromised, 
 * tokens cannot be used
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ============================================
// EMAIL VERIFICATION TOKENS
// ============================================

/**
 * Generate email verification token
 * 
 * @param userId - User's ID
 * @returns Plain token (to send via email)
 * 
 * Security:
 * - Deletes any existing tokens first
 * - Stores hashed token in database
 * - Token expires in 24 hours
 */
export async function generateVerificationToken(userId: string): Promise<string> {
  // Generate secure token
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Delete any existing tokens for this user (one active token per user)
  await prisma.emailVerificationToken.deleteMany({
    where: { userId },
  });

  // Create new token (store hashed version)
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  // Return plain token (to send via email)
  return token;
}

/**
 * Verify an email verification token
 * 
 * @param userId - User's ID
 * @param token - Plain token from email link
 * @returns Token record if valid, null if invalid/expired
 */
export async function getVerificationToken(userId: string, token: string) {
  const hashedToken = hashToken(token);

  return await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      tokenHash: hashedToken,
      usedAt: null, // Not already used
    },
  });
}

/**
 * Get verification token by hashed token value
 */
export async function getVerificationTokenByHash(tokenHash: string) {
  return await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
        },
      },
    },
  });
}

/**
 * Mark verification token as used
 */
export async function markVerificationTokenUsed(tokenId: string) {
  await prisma.emailVerificationToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

/**
 * Delete verification token after use
 */
export async function deleteVerificationToken(tokenId: string) {
  try {
    await prisma.emailVerificationToken.delete({
      where: { id: tokenId },
    });
  } catch {
    // Token might already be deleted, ignore error
  }
}

// ============================================
// PASSWORD RESET TOKENS
// ============================================

/**
 * Generate password reset token
 * 
 * @param userId - User's ID
 * @returns Plain token (to send via email)
 * 
 * Security:
 * - Shorter expiry (1 hour)
 * - One token per user
 * - Hashed storage
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Delete any existing tokens
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify password reset token
 */
export async function getPasswordResetToken(userId: string, token: string) {
  const hashedToken = hashToken(token);

  return await prisma.passwordResetToken.findFirst({
    where: {
      userId,
      tokenHash: hashedToken,
      usedAt: null,
    },
  });
}

/**
 * Get password reset token by hashed token value
 */
export async function getPasswordResetTokenByHash(tokenHash: string) {
  return await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Mark password reset token as used
 */
export async function markPasswordResetTokenUsed(tokenId: string) {
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

/**
 * Delete password reset token after use
 */
export async function deletePasswordResetToken(tokenId: string) {
  try {
    await prisma.passwordResetToken.delete({
      where: { id: tokenId },
    });
  } catch {
    // Ignore if already deleted
  }
}

// ============================================
// TOKEN VALIDATION HELPERS
// ============================================

/**
 * Check if a token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Clean up expired tokens (can be run periodically)
 */
export async function cleanupExpiredTokens() {
  const now = new Date();

  await Promise.all([
    prisma.emailVerificationToken.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
  ]);
}
