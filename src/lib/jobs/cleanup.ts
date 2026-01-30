import { prisma } from '../prisma';
import { logger } from '../logger';

/**
 * Clean up expired idempotency records
 * Run this as a cron job (e.g., every hour)
 * 
 * Example cron setup with Vercel:
 * - Add to vercel.json: { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 * * * *" }] }
 * 
 * Example with node-cron:
 * import cron from 'node-cron';
 * cron.schedule('0 * * * *', cleanupExpiredIdempotencyRecords);
 */
export async function cleanupExpiredIdempotencyRecords() {
  const startTime = Date.now();
  
  try {
    const result = await prisma.idempotencyRecord.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    const duration = Date.now() - startTime;
    logger.info('[CLEANUP_IDEMPOTENCY]', { 
      deletedCount: result.count, 
      duration 
    });

    return { success: true, deletedCount: result.count };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[CLEANUP_IDEMPOTENCY_ERROR]', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Clean up expired webhook locks
 * Run this as a cron job (e.g., every 5 minutes)
 */
export async function cleanupExpiredWebhookLocks() {
  const startTime = Date.now();
  
  try {
    const result = await prisma.webhookLock.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    const duration = Date.now() - startTime;
    logger.info('[CLEANUP_WEBHOOK_LOCKS]', { 
      deletedCount: result.count, 
      duration 
    });

    return { success: true, deletedCount: result.count };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[CLEANUP_WEBHOOK_LOCKS_ERROR]', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Clean up expired bookings and their pending payments
 * Run this as a cron job (e.g., every 15 minutes)
 */
export async function cleanupExpiredBookings() {
  const startTime = Date.now();
  
  try {
    // Find pending bookings that have expired
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      select: {
        id: true,
        totalPassengers: true,
        scheduleId: true,
      },
    });

    if (expiredBookings.length === 0) {
      return { success: true, expiredCount: 0 };
    }

    // Process in transaction
    await prisma.$transaction(async (tx) => {
      for (const booking of expiredBookings) {
        // Update booking status
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'EXPIRED',
            cancelledAt: new Date(),
            cancellationReason: 'Booking expired - payment not completed',
          },
        });

        // Update payment status if exists
        await tx.payment.updateMany({
          where: {
            bookingId: booking.id,
            status: 'PENDING',
          },
          data: {
            status: 'EXPIRED',
          },
        });

        // Restore available seats
        await tx.schedule.update({
          where: { id: booking.scheduleId },
          data: {
            availableSeats: {
              increment: booking.totalPassengers,
            },
          },
        });
      }
    });

    const duration = Date.now() - startTime;
    logger.info('[CLEANUP_EXPIRED_BOOKINGS]', { 
      expiredCount: expiredBookings.length, 
      duration 
    });

    return { success: true, expiredCount: expiredBookings.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[CLEANUP_EXPIRED_BOOKINGS_ERROR]', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Run all cleanup jobs
 * Useful for manual cleanup or testing
 */
export async function runAllCleanupJobs() {
  const results = await Promise.all([
    cleanupExpiredIdempotencyRecords(),
    cleanupExpiredWebhookLocks(),
    cleanupExpiredBookings(),
  ]);

  return {
    idempotency: results[0],
    webhookLocks: results[1],
    bookings: results[2],
  };
}
