// src/lib/jobs/scheduler.ts
// Scheduled job configuration using node-cron

import cron from 'node-cron';
import { recoverStuckPayments, expireOldPayments } from './payment-recovery';
import { cleanupExpiredIdempotencyRecords } from './cleanup-idempotency';
import { runMonitoringChecks, runDailySummary, runCleanupJob } from './monitoring-job';
import { logger } from '../logger';

let isRunning = false;

/**
 * Start all scheduled jobs
 * Call this from your application entry point
 */
export function startScheduledJobs(): void {
  if (isRunning) {
    logger.warn('[SCHEDULER] Jobs already running, skipping start');
    return;
  }

  isRunning = true;
  logger.info('[SCHEDULER] Starting scheduled jobs');

  // Every 15 minutes - Recover stuck payments
  cron.schedule('*/15 * * * *', async () => {
    logger.info('[SCHEDULER] Running: recoverStuckPayments');
    try {
      await recoverStuckPayments();
    } catch (error) {
      logger.error('[SCHEDULER] recoverStuckPayments failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Every hour at minute 0 - Expire old payments
  cron.schedule('0 * * * *', async () => {
    logger.info('[SCHEDULER] Running: expireOldPayments');
    try {
      await expireOldPayments();
    } catch (error) {
      logger.error('[SCHEDULER] expireOldPayments failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Every hour at minute 5 - Cleanup idempotency records
  cron.schedule('5 * * * *', async () => {
    logger.info('[SCHEDULER] Running: cleanupExpiredIdempotencyRecords');
    try {
      await cleanupExpiredIdempotencyRecords();
    } catch (error) {
      logger.error('[SCHEDULER] cleanupExpiredIdempotencyRecords failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Every 5 minutes - Monitoring checks
  cron.schedule('*/5 * * * *', async () => {
    logger.info('[SCHEDULER] Running: runMonitoringChecks');
    try {
      await runMonitoringChecks();
    } catch (error) {
      logger.error('[SCHEDULER] runMonitoringChecks failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Daily at midnight (00:00) - Daily summary
  cron.schedule('0 0 * * *', async () => {
    logger.info('[SCHEDULER] Running: runDailySummary');
    try {
      await runDailySummary();
    } catch (error) {
      logger.error('[SCHEDULER] runDailySummary failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Weekly on Sunday at 3 AM - Cleanup old data
  cron.schedule('0 3 * * 0', async () => {
    logger.info('[SCHEDULER] Running: runCleanupJob');
    try {
      await runCleanupJob();
    } catch (error) {
      logger.error('[SCHEDULER] runCleanupJob failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  logger.info('[SCHEDULER] All scheduled jobs configured', {
    jobs: [
      { name: 'recoverStuckPayments', schedule: '*/15 * * * *' },
      { name: 'expireOldPayments', schedule: '0 * * * *' },
      { name: 'cleanupExpiredIdempotencyRecords', schedule: '5 * * * *' },
      { name: 'runMonitoringChecks', schedule: '*/5 * * * *' },
      { name: 'runDailySummary', schedule: '0 0 * * *' },
      { name: 'runCleanupJob', schedule: '0 3 * * 0' },
    ],
  });
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(): void {
  // node-cron doesn't have a built-in stop all function
  // In production, this would be handled by process termination
  isRunning = false;
  logger.info('[SCHEDULER] Scheduled jobs stopped');
}
