import { prisma } from '../prisma';
import { metrics, PAYMENT_METRICS } from '../metrics';
import { 
  checkFailedPaymentsAlert, 
  checkStuckPaymentsAlert,
  checkQueueSizeAlert,
  checkErrorRateAlert,
} from '../alerts';
import { webhookQueue } from '../queue/payment-queue';
import { logger } from '../logger';

/**
 * Run monitoring checks
 * Schedule: Every 5 minutes
 */
export async function runMonitoringChecks(): Promise<void> {
  const startTime = Date.now();
  logger.info('[MONITORING_JOB_START]');

  try {
    // 1. Check failed payments in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const failedCount = await prisma.payment.count({
      where: {
        status: 'FAILED',
        updatedAt: { gte: oneHourAgo },
      },
    });
    await checkFailedPaymentsAlert(failedCount);

    // 2. Check stuck payments
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckCount = await prisma.payment.count({
      where: {
        status: 'PENDING',
        createdAt: { lt: thirtyMinutesAgo },
        lastWebhookAt: null,
        midtransToken: { not: null },
      },
    });
    await checkStuckPaymentsAlert(stuckCount);

    // 3. Update pending payments gauge
    const pendingCount = await prisma.payment.count({
      where: { status: 'PENDING' },
    });
    await metrics.setGauge(PAYMENT_METRICS.PENDING_PAYMENTS, pendingCount);

    // 4. Check queue sizes
    try {
      const queue = webhookQueue.get();
      const webhookQueueSize = await queue.getWaitingCount();
      await metrics.setGauge(
        PAYMENT_METRICS.QUEUE_SIZE, 
        webhookQueueSize,
        { queue_name: 'webhook' }
      );
      await checkQueueSizeAlert('webhook', webhookQueueSize);
    } catch (queueError) {
      logger.warn('[MONITORING_QUEUE_CHECK_FAILED]', { 
        error: queueError instanceof Error ? queueError.message : 'Unknown error' 
      });
    }

    // 5. Check error rate
    const totalPaymentsLastHour = await prisma.payment.count({
      where: { createdAt: { gte: oneHourAgo } },
    });
    const errorCount = await prisma.payment.count({
      where: {
        status: { in: ['FAILED', 'EXPIRED', 'CANCELLED'] },
        createdAt: { gte: oneHourAgo },
      },
    });
    await checkErrorRateAlert(errorCount, totalPaymentsLastHour);

    // 6. Get success rate for metrics
    const successCount = await prisma.payment.count({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: oneHourAgo },
      },
    });

    const duration = Date.now() - startTime;
    logger.info('[MONITORING_JOB_COMPLETE]', { 
      duration,
      checks: {
        failedPayments: failedCount,
        stuckPayments: stuckCount,
        pendingPayments: pendingCount,
        totalLastHour: totalPaymentsLastHour,
        successLastHour: successCount,
        errorLastHour: errorCount,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[MONITORING_JOB_ERROR]', { error: errorMessage });
  }
}

/**
 * Run daily summary report
 * Schedule: Once per day at midnight
 */
export async function runDailySummary(): Promise<void> {
  const startTime = Date.now();
  logger.info('[DAILY_SUMMARY_JOB_START]');

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get yesterday's stats
    const [total, success, failed, expired, revenue] = await Promise.all([
      prisma.payment.count({
        where: { createdAt: { gte: yesterday, lt: today } },
      }),
      prisma.payment.count({
        where: { 
          status: 'SUCCESS',
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.payment.count({
        where: { 
          status: 'FAILED',
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.payment.count({
        where: { 
          status: 'EXPIRED',
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.payment.aggregate({
        where: { 
          status: 'SUCCESS',
          createdAt: { gte: yesterday, lt: today },
        },
        _sum: { amount: true },
      }),
    ]);

    const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : '0';
    const totalRevenue = revenue._sum.amount || 0;

    logger.info('[DAILY_SUMMARY]', {
      date: yesterday.toISOString().split('T')[0],
      total,
      success,
      failed,
      expired,
      successRate: `${successRate}%`,
      revenue: totalRevenue,
    });

    const duration = Date.now() - startTime;
    logger.info('[DAILY_SUMMARY_JOB_COMPLETE]', { duration });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[DAILY_SUMMARY_JOB_ERROR]', { error: errorMessage });
  }
}

/**
 * Clean up old data
 * Schedule: Once per week
 */
export async function runCleanupJob(): Promise<void> {
  const startTime = Date.now();
  logger.info('[CLEANUP_JOB_START]');

  try {
    // Delete payment logs older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const deletedLogs = await prisma.paymentLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });

    // Delete old audit logs (keep 180 days)
    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    
    const deletedAuditLogs = await prisma.paymentAuditLog.deleteMany({
      where: { processedAt: { lt: oneEightyDaysAgo } },
    });

    // Delete expired webhook locks
    const deletedLocks = await prisma.webhookLock.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // Delete expired idempotency records
    const deletedIdempotency = await prisma.idempotencyRecord.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const duration = Date.now() - startTime;
    logger.info('[CLEANUP_JOB_COMPLETE]', { 
      duration,
      deleted: {
        paymentLogs: deletedLogs.count,
        auditLogs: deletedAuditLogs.count,
        webhookLocks: deletedLocks.count,
        idempotencyRecords: deletedIdempotency.count,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[CLEANUP_JOB_ERROR]', { error: errorMessage });
  }
}
