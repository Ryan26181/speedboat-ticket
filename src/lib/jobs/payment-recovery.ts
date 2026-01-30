import { prisma } from '../prisma';
import { getTransactionStatus } from '../midtrans';
import { processNotificationSafe } from '../payment-service';
import { logger } from '../logger';
import { withMidtransRetry } from '../retry';
import { midtransCircuitBreaker } from '../circuit-breaker';

// ============================================
// PAYMENT RECOVERY JOB
// ============================================

interface RecoveryResult {
  total: number;
  recovered: number;
  failed: number;
  skipped: number;
  errors: Array<{ bookingCode: string; error: string }>;
}

/**
 * Recover stuck payments by checking Midtrans status
 * Run as scheduled job (e.g., every 15 minutes)
 */
export async function recoverStuckPayments(): Promise<RecoveryResult> {
  const startTime = Date.now();
  const result: RecoveryResult = {
    total: 0,
    recovered: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Find potentially stuck payments
    // Criteria:
    // 1. Status is PENDING
    // 2. Created more than 30 minutes ago
    // 3. No webhook received in last 15 minutes
    // 4. Has a Midtrans token (transaction was initiated)
    const stuckPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        midtransToken: { not: null },
        createdAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        },
        OR: [
          { lastWebhookAt: null },
          {
            lastWebhookAt: {
              lt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
            },
          },
        ],
      },
      include: {
        booking: true,
      },
      take: 100, // Process in batches
    });

    result.total = stuckPayments.length;

    logger.info('[RECOVERY_JOB_START]', { 
      stuckPayments: stuckPayments.length 
    });

    for (const payment of stuckPayments) {
      try {
        // Use circuit breaker and retry for Midtrans calls
        const midtransStatus = await midtransCircuitBreaker.execute(() =>
          withMidtransRetry(() => getTransactionStatus(payment.orderId))
        );

        if (!midtransStatus) {
          result.skipped++;
          continue;
        }

        // If status has changed, process it
        const currentMidtransStatus = midtransStatus.transaction_status;
        
        if (currentMidtransStatus === 'pending') {
          // Still pending in Midtrans, check if expired
          if (payment.expiredAt && payment.expiredAt < new Date()) {
            // Expired - mark as expired
            await prisma.$transaction([
              prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'EXPIRED' },
              }),
              prisma.booking.update({
                where: { id: payment.bookingId },
                data: { 
                  status: 'EXPIRED',
                  cancelledAt: new Date(),
                  cancellationReason: 'Payment expired - recovered by job',
                },
              }),
              prisma.paymentAuditLog.create({
                data: {
                  paymentId: payment.id,
                  action: 'RECOVERY_JOB_EXPIRED',
                  previousStatus: 'PENDING',
                  newStatus: 'EXPIRED',
                  metadata: {
                    expiredAt: payment.expiredAt,
                    recoveredAt: new Date().toISOString(),
                  },
                },
              }),
            ]);
            result.recovered++;
          } else {
            result.skipped++;
          }
        } else {
          // Status changed - process as webhook
          const simulatedPayload = {
            order_id: payment.orderId,
            status_code: midtransStatus.status_code,
            gross_amount: midtransStatus.gross_amount,
            signature_key: 'RECOVERY_JOB', // Special marker
            transaction_status: currentMidtransStatus,
            fraud_status: midtransStatus.fraud_status,
            payment_type: midtransStatus.payment_type,
            transaction_id: midtransStatus.transaction_id,
            transaction_time: midtransStatus.transaction_time,
          };

          const processResult = await processNotificationSafe(simulatedPayload);

          if (processResult.success && processResult.processed) {
            result.recovered++;
            
            // Add recovery audit log
            await prisma.paymentAuditLog.create({
              data: {
                paymentId: payment.id,
                action: 'RECOVERY_JOB_PROCESSED',
                previousStatus: 'PENDING',
                newStatus: processResult.paymentStatus || currentMidtransStatus,
                metadata: {
                  midtransStatus: currentMidtransStatus,
                  recoveredAt: new Date().toISOString(),
                },
              },
            });
          } else if (processResult.skipped) {
            result.skipped++;
          } else {
            result.failed++;
            result.errors.push({
              bookingCode: payment.booking.bookingCode,
              error: processResult.error || 'Unknown error',
            });
          }
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        result.failed++;
        result.errors.push({
          bookingCode: payment.booking.bookingCode,
          error: errorMessage,
        });
        
        // Don't stop on individual errors
        logger.error('[RECOVERY_PAYMENT_ERROR]', {
          bookingCode: payment.booking.bookingCode,
          error: errorMessage,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[RECOVERY_JOB_COMPLETE]', { 
      ...result, 
      duration,
      errorCount: result.errors.length,
    });

    return result;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[RECOVERY_JOB_FATAL]', { error: errorMessage });
    throw error;
  }
}

/**
 * Expire old pending payments
 * Run as scheduled job (e.g., every hour)
 */
export async function expireOldPayments(): Promise<{ expired: number }> {
  const startTime = Date.now();

  try {
    // Find and expire payments past their expiry time
    const expiredPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        expiredAt: {
          lt: new Date(),
        },
      },
      include: {
        booking: true,
      },
      take: 500, // Process in batches
    });

    let expired = 0;

    for (const payment of expiredPayments) {
      try {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'EXPIRED' },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { 
              status: 'EXPIRED',
              cancelledAt: new Date(),
              cancellationReason: 'Payment window expired',
            },
          }),
          // Restore seats
          prisma.schedule.update({
            where: { id: payment.booking.scheduleId },
            data: {
              availableSeats: { increment: payment.booking.totalPassengers },
            },
          }),
          prisma.paymentAuditLog.create({
            data: {
              paymentId: payment.id,
              action: 'PAYMENT_EXPIRED_BY_JOB',
              previousStatus: 'PENDING',
              newStatus: 'EXPIRED',
              metadata: {
                expiredAt: payment.expiredAt,
                processedAt: new Date().toISOString(),
                seatsRestored: payment.booking.totalPassengers,
              },
            },
          }),
        ]);

        expired++;
      } catch (txError: unknown) {
        const errorMessage = txError instanceof Error ? txError.message : 'Unknown error';
        logger.error('[EXPIRE_PAYMENT_ERROR]', {
          paymentId: payment.id,
          error: errorMessage,
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[EXPIRE_JOB_COMPLETE]', { 
      total: expiredPayments.length,
      expired, 
      duration 
    });

    return { expired };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[EXPIRE_JOB_ERROR]', { error: errorMessage });
    throw error;
  }
}

/**
 * Reconcile payments with Midtrans
 * Run as scheduled job (e.g., daily at midnight)
 */
export async function reconcilePayments(date?: Date): Promise<{
  total: number;
  mismatches: number;
  corrected: number;
}> {
  const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  logger.info('[RECONCILE_JOB_START]', { 
    date: startOfDay.toISOString().split('T')[0] 
  });

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { in: ['SUCCESS', 'PENDING'] },
      transactionId: { not: null },
    },
    include: { booking: true },
  });

  let mismatches = 0;
  let corrected = 0;

  for (const payment of payments) {
    try {
      const midtransStatus = await midtransCircuitBreaker.execute(() =>
        withMidtransRetry(() => getTransactionStatus(payment.orderId))
      );

      const midtransPaymentStatus = mapMidtransStatus(midtransStatus.transaction_status);
      
      if (payment.status !== midtransPaymentStatus) {
        mismatches++;
        
        logger.warn('[RECONCILE_MISMATCH]', {
          orderId: payment.orderId,
          localStatus: payment.status,
          midtransStatus: midtransPaymentStatus,
        });

        // Auto-correct if our status is PENDING but Midtrans says SUCCESS
        if (payment.status === 'PENDING' && midtransPaymentStatus === 'SUCCESS') {
          // Trigger recovery process
          await processNotificationSafe({
            order_id: payment.orderId,
            status_code: midtransStatus.status_code,
            gross_amount: midtransStatus.gross_amount,
            signature_key: 'RECONCILE_JOB',
            transaction_status: midtransStatus.transaction_status,
            fraud_status: midtransStatus.fraud_status,
            payment_type: midtransStatus.payment_type,
            transaction_id: midtransStatus.transaction_id,
            transaction_time: midtransStatus.transaction_time,
          });
          corrected++;
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[RECONCILE_ERROR]', {
        orderId: payment.orderId,
        error: errorMessage,
      });
    }
  }

  logger.info('[RECONCILE_JOB_COMPLETE]', {
    total: payments.length,
    mismatches,
    corrected,
  });

  return { total: payments.length, mismatches, corrected };
}

// Helper function to map Midtrans status
function mapMidtransStatus(transactionStatus: string): string {
  const statusMap: Record<string, string> = {
    capture: 'SUCCESS',
    settlement: 'SUCCESS',
    pending: 'PENDING',
    deny: 'FAILED',
    cancel: 'CANCELLED',
    expire: 'EXPIRED',
    failure: 'FAILED',
    refund: 'REFUNDED',
    partial_refund: 'REFUNDED',
  };
  return statusMap[transactionStatus] || 'PENDING';
}

export type { RecoveryResult };
