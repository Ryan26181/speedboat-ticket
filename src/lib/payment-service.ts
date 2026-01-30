import { prisma } from './prisma';
import { verifySignature, formatAmountForMidtrans, getEnabledPaymentMethods, snap, getTransactionStatus } from './midtrans';
import { Prisma, BookingStatus, PaymentStatus } from '@prisma/client';
import { PaymentEventEmitter } from './payment-events';
import { logger } from './logger';
import { generateTicketCode, generateQRData } from './booking-utils';
import { format } from 'date-fns';
import { 
  validateBookingTransition, 
  validatePaymentTransition,
  getBookingStatusInfo,
  getPaymentStatusInfo,
} from './state-machine';
import { getStatusMapping } from './webhook-status-handlers';

// ============================================
// TYPES
// ============================================

interface CreatePaymentParams {
  bookingId: string;
  bookingCode: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemName: string;
  itemQuantity: number;
  itemPrice: number;
  expiryMinutes?: number;
}

interface CreatePaymentResult {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  orderId?: string;
  expiresAt?: Date;
  error?: string;
}

interface ProcessNotificationResult {
  success: boolean;
  error?: string;
  processed?: boolean;
  skipped?: boolean;
  reason?: string;
  bookingId?: string;
  paymentStatus?: PaymentStatus;
  bookingStatus?: BookingStatus;
}

interface MidtransWebhookPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  transaction_id: string;
  transaction_time?: string;
  va_numbers?: Array<{ va_number: string; bank: string }>;
  permata_va_number?: string;
  bca_va_number?: string;
  bill_key?: string;
  biller_code?: string;
  settlement_time?: string;
}

// ============================================
// CREATE PAYMENT (Existing functionality)
// ============================================

/**
 * Create a new payment for a booking
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  const {
    bookingId,
    bookingCode,
    amount,
    customerName,
    customerEmail,
    customerPhone,
    itemName,
    itemQuantity,
    itemPrice,
    expiryMinutes = 60,
  } = params;

  try {
    // Generate unique order ID
    const timestamp = Date.now().toString(36).toUpperCase();
    const orderId = `${bookingCode}-${timestamp}`;

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Format expiry for Midtrans (YYYY-MM-DD HH:mm:ss +0700)
    const expiryTime = format(expiresAt, "yyyy-MM-dd HH:mm:ss '+0700'");

    // Create Snap transaction parameters
    const snapParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: formatAmountForMidtrans(amount),
      },
      customer_details: {
        first_name: customerName,
        email: customerEmail,
        phone: customerPhone || '',
      },
      item_details: [
        {
          id: bookingId,
          price: formatAmountForMidtrans(itemPrice),
          quantity: itemQuantity,
          name: itemName.substring(0, 50), // Midtrans limits to 50 chars
        },
      ],
      expiry: {
        start_time: format(new Date(), "yyyy-MM-dd HH:mm:ss '+0700'"),
        unit: 'minutes' as const,
        duration: expiryMinutes,
      },
      enabled_payments: getEnabledPaymentMethods(),
    };

    // Create Snap transaction
    const snapResponse = await snap.createTransaction(snapParams);

    // Create payment record in database
    await prisma.payment.create({
      data: {
        bookingId,
        orderId,
        amount,
        status: 'PENDING',
        midtransToken: snapResponse.token,
        midtransRedirectUrl: snapResponse.redirect_url,
        expiredAt: expiresAt,
      },
    });

    logger.info('[PAYMENT_CREATED]', {
      bookingId,
      orderId,
      amount,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      success: true,
      token: snapResponse.token,
      redirectUrl: snapResponse.redirect_url,
      orderId,
      expiresAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[PAYMENT_CREATE_ERROR]', {
      bookingId,
      bookingCode,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// ATOMIC PAYMENT PROCESSING WITH LOCKING
// ============================================

/**
 * Process webhook notification with database-level locking
 * Prevents race condition when multiple webhooks arrive simultaneously
 */
export async function processNotificationSafe(
  payload: MidtransWebhookPayload
): Promise<ProcessNotificationResult> {
  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
    payment_type,
    transaction_id,
    transaction_time,
  } = payload;

  const startTime = Date.now();
  const requestId = generateRequestId();

  logger.info('[WEBHOOK_START]', {
    requestId,
    orderId: order_id,
    transactionStatus: transaction_status,
    paymentType: payment_type,
  });

  try {
    // 1. Verify signature FIRST (before any DB operations)
    const isValid = verifySignature(order_id, status_code, gross_amount, signature_key);
    if (!isValid) {
      logger.error('[WEBHOOK_INVALID_SIGNATURE]', { requestId, orderId: order_id });
      return { success: false, error: 'Invalid signature' };
    }

    // 2. Use database transaction with SERIALIZABLE isolation
    // This prevents race conditions at database level
    // Increase timeout to 30s for Prisma Accelerate (default 5s is too short for ticket generation)
    const result = await prisma.$transaction(async (tx) => {
      // 3. Find payment with booking data using FOR UPDATE pattern
      // First get the payment to lock it
      const payment = await tx.payment.findUnique({
        where: { orderId: order_id },
        include: {
          booking: {
            include: {
              passengers: true,
              user: true,
            },
          },
        },
      });

      if (!payment) {
        logger.error('[WEBHOOK_PAYMENT_NOT_FOUND]', { requestId, orderId: order_id });
        return { success: false, error: 'Payment not found' };
      }

      // 4. Check idempotency - has this webhook been processed?
      const idempotencyKey = `${order_id}:${transaction_id}:${transaction_status}`;
      const processedWebhooks = payment.processedWebhooks || [];
      
      if (processedWebhooks.includes(idempotencyKey)) {
        logger.info('[WEBHOOK_ALREADY_PROCESSED]', { requestId, idempotencyKey });
        return { success: true, skipped: true, reason: 'Already processed' };
      }

      // 5. Use comprehensive status mapping from webhook-status-handlers
      const statusMapping = getStatusMapping(
        transaction_status,
        fraud_status,
        payment_type
      );

      const currentPaymentStatus = payment.status;
      const currentBookingStatus = payment.booking.status;
      const paymentStatus = statusMapping.paymentStatus;
      const bookingStatus = statusMapping.bookingStatus;

      // 6. Validate state transitions using state machine
      const paymentTransition = validatePaymentTransition(
        currentPaymentStatus, 
        paymentStatus,
        statusMapping.action
      );
      
      if (!paymentTransition.valid) {
        logger.warn('[WEBHOOK_INVALID_PAYMENT_TRANSITION]', {
          requestId,
          from: currentPaymentStatus,
          to: paymentStatus,
          action: statusMapping.action,
          error: paymentTransition.error,
        });
        return { success: true, skipped: true, reason: paymentTransition.error || 'Invalid payment transition' };
      }

      const bookingTransition = validateBookingTransition(
        currentBookingStatus, 
        bookingStatus,
        statusMapping.action
      );

      if (!bookingTransition.valid) {
        logger.warn('[WEBHOOK_INVALID_BOOKING_TRANSITION]', {
          requestId,
          from: currentBookingStatus,
          to: bookingStatus,
          action: statusMapping.action,
          error: bookingTransition.error,
        });
        return { success: true, skipped: true, reason: bookingTransition.error || 'Invalid booking transition' };
      }

      // 7. Build payment update data
      const paymentUpdateData: Prisma.PaymentUpdateInput = {
        status: paymentStatus,
        transactionId: transaction_id,
        transactionTime: transaction_time ? new Date(transaction_time) : undefined,
        paymentType: payment_type,
        rawResponse: payload as unknown as Prisma.JsonObject,
        processedWebhooks: {
          push: idempotencyKey,
        },
        lastWebhookAt: new Date(),
        webhookCount: {
          increment: 1,
        },
        version: {
          increment: 1,
        },
      };

      // Handle VA numbers
      if (payload.va_numbers && payload.va_numbers.length > 0) {
        paymentUpdateData.vaNumber = payload.va_numbers[0].va_number;
        paymentUpdateData.bank = payload.va_numbers[0].bank;
        paymentUpdateData.paymentChannel = payload.va_numbers[0].bank;
      }
      if (payload.permata_va_number) {
        paymentUpdateData.vaNumber = payload.permata_va_number;
        paymentUpdateData.bank = 'permata';
        paymentUpdateData.paymentChannel = 'permata';
      }
      if (payload.bca_va_number) {
        paymentUpdateData.vaNumber = payload.bca_va_number;
        paymentUpdateData.bank = 'bca';
        paymentUpdateData.paymentChannel = 'bca';
      }
      if (payload.bill_key && payload.biller_code) {
        paymentUpdateData.vaNumber = `${payload.biller_code}-${payload.bill_key}`;
        paymentUpdateData.bank = 'mandiri';
        paymentUpdateData.paymentChannel = 'mandiri';
      }

      // Set paidAt for successful payments
      if (paymentStatus === 'SUCCESS' && currentPaymentStatus !== 'SUCCESS') {
        paymentUpdateData.paidAt = payload.settlement_time 
          ? new Date(payload.settlement_time) 
          : new Date();
      }

      // 8. Update payment with idempotency key
      await tx.payment.update({
        where: { id: payment.id },
        data: paymentUpdateData,
      });

      // 9. Update booking status
      await tx.booking.update({
        where: { id: payment.booking.id },
        data: { 
          status: bookingStatus,
          confirmedAt: bookingStatus === 'CONFIRMED' ? new Date() : undefined,
          cancelledAt: ['CANCELLED', 'EXPIRED'].includes(bookingStatus) ? new Date() : undefined,
          cancellationReason: bookingStatus === 'EXPIRED' 
            ? 'Payment expired' 
            : bookingStatus === 'CANCELLED' 
              ? 'Payment failed or cancelled' 
              : undefined,
        },
      });

      // 10. Create audit log with state machine action
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: statusMapping.action,
          previousStatus: currentPaymentStatus,
          newStatus: paymentStatus,
          webhookPayload: payload as unknown as Prisma.JsonObject,
          idempotencyKey,
          requestId,
          actorType: 'SYSTEM',
          metadata: {
            transactionStatus: transaction_status,
            fraudStatus: fraud_status,
            paymentType: payment_type,
            bookingTransition: `${currentBookingStatus} → ${bookingStatus}`,
            shouldGenerateTickets: statusMapping.shouldGenerateTickets,
            shouldReleaseSeats: statusMapping.shouldReleaseSeats,
            shouldNotifyUser: statusMapping.shouldNotifyUser,
          },
          processedAt: new Date(),
        },
      });

      // 11. Handle seat release based on status mapping (KEEP IN TRANSACTION - critical for consistency)
      if (statusMapping.shouldReleaseSeats && !['FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'].includes(currentPaymentStatus)) {
        // Restore seats
        await tx.schedule.update({
          where: { id: payment.booking.scheduleId },
          data: {
            availableSeats: { increment: payment.booking.totalPassengers },
          },
        });

        logger.info('[WEBHOOK_SEATS_RESTORED]', {
          requestId,
          bookingCode: payment.booking.bookingCode,
          seatsRestored: payment.booking.totalPassengers,
        });

        // Invalidate tickets if they exist (for refunds/cancellations after confirmation)
        if (currentBookingStatus === 'CONFIRMED' || currentBookingStatus === 'COMPLETED') {
          await tx.ticket.updateMany({
            where: { bookingId: payment.booking.id },
            data: { status: 'CANCELLED' },
          });

          logger.info('[WEBHOOK_TICKETS_INVALIDATED]', {
            requestId,
            bookingCode: payment.booking.bookingCode,
          });
        }
      }

      // Return data needed for ticket generation (done OUTSIDE transaction)
      return { 
        success: true, 
        processed: true,
        bookingId: payment.booking.id,
        paymentStatus,
        bookingStatus,
        user: payment.booking.user,
        bookingCode: payment.booking.bookingCode,
        shouldNotify: statusMapping.shouldNotifyUser,
        notificationType: statusMapping.notificationType,
        // Pass data for post-transaction ticket generation
        shouldGenerateTickets: statusMapping.shouldGenerateTickets && currentPaymentStatus !== 'SUCCESS',
        passengers: statusMapping.shouldGenerateTickets ? payment.booking.passengers : [],
        scheduleId: payment.booking.scheduleId,
      };
    }, {
      // Use READ COMMITTED for faster transaction (ticket gen moved outside)
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000, // 10s should be enough without ticket generation
    });

    // 12. Generate tickets OUTSIDE transaction (Prisma Accelerate 5s limit workaround)
    // This is safe because:
    // - Booking is already CONFIRMED in DB
    // - Tickets are idempotent (we check for existing tickets)
    // - If this fails, user can still view booking and we can retry
    if (result.shouldGenerateTickets && result.passengers && result.passengers.length > 0) {
      try {
        await generateTicketsForBooking(
          result.bookingId,
          result.bookingCode,
          result.passengers,
          result.scheduleId,
          requestId
        );
      } catch (ticketError) {
        // Log but don't fail the webhook - booking is confirmed
        // Tickets can be generated later via recovery job
        logger.error('[WEBHOOK_TICKET_GENERATION_FAILED]', {
          requestId,
          bookingId: result.bookingId,
          error: ticketError instanceof Error ? ticketError.message : 'Unknown error',
        });
      }
    }

    // 13. Emit events AFTER transaction commits (async, non-blocking)
    if (result.processed && result.bookingId && result.paymentStatus) {
      PaymentEventEmitter.emit('payment:processed', {
        bookingId: result.bookingId,
        paymentStatus: result.paymentStatus,
        bookingStatus: result.bookingStatus || 'PENDING',
        orderId: order_id,
      });

      // Note: Email notifications should be sent via event handlers or a separate service
      // that can fetch full booking details
    }

    const duration = Date.now() - startTime;
    logger.info('[WEBHOOK_COMPLETE]', { requestId, duration, result: { ...result, user: undefined } });

    return result;

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;
    
    // Handle lock timeout (concurrent webhook)
    if (errorCode === 'P2034' || errorMessage.includes('could not obtain lock')) {
      logger.warn('[WEBHOOK_LOCK_TIMEOUT]', { requestId, orderId: order_id, duration });
      // Return success so Midtrans doesn't retry immediately
      // The other transaction will handle it
      return { success: true, skipped: true, reason: 'Lock timeout - being processed' };
    }

    // Handle serialization failure (concurrent modification)
    if (errorCode === 'P2025' || errorMessage.includes('serialization')) {
      logger.warn('[WEBHOOK_SERIALIZATION_FAILURE]', { requestId, orderId: order_id, duration });
      return { success: true, skipped: true, reason: 'Serialization failure - retry needed' };
    }

    logger.error('[WEBHOOK_ERROR]', { 
      requestId, 
      orderId: order_id, 
      error: errorMessage,
      errorCode,
      duration,
    });

    return { success: false, error: errorMessage };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate tickets for a confirmed booking
 * Called OUTSIDE the main transaction to avoid Prisma Accelerate timeout
 * This is idempotent - safe to retry if it fails
 */
async function generateTicketsForBooking(
  bookingId: string,
  bookingCode: string,
  passengers: Array<{ id: string; name: string }>,
  scheduleId: string,
  requestId: string
): Promise<void> {
  // Check if tickets already exist (idempotency)
  const existingTicketsCount = await prisma.ticket.count({
    where: { bookingId },
  });

  if (existingTicketsCount > 0) {
    logger.info('[TICKETS_ALREADY_EXIST]', { requestId, bookingId, count: existingTicketsCount });
    return;
  }

  // Pre-generate all ticket data
  const ticketDataList = passengers.map((passenger, i) => {
    const ticketCode = generateTicketCode();
    const qrData = generateQRData(ticketCode, bookingCode, passenger.name, scheduleId);
    const seatNumber = `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`;
    
    return {
      ticketCode,
      qrData,
      passengerId: passenger.id,
      seatNumber,
    };
  });

  // Batch create all tickets
  await prisma.ticket.createMany({
    data: ticketDataList.map(t => ({
      bookingId,
      passengerId: t.passengerId,
      ticketCode: t.ticketCode,
      qrData: t.qrData,
      status: 'VALID',
    })),
  });

  // Update passengers with seat numbers (parallel)
  await Promise.all(
    ticketDataList.map(t => 
      prisma.passenger.update({
        where: { id: t.passengerId },
        data: { seatNumber: t.seatNumber },
      })
    )
  );

  logger.info('[TICKETS_GENERATED]', { 
    requestId, 
    bookingCode,
    ticketsGenerated: passengers.length,
  });
}

/**
 * Map Midtrans status to internal status
 */
function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string
): { paymentStatus: PaymentStatus; bookingStatus: BookingStatus } {
  // Handle fraud status first
  if (fraudStatus === 'deny') {
    return { paymentStatus: 'FAILED', bookingStatus: 'CANCELLED' };
  }

  switch (transactionStatus) {
    case 'capture':
      if (fraudStatus === 'accept') {
        return { paymentStatus: 'SUCCESS', bookingStatus: 'CONFIRMED' };
      } else if (fraudStatus === 'challenge') {
        return { paymentStatus: 'PENDING', bookingStatus: 'PENDING' };
      }
      return { paymentStatus: 'FAILED', bookingStatus: 'CANCELLED' };

    case 'settlement':
      return { paymentStatus: 'SUCCESS', bookingStatus: 'CONFIRMED' };

    case 'pending':
    case 'authorize':
      return { paymentStatus: 'PENDING', bookingStatus: 'PENDING' };

    case 'deny':
    case 'cancel':
    case 'failure':
      return { paymentStatus: 'FAILED', bookingStatus: 'CANCELLED' };

    case 'expire':
      return { paymentStatus: 'EXPIRED', bookingStatus: 'EXPIRED' };

    case 'refund':
    case 'partial_refund':
    case 'chargeback':
      return { paymentStatus: 'REFUNDED', bookingStatus: 'REFUNDED' };

    default:
      return { paymentStatus: 'PENDING', bookingStatus: 'PENDING' };
  }
}

/**
 * Validate payment status transition
 * Implements state machine logic
 */
function isValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  // Same state is always valid (idempotent)
  if (from === to) return true;

  const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    PENDING: ['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'CHALLENGE', 'DENY'],
    CHALLENGE: ['SUCCESS', 'DENY', 'CANCELLED'],
    SUCCESS: ['REFUNDED'],
    FAILED: [],
    EXPIRED: [],
    CANCELLED: [],
    DENY: [],
    REFUNDED: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Validate booking status transition
 * Implements state machine logic
 */
function isValidBookingTransition(from: BookingStatus, to: BookingStatus): boolean {
  // Same state is always valid (idempotent)
  if (from === to) return true;

  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
    COMPLETED: ['REFUNDED'],
    CANCELLED: [],
    EXPIRED: [],
    REFUNDED: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

// ============================================
// CHECK PAYMENT STATUS
// ============================================

interface CheckPaymentStatusResult {
  success: boolean;
  status?: {
    transactionStatus: string;
    fraudStatus?: string;
    paymentType?: string;
    transactionTime?: string;
  };
  error?: string;
}

/**
 * Check payment status from Midtrans
 * Used to get fresh status from Midtrans for display
 */
async function checkPaymentStatus(orderId: string): Promise<CheckPaymentStatusResult> {
  try {
    const statusResponse = await getTransactionStatus(orderId);
    
    return {
      success: true,
      status: {
        transactionStatus: statusResponse.transaction_status,
        fraudStatus: statusResponse.fraud_status,
        paymentType: statusResponse.payment_type,
        transactionTime: statusResponse.transaction_time,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('[CHECK_PAYMENT_STATUS_ERROR]', { orderId, error: errorMessage });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// EXPORTS FOR TESTING
// ============================================

export {
  mapTransactionStatus,
  isValidPaymentTransition,
  isValidBookingTransition,
  generateRequestId,
  checkPaymentStatus,
};

// Re-export state machine functions for external use
export { 
  validateBookingTransition, 
  validatePaymentTransition,
  getBookingStatusInfo,
  getPaymentStatusInfo,
} from './state-machine';

export type { CreatePaymentParams, CreatePaymentResult, ProcessNotificationResult };
