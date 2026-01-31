// src/lib/jobs/cleanup-idempotency.ts
// Job to clean up expired idempotency records

import { prisma } from '../prisma';
import { logger } from '../logger';

/**
 * Clean up expired idempotency records
 * Should be run periodically (e.g., every hour)
 */
export async function cleanupExpiredIdempotencyRecords(): Promise<number> {
  const now = new Date();
  
  try {
    const result = await prisma.idempotencyRecord.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    if (result.count > 0) {
      logger.info('[CLEANUP_IDEMPOTENCY] Deleted expired records', {
        count: result.count,
        timestamp: now.toISOString(),
      });
    }

    return result.count;
  } catch (error) {
    logger.error('[CLEANUP_IDEMPOTENCY] Error cleaning up records', { error });
    throw error;
  }
}

/**
 * Clean up old webhook audit logs (older than 30 days)
 */
export async function cleanupOldWebhookAudits(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  try {
    const result = await prisma.webhookAudit.deleteMany({
      where: {
        processedAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info('[CLEANUP_WEBHOOK_AUDITS] Deleted old records', {
        count: result.count,
        daysOld,
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    return result.count;
  } catch (error) {
    logger.error('[CLEANUP_WEBHOOK_AUDITS] Error cleaning up records', { error });
    throw error;
  }
}

/**
 * Clean up old login attempts (older than 90 days)
 */
export async function cleanupOldLoginAttempts(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  try {
    const result = await prisma.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info('[CLEANUP_LOGIN_ATTEMPTS] Deleted old records', {
        count: result.count,
        daysOld,
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    return result.count;
  } catch (error) {
    logger.error('[CLEANUP_LOGIN_ATTEMPTS] Error cleaning up records', { error });
    throw error;
  }
}
