import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// ============================================
// API Key Authentication
// For external integrations and third-party access
// ============================================

const API_KEY_HEADER = "X-API-Key";
const API_KEY_PREFIX = "sk_"; // Secret key prefix
const API_KEY_HASH_ALGORITHM = "sha256";

export interface ApiKeyInfo {
  id: string;
  name: string;
  permissions: string[];
  userId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  key?: ApiKeyInfo;
  error?: string;
}

/**
 * Generate a new API key
 * Returns the plain key (only shown once) and the hash for storage
 */
export function generateApiKey(): { plainKey: string; hashedKey: string } {
  // Generate 32 bytes of random data (256 bits)
  const randomPart = randomBytes(32).toString("base64url");
  const plainKey = `${API_KEY_PREFIX}${randomPart}`;
  
  // Hash the key for storage
  const hashedKey = hashApiKey(plainKey);
  
  return { plainKey, hashedKey };
}

/**
 * Hash an API key for storage or comparison
 */
export function hashApiKey(plainKey: string): string {
  return createHash(API_KEY_HASH_ALGORITHM)
    .update(plainKey)
    .digest("hex");
}

/**
 * Validate an API key from request
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyValidationResult> {
  const apiKey = request.headers.get(API_KEY_HEADER);
  
  if (!apiKey) {
    return { valid: false, error: "API key required" };
  }
  
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: "Invalid API key format" };
  }
  
  const hashedKey = hashApiKey(apiKey);
  
  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { hashedKey },
      include: { user: true },
    });
    
    if (!keyRecord) {
      // Log failed attempt
      logger.warn("[API_KEY_INVALID]", {
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      });
      return { valid: false, error: "Invalid API key" };
    }
    
    // Check if key is revoked
    if (keyRecord.revokedAt) {
      return { valid: false, error: "API key has been revoked" };
    }
    
    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return { valid: false, error: "API key has expired" };
    }
    
    // Update last used timestamp (non-blocking)
    prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch((err) => {
      logger.error("[API_KEY_UPDATE_ERROR]", { error: err });
    });
    
    // Log successful use
    logger.info("[API_KEY_USED]", {
      keyId: keyRecord.id,
      keyName: keyRecord.name,
      userId: keyRecord.userId,
    });
    
    return {
      valid: true,
      key: {
        id: keyRecord.id,
        name: keyRecord.name,
        permissions: keyRecord.permissions,
        userId: keyRecord.userId,
        lastUsedAt: keyRecord.lastUsedAt,
        expiresAt: keyRecord.expiresAt,
      },
    };
  } catch (error) {
    logger.error("[API_KEY_VALIDATION_ERROR]", { error });
    return { valid: false, error: "Failed to validate API key" };
  }
}

/**
 * Require valid API key with specific permissions
 */
export async function requireApiKey(
  request: NextRequest,
  requiredPermissions: string[] = []
): Promise<ApiKeyInfo> {
  const result = await validateApiKey(request);
  
  if (!result.valid || !result.key) {
    throw new ApiKeyError(result.error || "Invalid API key", 401);
  }
  
  // Check permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(
      (perm) => result.key!.permissions.includes(perm) || result.key!.permissions.includes("*")
    );
    
    if (!hasAllPermissions) {
      throw new ApiKeyError("Insufficient permissions", 403);
    }
  }
  
  return result.key;
}

/**
 * API Key Error class
 */
export class ApiKeyError extends Error {
  status: number;
  
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "ApiKeyError";
    this.status = status;
  }
}

// ============================================
// Permission Constants
// ============================================

export const API_PERMISSIONS = {
  // Booking operations
  BOOKINGS_READ: "bookings:read",
  BOOKINGS_CREATE: "bookings:create",
  BOOKINGS_CANCEL: "bookings:cancel",
  
  // Schedule operations  
  SCHEDULES_READ: "schedules:read",
  SCHEDULES_WRITE: "schedules:write",
  
  // Ticket operations
  TICKETS_READ: "tickets:read",
  TICKETS_VALIDATE: "tickets:validate",
  
  // Reports
  REPORTS_READ: "reports:read",
  
  // Full access
  ALL: "*",
} as const;

export type ApiPermission = typeof API_PERMISSIONS[keyof typeof API_PERMISSIONS];
