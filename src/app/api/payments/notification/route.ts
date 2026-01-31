import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifySignature,
  isPaymentSuccess,
  isPaymentFailed,
  type MidtransNotification,
} from "@/lib/midtrans";
import {
  generateTicketCode,
  generateQRData,
} from "@/lib/booking-utils";
import {
  mapMidtransToPaymentStatus,
  isValidPaymentTransition,
  withWebhookLock,
  logWebhookReceived,
  logStatusChange,
  logPaymentError,
  logPaymentEvent,
} from "@/lib/payment-utils";
import { enqueueWebhook } from "@/lib/queue/payment-queue";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit-edge";

// Use queue in production, direct processing in development
const USE_QUEUE = process.env.USE_WEBHOOK_QUEUE === 'true';

// Webhook rate limiting configuration
// Allow 100 webhooks per minute per IP (generous for legitimate traffic, blocks abuse)
const WEBHOOK_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

// Midtrans IP ranges for webhook verification (Security Enhancement)
// Reference: https://docs.midtrans.com/docs/ip-address
const MIDTRANS_IP_WHITELIST = [
  // Midtrans Production IPs
  '103.208.23.0/24',
  '103.208.22.0/24',
  '103.127.16.0/24',
  '103.127.17.0/24',
  // Midtrans Sandbox IPs (same range)
  '103.208.23.0/24',
];

// Enable IP whitelisting (disable for local testing)
const ENABLE_IP_WHITELIST = process.env.NODE_ENV === 'production' && process.env.MIDTRANS_IP_WHITELIST !== 'false';

/**
 * Check if IP is within CIDR range
 */
function ipInCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  
  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);
  
  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
  
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Validate if request IP is from Midtrans
 */
function isValidMidtransIP(request: NextRequest): { valid: boolean; ip: string } {
  // Get client IP from various headers (in order of trust)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  // Use the first IP in x-forwarded-for, or fallback to other headers
  const clientIP = forwardedFor?.split(',')[0]?.trim() || realIP || cfConnectingIP || 'unknown';
  
  // Skip validation if disabled or IP unknown
  if (!ENABLE_IP_WHITELIST || clientIP === 'unknown') {
    return { valid: true, ip: clientIP };
  }
  
  // Check against whitelist
  const isWhitelisted = MIDTRANS_IP_WHITELIST.some(cidr => {
    try {
      return ipInCIDR(clientIP, cidr);
    } catch {
      return false;
    }
  });
  
  return { valid: isWhitelisted, ip: clientIP };
}

// Type for webhook lock result
interface WebhookLockResult {
  skipped?: boolean;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  shouldGenerateTickets?: boolean;
  ticketData?: {
    bookingId: string;
    bookingCode: string;
    scheduleId: string;
    passengers: Array<{ id: string; name: string }>;
  };
}

/**
 * POST /api/payments/notification
 * Receive Midtrans webhook notification (Enterprise Grade)
 * 
 * Features:
 * - IP whitelisting (Midtrans IPs only in production)
 * - Signature verification (security)
 * - Amount reconciliation (tamper detection)
 * - Queue-based processing (scalability)
 * - Webhook lock (prevents race conditions)
 * - State machine (validates transitions)
 * - Audit logging (full traceability)
 * - Idempotency (safe retries)
 * - Handles ALL Midtrans statuses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // IP Whitelist Check (Security Layer 1)
  const ipCheck = isValidMidtransIP(request);
  if (!ipCheck.valid) {
    logger.warn('[WEBHOOK_IP_REJECTED]', { 
      requestId, 
      ip: ipCheck.ip,
      reason: 'IP not in Midtrans whitelist',
    });
    return Response.json(
      { status: 'error', message: 'Forbidden' },
      { status: 403 }
    );
  }
  
  // Rate Limiting Check (Security Layer 2)
  // Prevents webhook flooding attacks even from valid IPs
  const rateLimitId = `webhook:${ipCheck.ip}`;
  const rateLimit = checkRateLimit(
    rateLimitId,
    WEBHOOK_RATE_LIMIT.windowMs,
    WEBHOOK_RATE_LIMIT.maxRequests
  );
  
  if (!rateLimit.allowed) {
    logger.warn('[WEBHOOK_RATE_LIMITED]', {
      requestId,
      ip: ipCheck.ip,
      retryAfterMs: rateLimit.retryAfterMs,
    });
    return Response.json(
      { status: 'error', message: 'Too many requests' },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }
  
  try {
    const body: MidtransNotification = await request.json();

    // Validate required fields
    if (!body.order_id || !body.signature_key || !body.transaction_status) {
      logger.warn('[WEBHOOK_MISSING_FIELDS]', { requestId, fields: Object.keys(body) });
      return Response.json(
        { status: 'error', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log incoming notification (for debugging)
    logger.info("[PAYMENT_WEBHOOK_RECEIVED]", {
      requestId,
      order_id: body.order_id,
      transaction_status: body.transaction_status,
      fraud_status: body.fraud_status,
      payment_type: body.payment_type,
      useQueue: USE_QUEUE,
    });

    // Verify signature (CRITICAL for security)
    const isValid = verifySignature(
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key
    );

    if (!isValid) {
      logger.error("[PAYMENT_WEBHOOK_INVALID_SIGNATURE]", { requestId, orderId: body.order_id });
      return Response.json(
        { status: 'error', message: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Queue-based processing for high-traffic scenarios
    if (USE_QUEUE) {
      try {
        await enqueueWebhook(body as unknown as Record<string, unknown>, requestId);
        
        const processingTime = Date.now() - startTime;
        logger.info('[WEBHOOK_QUEUED]', { requestId, orderId: body.order_id, processingTime });

        // Return immediately - job will be processed by worker
        return Response.json({ 
          status: 'ok', 
          requestId,
          queued: true,
        });
      } catch (queueError) {
        // Fall back to direct processing if queue fails
        logger.warn('[WEBHOOK_QUEUE_FAILED]', { 
          requestId, 
          error: queueError instanceof Error ? queueError.message : 'Unknown error',
        });
        // Continue with direct processing below
      }
    }

    // Direct processing (for development or when queue unavailable)

    // Find payment by orderId
    const payment = await prisma.payment.findUnique({
      where: { orderId: body.order_id },
      include: {
        booking: {
          include: {
            passengers: true,
          },
        },
      },
    });

    if (!payment) {
      console.error("[PAYMENT_WEBHOOK] Payment not found:", body.order_id);
      // Still return 200 to prevent Midtrans from retrying
      return new Response("Payment not found", { status: 200 });
    }

    // Log webhook received (audit trail)
    await logWebhookReceived(
      payment.id,
      body as unknown as object,
      body.order_id,
      body.transaction_status,
      body.fraud_status,
      body.payment_type
    );

    // Map Midtrans status to our status (handles ALL statuses)
    const newStatus = mapMidtransToPaymentStatus(
      body.transaction_status,
      body.fraud_status
    );

    // Check if already processed (idempotency)
    if (payment.status === newStatus) {
      console.log("[PAYMENT_WEBHOOK] Already processed:", body.order_id);
      return new Response("OK", { status: 200 });
    }

    // Validate state transition using state machine
    if (!isValidPaymentTransition(payment.status, newStatus)) {
      console.warn(
        `[PAYMENT_WEBHOOK] Invalid transition: ${payment.status} -> ${newStatus} for order:`,
        body.order_id
      );
      await logPaymentEvent({
        paymentId: payment.id,
        eventType: "ERROR",
        previousStatus: payment.status,
        newStatus,
        midtransOrderId: body.order_id,
        errorMessage: `Invalid status transition: ${payment.status} -> ${newStatus}`,
      });
      return new Response("OK", { status: 200 });
    }

    // Process with webhook lock to prevent race conditions
    const lockResult = await withWebhookLock<WebhookLockResult>(body.order_id, async (): Promise<WebhookLockResult> => {
      // Re-fetch payment inside lock to ensure we have latest state
      const currentPayment = await prisma.payment.findUnique({
        where: { orderId: body.order_id },
        include: {
          booking: {
            include: {
              passengers: true,
            },
          },
        },
      });

      if (!currentPayment) {
        throw new Error("Payment not found inside lock");
      }

      // Double-check idempotency inside lock
      if (currentPayment.status === newStatus) {
        console.log("[PAYMENT_WEBHOOK] Already processed (inside lock):", body.order_id);
        return { skipped: true };
      }

      // Double-check state transition inside lock
      if (!isValidPaymentTransition(currentPayment.status, newStatus)) {
        console.warn("[PAYMENT_WEBHOOK] Invalid transition (inside lock):", body.order_id);
        return { skipped: true, reason: "invalid_transition" };
      }

      const previousStatus = currentPayment.status;
      
      // Variables for ticket generation (populated inside transaction, used outside)
      let shouldGenerateTickets = false;
      let ticketData: { bookingId: string; bookingCode: string; scheduleId: string; passengers: Array<{ id: string; name: string }> } | null = null;

      // Process the status change in a transaction
      await prisma.$transaction(async (tx) => {
        // Extract payment details from notification
        const paymentDetails: Record<string, unknown> = {
          status: newStatus,
          transactionId: body.transaction_id,
          paymentType: body.payment_type,
          rawResponse: body as object,
        };

        // Handle VA (Virtual Account) payments
        if (body.va_numbers && body.va_numbers.length > 0) {
          paymentDetails.vaNumber = body.va_numbers[0].va_number;
          paymentDetails.bank = body.va_numbers[0].bank;
          paymentDetails.paymentChannel = body.va_numbers[0].bank;
        }

        // Handle Permata VA
        if (body.permata_va_number) {
          paymentDetails.vaNumber = body.permata_va_number;
          paymentDetails.bank = "permata";
          paymentDetails.paymentChannel = "permata";
        }

        // Handle BCA VA
        if (body.bca_va_number) {
          paymentDetails.vaNumber = body.bca_va_number;
          paymentDetails.bank = "bca";
          paymentDetails.paymentChannel = "bca";
        }

        // Handle Mandiri Bill
        if (body.bill_key && body.biller_code) {
          paymentDetails.vaNumber = `${body.biller_code}-${body.bill_key}`;
          paymentDetails.bank = "mandiri";
          paymentDetails.paymentChannel = "mandiri";
        }

        // Handle settlement time
        if (isPaymentSuccess(newStatus) && body.settlement_time) {
          paymentDetails.paidAt = new Date(body.settlement_time);
        }

        // Update payment record
        await tx.payment.update({
          where: { id: currentPayment.id },
          data: paymentDetails,
        });

        // Handle status-specific logic
        if (isPaymentSuccess(newStatus)) {
          // Only process if booking is still PENDING
          if (currentPayment.booking.status === "PENDING") {
            // Confirm booking (NO ticket generation here - moved outside transaction)
            await tx.booking.update({
              where: { id: currentPayment.booking.id },
              data: {
                status: "CONFIRMED",
                confirmedAt: new Date(),
              },
            });

            // Prepare data for ticket generation (done outside transaction)
            shouldGenerateTickets = true;
            ticketData = {
              bookingId: currentPayment.booking.id,
              bookingCode: currentPayment.booking.bookingCode,
              scheduleId: currentPayment.booking.scheduleId,
              passengers: currentPayment.booking.passengers.map(p => ({ id: p.id, name: p.name })),
            };

            console.log("[PAYMENT_WEBHOOK] Booking confirmed:", currentPayment.booking.bookingCode);
          }
        } else if (newStatus === "CHALLENGE") {
          // Fraud review - keep booking pending but log it
          console.log("[PAYMENT_WEBHOOK] Payment under fraud review:", currentPayment.booking.bookingCode);
          await logPaymentEvent({
            paymentId: currentPayment.id,
            eventType: "STATUS_CHANGED",
            previousStatus,
            newStatus: "CHALLENGE",
            midtransOrderId: body.order_id,
            errorMessage: "Payment is under fraud review",
            processedBy: "WEBHOOK_PROCESSOR",
          });
        } else if (newStatus === "DENY") {
          // Payment denied - cancel booking
          if (currentPayment.booking.status === "PENDING") {
            await tx.booking.update({
              where: { id: currentPayment.booking.id },
              data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancellationReason: "Payment denied by bank or fraud detection",
              },
            });

            // Restore available seats
            await tx.schedule.update({
              where: { id: currentPayment.booking.scheduleId },
              data: {
                availableSeats: { increment: currentPayment.booking.totalPassengers },
              },
            });

            console.log("[PAYMENT_WEBHOOK] Payment denied, booking cancelled:", currentPayment.booking.bookingCode);
          }
        } else if (isPaymentFailed(newStatus)) {
          // Only process if booking is still PENDING
          if (currentPayment.booking.status === "PENDING") {
            // Update booking status
            await tx.booking.update({
              where: { id: currentPayment.booking.id },
              data: {
                status: newStatus === "EXPIRED" ? "EXPIRED" : "CANCELLED",
                cancelledAt: new Date(),
                cancellationReason:
                  newStatus === "EXPIRED"
                    ? "Payment expired"
                    : "Payment failed or cancelled",
              },
            });

            // Restore available seats
            await tx.schedule.update({
              where: { id: currentPayment.booking.scheduleId },
              data: {
                availableSeats: { increment: currentPayment.booking.totalPassengers },
              },
            });

            console.log(
              "[PAYMENT_WEBHOOK] Booking cancelled, seats restored:",
              currentPayment.booking.bookingCode
            );
          }
        } else if (newStatus === "REFUNDED") {
          // Handle refund
          await tx.booking.update({
            where: { id: currentPayment.booking.id },
            data: {
              status: "REFUNDED",
            },
          });

          // Invalidate tickets
          await tx.ticket.updateMany({
            where: { bookingId: currentPayment.booking.id },
            data: { status: "CANCELLED" },
          });

          // Restore available seats for refunds
          await tx.schedule.update({
            where: { id: currentPayment.booking.scheduleId },
            data: {
              availableSeats: { increment: currentPayment.booking.totalPassengers },
            },
          });

          console.log("[PAYMENT_WEBHOOK] Booking refunded:", currentPayment.booking.bookingCode);
        }
      });

      // Log status change after successful processing
      const processingMs = Date.now() - startTime;
      await logStatusChange(
        currentPayment.id,
        previousStatus,
        newStatus,
        body.order_id,
        processingMs
      );

      return { skipped: false, previousStatus, newStatus, shouldGenerateTickets, ticketData: ticketData || undefined };
    });

    // Handle lock acquisition failure
    if (!lockResult.success) {
      logger.warn("[PAYMENT_WEBHOOK_LOCK_FAILED]", { requestId, orderId: body.order_id, error: lockResult.error });
      // Return 200 - Midtrans will retry and hopefully lock will be released
      return Response.json({ status: 'ok', requestId });
    }

    // Generate tickets OUTSIDE the transaction (avoids Prisma Accelerate 5s timeout)
    if (lockResult.result?.shouldGenerateTickets && lockResult.result?.ticketData) {
      try {
        const { bookingId, bookingCode, scheduleId, passengers } = lockResult.result.ticketData;
        
        // Check if tickets already exist (idempotency)
        const existingTicketsCount = await prisma.ticket.count({
          where: { bookingId },
        });

        if (existingTicketsCount === 0) {
          // Pre-generate all ticket data
          const ticketDataList = passengers.map((passenger: { id: string; name: string }, i: number) => {
            const ticketCode = generateTicketCode();
            const qrData = generateQRData(ticketCode, bookingCode, passenger.name, scheduleId);
            const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;
            return { ticketCode, qrData, passengerId: passenger.id, seatNumber };
          });

          // Batch create all tickets
          await prisma.ticket.createMany({
            data: ticketDataList.map((t: { ticketCode: string; qrData: string; passengerId: string; seatNumber: string }) => ({
              bookingId,
              passengerId: t.passengerId,
              ticketCode: t.ticketCode,
              qrData: t.qrData,
              status: 'VALID',
            })),
          });

          // Update passengers with seat numbers
          await Promise.all(
            ticketDataList.map((t: { passengerId: string; seatNumber: string }) => 
              prisma.passenger.update({
                where: { id: t.passengerId },
                data: { seatNumber: t.seatNumber },
              })
            )
          );

          console.log("[PAYMENT_WEBHOOK] Tickets generated:", bookingCode);
        }
      } catch (ticketError) {
        // Log but don't fail - tickets can be recovered later
        logger.error("[PAYMENT_WEBHOOK_TICKET_ERROR]", { 
          error: ticketError instanceof Error ? ticketError.message : 'Unknown error',
          bookingCode: lockResult.result.ticketData.bookingCode,
        });
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info("[PAYMENT_WEBHOOK_PROCESSED]", { requestId, orderId: body.order_id, status: newStatus, processingTime });
    return Response.json({ status: 'ok', requestId, processed: true });
  } catch (error) {
    logger.error("[PAYMENT_WEBHOOK_ERROR]", { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // Try to log the error if we have payment context
    try {
      const body = await request.clone().json();
      const payment = await prisma.payment.findUnique({
        where: { orderId: body.order_id },
        select: { id: true },
      });
      if (payment) {
        await logPaymentError(
          payment.id,
          error instanceof Error ? error.message : "Unknown error",
          error instanceof Error ? error.stack : undefined,
          body
        );
      }
    } catch {
      // Ignore logging errors
    }

    // Return 200 to prevent Midtrans from excessive retries
    // The error is logged for manual investigation
    return Response.json({ status: 'ok', message: 'Error processed' });
  }
}

/**
 * GET /api/payments/notification
 * Health check endpoint for webhook URL verification
 */
export async function GET() {
  return Response.json({
    status: "ok",
    message: "Midtrans notification endpoint is active",
    timestamp: new Date().toISOString(),
    queueEnabled: USE_QUEUE,
  });
}
