/**
 * Payment Utilities - Enterprise Grade
 * 
 * Features:
 * - State Machine for payment/booking status transitions
 * - Webhook Lock to prevent race conditions
 * - Audit Logging for all payment events
 * - Idempotency helpers
 */

import { prisma } from "./prisma";
import type { PaymentStatus, BookingStatus, PaymentEventType } from "@prisma/client";

// ============================================
// STATE MACHINE - Valid Status Transitions
// ============================================

/**
 * Valid Payment Status Transitions
 * Format: { fromStatus: [allowedToStatuses] }
 */
export const PAYMENT_STATUS_TRANSITIONS: Record<string, PaymentStatus[]> = {
  PENDING: ["SUCCESS", "FAILED", "EXPIRED", "CANCELLED", "CHALLENGE", "DENY"],
  CHALLENGE: ["SUCCESS", "DENY", "CANCELLED"], // Fraud review can resolve to success or deny
  SUCCESS: ["REFUNDED"], // Only refund from success
  FAILED: [], // Terminal state
  EXPIRED: [], // Terminal state
  CANCELLED: [], // Terminal state
  DENY: [], // Terminal state
  REFUNDED: [], // Terminal state
};

/**
 * Valid Booking Status Transitions
 */
export const BOOKING_STATUS_TRANSITIONS: Record<string, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["COMPLETED", "REFUNDED", "CANCELLED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [], // Terminal state
  EXPIRED: [], // Terminal state
  REFUNDED: [], // Terminal state
};

/**
 * Check if a payment status transition is valid
 */
export function isValidPaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus
): boolean {
  if (from === to) return true; // Same status is always valid (idempotent)
  const allowed = PAYMENT_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Check if a booking status transition is valid
 */
export function isValidBookingTransition(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  if (from === to) return true;
  const allowed = BOOKING_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Map Midtrans transaction status to our PaymentStatus
 * Handles ALL Midtrans statuses including edge cases
 */
export function mapMidtransToPaymentStatus(
  transactionStatus: string,
  fraudStatus?: string
): PaymentStatus {
  // Handle fraud status first
  if (fraudStatus === "challenge") {
    return "CHALLENGE";
  }
  if (fraudStatus === "deny") {
    return "DENY";
  }

  // Map transaction status
  switch (transactionStatus.toLowerCase()) {
    case "capture":
    case "settlement":
      return "SUCCESS";
    
    case "pending":
      return "PENDING";
    
    case "deny":
      return "DENY";
    
    case "cancel":
      return "CANCELLED";
    
    case "expire":
      return "EXPIRED";
    
    case "failure":
      return "FAILED";
    
    case "refund":
    case "partial_refund":
      return "REFUNDED";
    
    case "authorize":
      // Pre-authorization, treat as pending until capture
      return "PENDING";
    
    case "chargeback":
      // Chargeback is like a forced refund
      return "REFUNDED";
    
    default:
      console.warn(`[PAYMENT] Unknown Midtrans status: ${transactionStatus}`);
      return "PENDING";
  }
}

/**
 * Map PaymentStatus to BookingStatus
 */
export function mapPaymentToBookingStatus(
  paymentStatus: PaymentStatus
): BookingStatus {
  switch (paymentStatus) {
    case "SUCCESS":
      return "CONFIRMED";
    case "FAILED":
    case "DENY":
    case "CANCELLED":
      return "CANCELLED";
    case "EXPIRED":
      return "EXPIRED";
    case "REFUNDED":
      return "REFUNDED";
    case "PENDING":
    case "CHALLENGE":
    default:
      return "PENDING";
  }
}

// ============================================
// WEBHOOK LOCK - Prevent Race Conditions
// ============================================

const LOCK_TIMEOUT_SECONDS = 30; // Lock expires after 30 seconds

interface AcquireLockResult {
  acquired: boolean;
  lockId?: string;
}

/**
 * Try to acquire a lock for processing a webhook
 * Uses database-level locking to prevent race conditions
 */
export async function acquireWebhookLock(
  orderId: string,
  instanceId?: string
): Promise<AcquireLockResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_SECONDS * 1000);

  try {
    // First, clean up expired locks
    await prisma.webhookLock.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    // Try to create a lock (will fail if already exists due to unique constraint)
    const lock = await prisma.webhookLock.create({
      data: {
        orderId,
        expiresAt,
        lockedBy: instanceId || "default",
      },
    });

    return { acquired: true, lockId: lock.id };
  } catch (error: unknown) {
    // Check if it's a unique constraint violation (lock already exists)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      // Check if the existing lock is expired
      const existingLock = await prisma.webhookLock.findUnique({
        where: { orderId },
      });

      if (existingLock && existingLock.expiresAt < now) {
        // Lock is expired, try to take it over
        try {
          await prisma.webhookLock.update({
            where: { orderId },
            data: {
              lockedAt: now,
              expiresAt,
              lockedBy: instanceId || "default",
            },
          });
          return { acquired: true, lockId: existingLock.id };
        } catch {
          // Another instance got it first
          return { acquired: false };
        }
      }

      return { acquired: false };
    }

    // Other error, log and return false
    console.error("[WEBHOOK_LOCK] Error acquiring lock:", error);
    return { acquired: false };
  }
}

/**
 * Release a webhook lock
 */
export async function releaseWebhookLock(orderId: string): Promise<void> {
  try {
    await prisma.webhookLock.delete({
      where: { orderId },
    });
  } catch {
    // Lock might already be released or expired
  }
}

/**
 * Execute a function with webhook lock protection
 */
export async function withWebhookLock<T>(
  orderId: string,
  fn: () => Promise<T>
): Promise<{ success: boolean; result?: T; error?: string }> {
  const lockResult = await acquireWebhookLock(orderId);

  if (!lockResult.acquired) {
    return {
      success: false,
      error: "Could not acquire lock - another process is handling this webhook",
    };
  }

  try {
    const result = await fn();
    return { success: true, result };
  } finally {
    await releaseWebhookLock(orderId);
  }
}

// ============================================
// AUDIT LOGGING
// ============================================

interface LogPaymentEventParams {
  paymentId: string;
  eventType: PaymentEventType;
  previousStatus?: string;
  newStatus?: string;
  midtransOrderId?: string;
  midtransStatus?: string;
  midtransFraudStatus?: string;
  midtransPaymentType?: string;
  rawPayload?: object;
  errorMessage?: string;
  errorStack?: string;
  ipAddress?: string;
  userAgent?: string;
  processedBy?: string;
  processingMs?: number;
}

/**
 * Log a payment event for audit trail
 */
export async function logPaymentEvent(
  params: LogPaymentEventParams
): Promise<void> {
  try {
    await prisma.paymentLog.create({
      data: {
        paymentId: params.paymentId,
        eventType: params.eventType,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        midtransOrderId: params.midtransOrderId,
        midtransStatus: params.midtransStatus,
        midtransFraudStatus: params.midtransFraudStatus,
        midtransPaymentType: params.midtransPaymentType,
        rawPayload: params.rawPayload,
        errorMessage: params.errorMessage,
        errorStack: params.errorStack,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        processedBy: params.processedBy,
        processingMs: params.processingMs,
      },
    });
  } catch (error) {
    // Don't let logging failures break the main flow
    console.error("[PAYMENT_LOG] Failed to log event:", error);
  }
}

/**
 * Log webhook received event
 */
export async function logWebhookReceived(
  paymentId: string,
  payload: object,
  orderId: string,
  transactionStatus: string,
  fraudStatus?: string,
  paymentType?: string
): Promise<void> {
  await logPaymentEvent({
    paymentId,
    eventType: "WEBHOOK_RECEIVED",
    midtransOrderId: orderId,
    midtransStatus: transactionStatus,
    midtransFraudStatus: fraudStatus,
    midtransPaymentType: paymentType,
    rawPayload: payload,
    processedBy: "MIDTRANS_WEBHOOK",
  });
}

/**
 * Log status change event
 */
export async function logStatusChange(
  paymentId: string,
  previousStatus: string,
  newStatus: string,
  orderId?: string,
  processingMs?: number
): Promise<void> {
  await logPaymentEvent({
    paymentId,
    eventType: "STATUS_CHANGED",
    previousStatus,
    newStatus,
    midtransOrderId: orderId,
    processingMs,
    processedBy: "WEBHOOK_PROCESSOR",
  });
}

/**
 * Log error event
 */
export async function logPaymentError(
  paymentId: string,
  errorMessage: string,
  errorStack?: string,
  payload?: object
): Promise<void> {
  await logPaymentEvent({
    paymentId,
    eventType: "ERROR",
    errorMessage,
    errorStack,
    rawPayload: payload,
    processedBy: "SYSTEM",
  });
}

// ============================================
// IDEMPOTENCY HELPERS
// ============================================

/**
 * Check if a webhook has already been processed
 * Uses payment status and transaction ID
 */
export async function isWebhookAlreadyProcessed(
  orderId: string,
  transactionId: string,
  expectedStatus: PaymentStatus
): Promise<boolean> {
  const payment = await prisma.payment.findUnique({
    where: { orderId },
    select: {
      status: true,
      transactionId: true,
    },
  });

  if (!payment) return false;

  // If status matches and transaction ID matches, it's already processed
  return (
    payment.status === expectedStatus &&
    payment.transactionId === transactionId
  );
}

/**
 * Generate a unique idempotency key for a webhook
 */
export function generateIdempotencyKey(
  orderId: string,
  transactionStatus: string,
  transactionId?: string
): string {
  return `${orderId}:${transactionStatus}:${transactionId || "unknown"}`;
}
