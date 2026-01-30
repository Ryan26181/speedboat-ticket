import { prisma } from './prisma';
import { logger } from './logger';
import { getTransactionStatus } from './midtrans';
import { getStatusMapping, isValidPaymentStatusTransition, isValidBookingStatusTransition } from './webhook-status-handlers';
import { generateTicketCode, generateQRData } from './booking-utils';
import { format } from 'date-fns';
import { PaymentStatus, BookingStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

interface ResyncResult {
  success: boolean;
  error?: string;
  previousStatus?: string;
  newStatus?: string;
  midtransStatus?: string;
  bookingId?: string;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// ============================================
// RESYNC BOOKING STATUS
// ============================================

/**
 * Resync booking status from Midtrans
 * Used when webhook might have been missed
 */
export async function resyncBookingStatus(bookingCode: string): Promise<ResyncResult> {
  try {
    // 1. Find booking with payment
    const booking = await prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        payment: true,
        passengers: true,
        schedule: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (!booking.payment) {
      return { success: false, error: 'No payment found for booking' };
    }

    const { payment } = booking;
    const previousStatus = payment.status;

    // 2. Get current status from Midtrans
    let midtransStatus;
    try {
      midtransStatus = await getTransactionStatus(payment.orderId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[RESYNC_MIDTRANS_ERROR]', { bookingCode, error: errorMessage });
      return { success: false, error: `Failed to get Midtrans status: ${errorMessage}` };
    }

    // 3. Map status
    const statusMapping = getStatusMapping(
      midtransStatus.transaction_status,
      midtransStatus.fraud_status,
      midtransStatus.payment_type
    );

    // 4. Check if update needed
    if (payment.status === statusMapping.paymentStatus && booking.status === statusMapping.bookingStatus) {
      return {
        success: true,
        previousStatus: payment.status,
        newStatus: payment.status,
        midtransStatus: midtransStatus.transaction_status,
        bookingId: booking.id,
      };
    }

    // 5. Validate transitions
    if (!isValidPaymentStatusTransition(payment.status, statusMapping.paymentStatus)) {
      logger.warn('[RESYNC_INVALID_PAYMENT_TRANSITION]', {
        bookingCode,
        from: payment.status,
        to: statusMapping.paymentStatus,
      });
    }

    if (!isValidBookingStatusTransition(booking.status, statusMapping.bookingStatus)) {
      logger.warn('[RESYNC_INVALID_BOOKING_TRANSITION]', {
        bookingCode,
        from: booking.status,
        to: statusMapping.bookingStatus,
      });
    }

    // 6. Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: statusMapping.paymentStatus,
          paymentType: midtransStatus.payment_type,
          paidAt: statusMapping.paymentStatus === 'SUCCESS' ? new Date() : payment.paidAt,
        },
      });

      // Update booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: statusMapping.bookingStatus,
          confirmedAt: statusMapping.bookingStatus === 'CONFIRMED' ? new Date() : booking.confirmedAt,
        },
      });

      // Generate tickets if needed - OPTIMIZED with batch operations
      if (statusMapping.shouldGenerateTickets && booking.passengers.length > 0) {
        const existingTickets = await tx.ticket.findMany({
          where: { passengerId: { in: booking.passengers.map(p => p.id) } },
        });

        if (existingTickets.length === 0) {
          // Pre-generate all ticket data without DB calls
          const ticketDataList = booking.passengers.map(passenger => ({
            bookingId: booking.id,
            passengerId: passenger.id,
            ticketCode: generateTicketCode(),
            qrData: generateQRData(
              booking.bookingCode,
              generateTicketCode(),
              passenger.name,
              booking.schedule.departureTime.toISOString()
            ),
            status: 'VALID' as const,
          }));

          // Batch create all tickets in ONE operation
          await tx.ticket.createMany({
            data: ticketDataList,
          });
        }
      }

      // Release seats if needed
      if (statusMapping.shouldReleaseSeats) {
        await tx.schedule.update({
          where: { id: booking.scheduleId },
          data: {
            availableSeats: {
              increment: booking.totalPassengers,
            },
          },
        });
      }

      // Create audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'MANUAL_RESYNC',
          previousStatus: previousStatus,
          newStatus: statusMapping.paymentStatus,
          metadata: {
            source: 'manual_resync',
            midtransStatus: midtransStatus.transaction_status,
            fraudStatus: midtransStatus.fraud_status,
          },
        },
      });
    });

    logger.info('[RESYNC_SUCCESS]', {
      bookingCode,
      previousStatus,
      newStatus: statusMapping.paymentStatus,
      midtransStatus: midtransStatus.transaction_status,
    });

    return {
      success: true,
      previousStatus,
      newStatus: statusMapping.paymentStatus,
      midtransStatus: midtransStatus.transaction_status,
      bookingId: booking.id,
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[RESYNC_ERROR]', { bookingCode, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// ============================================
// RETRY MECHANISM
// ============================================

/**
 * Retry a failed webhook with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        config.maxDelayMs
      );

      logger.warn('[RETRY_ATTEMPT]', {
        attempt,
        maxAttempts: config.maxAttempts,
        delayMs: delay,
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// BATCH RESYNC
// ============================================

/**
 * Resync multiple bookings (admin batch operation)
 */
export async function batchResyncBookings(
  bookingCodes: string[],
  options: { concurrency?: number } = {}
): Promise<Map<string, ResyncResult>> {
  const { concurrency = 3 } = options;
  const results = new Map<string, ResyncResult>();

  // Process in batches to avoid overwhelming Midtrans API
  for (let i = 0; i < bookingCodes.length; i += concurrency) {
    const batch = bookingCodes.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async (code) => {
        const result = await resyncBookingStatus(code);
        return { code, result };
      })
    );

    for (const { code, result } of batchResults) {
      results.set(code, result);
    }

    // Small delay between batches
    if (i + concurrency < bookingCodes.length) {
      await sleep(500);
    }
  }

  return results;
}

// ============================================
// FIND STUCK PAYMENTS
// ============================================

/**
 * Find payments that may need resync
 * (PENDING for too long, or status mismatch)
 */
export async function findStuckPayments(options: {
  pendingMinutes?: number;
  limit?: number;
} = {}): Promise<Array<{ bookingCode: string; status: PaymentStatus; createdAt: Date }>> {
  const { pendingMinutes = 30, limit = 100 } = options;

  const cutoffTime = new Date(Date.now() - pendingMinutes * 60 * 1000);

  const stuckPayments = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      createdAt: {
        lt: cutoffTime,
      },
    },
    include: {
      booking: {
        select: {
          bookingCode: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });

  return stuckPayments.map(p => ({
    bookingCode: p.booking.bookingCode,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export type { ResyncResult, RetryConfig };
