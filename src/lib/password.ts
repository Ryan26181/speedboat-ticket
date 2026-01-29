import bcrypt from "bcryptjs";

// ============================================
// CONFIGURATION
// ============================================

/**
 * Bcrypt cost factor (12 is recommended for 2024+)
 * Higher = more secure but slower
 * 12 = ~250ms per hash on modern hardware
 */
const SALT_ROUNDS = 12;

// ============================================
// PASSWORD HASHING
// ============================================

/**
 * Hash a password using bcrypt with secure salt rounds
 * 
 * @param password - Plain text password
 * @returns Hashed password
 * 
 * Security: Uses adaptive cost factor, auto-generates salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate input
  if (!password || typeof password !== "string") {
    throw new Error("Invalid password input");
  }

  // Generate hash with auto-generated salt
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * 
 * @param plainPassword - Plain text password to verify
 * @param hashedPassword - Stored hashed password
 * @returns True if password matches
 * 
 * Security: Constant-time comparison (built into bcrypt)
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  // Validate inputs
  if (!plainPassword || !hashedPassword) {
    return false;
  }

  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch {
    // Return false on any error (don't leak info)
    return false;
  }
}

/**
 * Check if a password hash needs to be upgraded
 * (e.g., if cost factor has increased)
 * 
 * @param hashedPassword - Current hashed password
 * @returns True if hash should be regenerated
 */
export function passwordNeedsRehash(hashedPassword: string): boolean {
  try {
    const rounds = bcrypt.getRounds(hashedPassword);
    return rounds < SALT_ROUNDS;
  } catch {
    return true; // Rehash if we can't determine rounds
  }
}
