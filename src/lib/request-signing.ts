import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ============================================
// Request Signing & Webhook Verification
// For secure webhook processing with audit trail
// ============================================

const SIGNATURE_HEADER = "X-Signature-256";
const TIMESTAMP_HEADER = "X-Timestamp";
const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes

export interface WebhookAuditEntry {
  id: string;
  source: string;
  eventType: string;
  payload: string;
  signatureValid: boolean;
  processedAt: Date;
  processingDurationMs: number;
  status: "success" | "failed" | "skipped";
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Generate HMAC signature for request signing
 */
export function generateSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

/**
 * Verify webhook signature
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number
): boolean {
  // Check timestamp tolerance (replay attack prevention)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    logger.warn("[WEBHOOK_SIGNATURE_EXPIRED]", {
      timestamp,
      currentTime,
      difference: Math.abs(currentTime - timestamp),
    });
    return false;
  }

  const expectedSignature = generateSignature(payload, secret, timestamp);
  
  // Use timing-safe comparison
  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Extract signature components from request headers
 */
export function extractSignatureFromRequest(request: NextRequest): {
  signature: string | null;
  timestamp: number | null;
} {
  const signature = request.headers.get(SIGNATURE_HEADER);
  const timestampStr = request.headers.get(TIMESTAMP_HEADER);
  
  let timestamp: number | null = null;
  if (timestampStr) {
    timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      timestamp = null;
    }
  }
  
  return { signature, timestamp };
}

/**
 * Verify incoming webhook request
 */
export async function verifyIncomingWebhook(
  request: NextRequest,
  secret: string
): Promise<{ valid: boolean; payload: string; error?: string }> {
  try {
    const payload = await request.text();
    const { signature, timestamp } = extractSignatureFromRequest(request);
    
    if (!signature) {
      return { valid: false, payload, error: "Missing signature header" };
    }
    
    if (!timestamp) {
      return { valid: false, payload, error: "Missing or invalid timestamp header" };
    }
    
    const isValid = verifyWebhookSignature(payload, signature, secret, timestamp);
    
    if (!isValid) {
      return { valid: false, payload, error: "Invalid signature" };
    }
    
    return { valid: true, payload };
  } catch (error) {
    logger.error("[WEBHOOK_VERIFICATION_ERROR]", { error });
    return { valid: false, payload: "", error: "Verification failed" };
  }
}

// ============================================
// Webhook Audit Logging
// ============================================

/**
 * Log webhook receipt for audit trail
 */
export async function logWebhookAudit(
  entry: Omit<WebhookAuditEntry, "id" | "processedAt">
): Promise<void> {
  try {
    await prisma.webhookAudit.create({
      data: {
        source: entry.source,
        eventType: entry.eventType,
        payload: entry.payload.substring(0, 10000), // Limit payload size
        signatureValid: entry.signatureValid,
        processingDurationMs: entry.processingDurationMs,
        status: entry.status,
        errorMessage: entry.errorMessage?.substring(0, 500),
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent?.substring(0, 500),
      },
    });
  } catch (error) {
    // Don't fail the webhook if audit logging fails
    logger.error("[WEBHOOK_AUDIT_LOG_ERROR]", { error, entry });
  }
}

/**
 * Create a webhook audit context for tracking
 */
export function createWebhookAuditContext(
  request: NextRequest,
  source: string,
  eventType: string
) {
  const startTime = Date.now();
  const ipAddress = request.headers.get("x-forwarded-for") || 
                    request.headers.get("x-real-ip") || 
                    "unknown";
  const userAgent = request.headers.get("user-agent") || undefined;
  
  return {
    source,
    eventType,
    ipAddress,
    userAgent,
    startTime,
    
    /**
     * Complete the audit with success status
     */
    async success(payload: string, signatureValid: boolean): Promise<void> {
      await logWebhookAudit({
        source,
        eventType,
        payload,
        signatureValid,
        processingDurationMs: Date.now() - startTime,
        status: "success",
        ipAddress,
        userAgent,
      });
    },
    
    /**
     * Complete the audit with failed status
     */
    async failed(payload: string, signatureValid: boolean, error: string): Promise<void> {
      await logWebhookAudit({
        source,
        eventType,
        payload,
        signatureValid,
        processingDurationMs: Date.now() - startTime,
        status: "failed",
        errorMessage: error,
        ipAddress,
        userAgent,
      });
    },
    
    /**
     * Complete the audit with skipped status
     */
    async skipped(payload: string, signatureValid: boolean, reason: string): Promise<void> {
      await logWebhookAudit({
        source,
        eventType,
        payload,
        signatureValid,
        processingDurationMs: Date.now() - startTime,
        status: "skipped",
        errorMessage: reason,
        ipAddress,
        userAgent,
      });
    },
  };
}

// ============================================
// Outgoing Request Signing
// For signing requests to external services
// ============================================

/**
 * Sign an outgoing request
 */
export function signOutgoingRequest(
  payload: string,
  secret: string
): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(payload, secret, timestamp);
  
  return { signature, timestamp };
}

/**
 * Add signature headers to fetch options
 */
export function addSignatureHeaders(
  headers: Headers | Record<string, string>,
  payload: string,
  secret: string
): void {
  const { signature, timestamp } = signOutgoingRequest(payload, secret);
  
  if (headers instanceof Headers) {
    headers.set(SIGNATURE_HEADER, signature);
    headers.set(TIMESTAMP_HEADER, timestamp.toString());
  } else {
    headers[SIGNATURE_HEADER] = signature;
    headers[TIMESTAMP_HEADER] = timestamp.toString();
  }
}

// ============================================
// Payload Hash for Idempotency
// ============================================

/**
 * Generate a hash of the payload for idempotency checks
 */
export function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Check if webhook was already processed (idempotency)
 */
export async function isWebhookProcessed(
  source: string,
  payloadHash: string
): Promise<boolean> {
  const existing = await prisma.webhookAudit.findFirst({
    where: {
      source,
      payload: { startsWith: payloadHash.substring(0, 20) },
      status: "success",
      processedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });
  
  return !!existing;
}
