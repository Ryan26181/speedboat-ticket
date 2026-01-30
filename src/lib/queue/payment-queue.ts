import { Queue, Job } from 'bullmq';
import { getRedisConnection } from './connection';

// ============================================
// QUEUE NAMES (no colons - BullMQ restriction)
// ============================================

export const PAYMENT_QUEUES = {
  WEBHOOK_PROCESSING: 'payment-webhook',
  EMAIL_NOTIFICATION: 'payment-email',
  SMS_NOTIFICATION: 'payment-sms',
  ANALYTICS: 'payment-analytics',
  CLEANUP: 'payment-cleanup',
} as const;

// ============================================
// LAZY QUEUE INITIALIZATION
// Queues are only created when first accessed
// ============================================

let _webhookQueue: Queue<WebhookJobData> | null = null;
let _emailQueue: Queue<EmailJobData> | null = null;
let _analyticsQueue: Queue<AnalyticsJobData> | null = null;

function getWebhookQueue(): Queue<WebhookJobData> {
  if (!_webhookQueue) {
    _webhookQueue = new Queue<WebhookJobData>(
      PAYMENT_QUEUES.WEBHOOK_PROCESSING,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      }
    );
  }
  return _webhookQueue;
}

function getEmailQueue(): Queue<EmailJobData> {
  if (!_emailQueue) {
    _emailQueue = new Queue<EmailJobData>(
      PAYMENT_QUEUES.EMAIL_NOTIFICATION,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }
    );
  }
  return _emailQueue;
}

function getAnalyticsQueue(): Queue<AnalyticsJobData> {
  if (!_analyticsQueue) {
    _analyticsQueue = new Queue<AnalyticsJobData>(
      PAYMENT_QUEUES.ANALYTICS,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 2,
          removeOnComplete: true,
        },
      }
    );
  }
  return _analyticsQueue;
}

// Export getters for compatibility
export const webhookQueue = { get: getWebhookQueue };
export const emailQueue = { get: getEmailQueue };
export const analyticsQueue = { get: getAnalyticsQueue };

// ============================================
// WEBHOOK PROCESSING QUEUE
// ============================================

interface WebhookJobData {
  payload: Record<string, unknown>;
  receivedAt: string;
  requestId: string;
}

// Add job to queue
export async function enqueueWebhook(
  payload: Record<string, unknown>, 
  requestId: string
): Promise<Job<WebhookJobData>> {
  const queue = getWebhookQueue();
  return queue.add(
    'process-webhook',
    {
      payload,
      receivedAt: new Date().toISOString(),
      requestId,
    },
    {
      jobId: `${payload.order_id}-${payload.transaction_id}-${Date.now()}`,
      priority: getPriority(payload),
    }
  );
}

function getPriority(payload: Record<string, unknown>): number {
  const status = payload.transaction_status as string;
  if (['settlement', 'capture'].includes(status)) {
    return 1;
  }
  if (['expire', 'cancel'].includes(status)) {
    return 2;
  }
  return 3;
}

// ============================================
// EMAIL NOTIFICATION QUEUE
// ============================================

interface EmailJobData {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export async function enqueueEmail(
  to: string,
  template: string,
  data: Record<string, unknown>
): Promise<Job<EmailJobData>> {
  const queue = getEmailQueue();
  return queue.add('send-email', { to, template, data });
}

// ============================================
// ANALYTICS QUEUE
// ============================================

interface AnalyticsJobData {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function enqueueAnalytics(
  event: string,
  data: Record<string, unknown>
): Promise<Job<AnalyticsJobData>> {
  const queue = getAnalyticsQueue();
  return queue.add('track', {
    event,
    data,
    timestamp: new Date().toISOString(),
  });
}

export type { WebhookJobData, EmailJobData, AnalyticsJobData };
