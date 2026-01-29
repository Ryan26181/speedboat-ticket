import { prisma } from "./prisma";

// Configuration
const MAX_FAILED_ATTEMPTS = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || "5");
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || "15");

/**
 * Check if an account is locked
 */
export async function isAccountLocked(email: string): Promise<{
  isLocked: boolean;
  lockedUntil: Date | null;
  remainingAttempts: number;
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    // Don't reveal if user exists
    return { isLocked: false, lockedUntil: null, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  // Check if currently locked
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    return {
      isLocked: true,
      lockedUntil: user.lockedUntil,
      remainingAttempts: 0,
    };
  }

  // Check if lock has expired
  if (user.lockedUntil && new Date() >= user.lockedUntil) {
    // Reset lock and attempts
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    return { isLocked: false, lockedUntil: null, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - user.failedLoginAttempts);
  return { isLocked: false, lockedUntil: null, remainingAttempts };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(email: string): Promise<{
  isNowLocked: boolean;
  lockedUntil: Date | null;
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { failedLoginAttempts: true },
  });

  if (!user) {
    return { isNowLocked: false, lockedUntil: null };
  }

  const newAttemptCount = user.failedLoginAttempts + 1;
  const shouldLock = newAttemptCount >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      failedLoginAttempts: newAttemptCount,
      lockedUntil,
    },
  });

  // Log the attempt
  await logLoginAttempt(email, false, shouldLock ? "account_locked" : "invalid_password");

  return { isNowLocked: shouldLock, lockedUntil };
}

/**
 * Reset failed attempts after successful login
 */
export async function resetFailedAttempts(email: string, ipAddress?: string): Promise<void> {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });

  // Log successful login
  await logLoginAttempt(email, true, "success", ipAddress);
}

/**
 * Log login attempt for security auditing
 */
async function logLoginAttempt(
  email: string,
  success: boolean,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        success,
        reason,
        ipAddress,
        userAgent,
      },
    });
  } catch {
    // Don't fail login if logging fails
    console.error("[LOGIN_ATTEMPT_LOG_ERROR]");
  }
}

/**
 * Format lockout duration for display
 * @param lockedUntil - Lockout end time
 * @returns Human-readable duration string
 */
export function formatLockoutDuration(lockedUntil: Date): string {
  const now = new Date();
  const diffMs = lockedUntil.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes <= 1) {
    return "less than a minute";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minutes`;
  } else {
    const hours = Math.ceil(diffMinutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
}
