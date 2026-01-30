import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './connection';
import { PAYMENT_QUEUES, WebhookJobData, EmailJobData, AnalyticsJobData } from './payment-queue';
import { processNotificationSafe } from '../payment-service';
import { logger } from '../logger';

// ============================================
// WEBHOOK WORKER
// ============================================

export function createWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    PAYMENT_QUEUES.WEBHOOK_PROCESSING,
    async (job: Job<WebhookJobData>) => {
      const { payload, requestId } = job.data;

      logger.info('[WORKER_PROCESSING]', {
        jobId: job.id,
        requestId,
        orderId: payload.order_id,
        attempt: job.attemptsMade + 1,
      });

      // Cast payload to the expected type for processNotificationSafe
      const webhookPayload = payload as {
        order_id: string;
        status_code: string;
        gross_amount: string;
        signature_key: string;
        transaction_status: string;
        fraud_status?: string;
        payment_type: string;
        transaction_id: string;
        transaction_time?: string;
      };

      const result = await processNotificationSafe(webhookPayload);

      if (!result.success && !result.skipped) {
        throw new Error(result.error || 'Processing failed');
      }

      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: 5, // Process 5 jobs concurrently
      limiter: {
        max: 100,      // Max 100 jobs
        duration: 1000, // Per second
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info('[WORKER_COMPLETED]', {
      jobId: job.id,
      orderId: job.data.payload.order_id,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error('[WORKER_FAILED]', {
      jobId: job?.id,
      orderId: job?.data.payload.order_id,
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });

  return worker;
}

// ============================================
// EMAIL WORKER
// ============================================

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    PAYMENT_QUEUES.EMAIL_NOTIFICATION,
    async (job: Job<EmailJobData>) => {
      const { to, template, data } = job.data;

      logger.info('[EMAIL_WORKER_PROCESSING]', {
        jobId: job.id,
        to,
        template,
      });

      // TODO: Implement email sending when email service is available
      // For now, just log the email details
      logger.info('[EMAIL_WOULD_SEND]', { to, template, data });

      return { sent: true };
    },
    {
      connection: getRedisConnection(),
      concurrency: 10,
    }
  );

  return worker;
}

// ============================================
// ANALYTICS WORKER
// ============================================

export function createAnalyticsWorker(): Worker<AnalyticsJobData> {
  const worker = new Worker<AnalyticsJobData>(
    PAYMENT_QUEUES.ANALYTICS,
    async (job: Job<AnalyticsJobData>) => {
      const { event, data, timestamp } = job.data;

      // Send to analytics service
      // e.g., Mixpanel, Amplitude, internal analytics
      logger.debug('[ANALYTICS_TRACKED]', { event, data, timestamp });

      return { tracked: true };
    },
    {
      connection: getRedisConnection(),
      concurrency: 20,
    }
  );

  return worker;
}

// ============================================
// START ALL WORKERS
// ============================================

let workers: Worker[] = [];

export function startWorkers(): void {
  workers = [
    createWebhookWorker(),
    createEmailWorker(),
    createAnalyticsWorker(),
  ];

  logger.info('[WORKERS_STARTED]', { 
    count: workers.length,
    queues: Object.values(PAYMENT_QUEUES),
  });
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map(w => w.close()));
  workers = [];
  logger.info('[WORKERS_STOPPED]');
}
