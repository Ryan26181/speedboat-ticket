import { getRedisConnection } from './queue/connection';
import { logger } from './logger';

// ============================================
// METRICS TYPES
// ============================================

type MetricType = 'counter' | 'gauge' | 'histogram';

interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  labels?: string[];
}

// ============================================
// PAYMENT METRICS DEFINITIONS
// ============================================

export const PAYMENT_METRICS = {
  // Counters
  WEBHOOK_RECEIVED: {
    name: 'payment_webhook_received_total',
    type: 'counter' as MetricType,
    description: 'Total webhooks received',
    labels: ['status', 'payment_type'],
  },
  WEBHOOK_PROCESSED: {
    name: 'payment_webhook_processed_total',
    type: 'counter' as MetricType,
    description: 'Total webhooks successfully processed',
    labels: ['status', 'result'],
  },
  WEBHOOK_FAILED: {
    name: 'payment_webhook_failed_total',
    type: 'counter' as MetricType,
    description: 'Total webhook processing failures',
    labels: ['error_type'],
  },
  PAYMENT_CREATED: {
    name: 'payment_created_total',
    type: 'counter' as MetricType,
    description: 'Total payments created',
    labels: ['payment_type'],
  },
  PAYMENT_COMPLETED: {
    name: 'payment_completed_total',
    type: 'counter' as MetricType,
    description: 'Total payments completed',
    labels: ['payment_type'],
  },
  PAYMENT_FAILED: {
    name: 'payment_failed_total',
    type: 'counter' as MetricType,
    description: 'Total payments failed',
    labels: ['reason'],
  },

  // Gauges
  PENDING_PAYMENTS: {
    name: 'payment_pending_count',
    type: 'gauge' as MetricType,
    description: 'Current number of pending payments',
  },
  QUEUE_SIZE: {
    name: 'payment_queue_size',
    type: 'gauge' as MetricType,
    description: 'Current webhook queue size',
    labels: ['queue_name'],
  },

  // Histograms
  WEBHOOK_PROCESSING_TIME: {
    name: 'payment_webhook_processing_seconds',
    type: 'histogram' as MetricType,
    description: 'Webhook processing time in seconds',
    labels: ['status'],
  },
  PAYMENT_CREATION_TIME: {
    name: 'payment_creation_seconds',
    type: 'histogram' as MetricType,
    description: 'Payment creation time in seconds',
  },
};

// ============================================
// METRICS SERVICE
// ============================================

class MetricsService {
  private prefix = 'metrics:';

  private getRedis() {
    try {
      return getRedisConnection();
    } catch {
      return null;
    }
  }

  /**
   * Increment counter
   */
  async incrementCounter(
    metric: MetricDefinition,
    labels: Record<string, string> = {},
    value: number = 1
  ): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    try {
      const key = this.buildKey(metric.name, labels);
      await redis.incrbyfloat(key, value);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[METRICS_INCREMENT_ERROR]', { 
        metric: metric.name, 
        error: errorMessage 
      });
    }
  }

  /**
   * Set gauge value
   */
  async setGauge(
    metric: MetricDefinition,
    value: number,
    labels: Record<string, string> = {}
  ): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    try {
      const key = this.buildKey(metric.name, labels);
      await redis.set(key, value.toString());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[METRICS_GAUGE_ERROR]', { 
        metric: metric.name, 
        error: errorMessage 
      });
    }
  }

  /**
   * Record histogram value
   */
  async recordHistogram(
    metric: MetricDefinition,
    value: number,
    labels: Record<string, string> = {}
  ): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    try {
      const key = this.buildKey(metric.name, labels);
      const bucket = this.getBucket(value);
      
      // Increment bucket counter
      await redis.hincrby(key, bucket, 1);
      
      // Update sum and count
      await redis.hincrbyfloat(key, 'sum', value);
      await redis.hincrby(key, 'count', 1);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[METRICS_HISTOGRAM_ERROR]', { 
        metric: metric.name, 
        error: errorMessage 
      });
    }
  }

  /**
   * Get all metrics
   */
  async getAllMetrics(): Promise<Record<string, unknown>> {
    const redis = this.getRedis();
    if (!redis) return {};

    try {
      const keys = await redis.keys(`${this.prefix}*`);
      const metrics: Record<string, unknown> = {};

      for (const key of keys) {
        const type = await redis.type(key);
        const metricName = key.replace(this.prefix, '');

        if (type === 'string') {
          metrics[metricName] = await redis.get(key);
        } else if (type === 'hash') {
          metrics[metricName] = await redis.hgetall(key);
        }
      }

      return metrics;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[METRICS_GET_ALL_ERROR]', { error: errorMessage });
      return {};
    }
  }

  /**
   * Reset all metrics (useful for testing)
   */
  async resetAllMetrics(): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    try {
      const keys = await redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[METRICS_RESET_ERROR]', { error: errorMessage });
    }
  }

  private buildKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    return labelStr 
      ? `${this.prefix}${name}{${labelStr}}`
      : `${this.prefix}${name}`;
  }

  private getBucket(value: number): string {
    // Histogram buckets in seconds
    const buckets = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60];
    
    for (const bucket of buckets) {
      if (value <= bucket) {
        return `le_${bucket}`;
      }
    }
    return 'le_inf';
  }
}

export const metrics = new MetricsService();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Record webhook received
 */
export async function recordWebhookReceived(
  status: string,
  paymentType: string
): Promise<void> {
  await metrics.incrementCounter(PAYMENT_METRICS.WEBHOOK_RECEIVED, {
    status,
    payment_type: paymentType,
  });
}

/**
 * Record webhook processed
 */
export async function recordWebhookProcessed(
  status: string,
  result: 'success' | 'skipped' | 'failed',
  durationMs: number
): Promise<void> {
  await metrics.incrementCounter(PAYMENT_METRICS.WEBHOOK_PROCESSED, {
    status,
    result,
  });
  
  await metrics.recordHistogram(
    PAYMENT_METRICS.WEBHOOK_PROCESSING_TIME,
    durationMs / 1000,
    { status }
  );
}

/**
 * Record webhook failed
 */
export async function recordWebhookFailed(errorType: string): Promise<void> {
  await metrics.incrementCounter(PAYMENT_METRICS.WEBHOOK_FAILED, {
    error_type: errorType,
  });
}

/**
 * Record payment created
 */
export async function recordPaymentCreated(paymentType: string): Promise<void> {
  await metrics.incrementCounter(PAYMENT_METRICS.PAYMENT_CREATED, {
    payment_type: paymentType,
  });
}

/**
 * Record payment completed
 */
export async function recordPaymentCompleted(paymentType: string): Promise<void> {
  await metrics.incrementCounter(PAYMENT_METRICS.PAYMENT_COMPLETED, {
    payment_type: paymentType,
  });
}

/**
 * Record payment failed
 */
export async function recordPaymentFailed(reason: string): Promise<void> {
  await metrics.incrementCounter(PAYMENT_METRICS.PAYMENT_FAILED, {
    reason,
  });
}

/**
 * Update pending payments count
 */
export async function updatePendingPaymentsGauge(count: number): Promise<void> {
  await metrics.setGauge(PAYMENT_METRICS.PENDING_PAYMENTS, count);
}

/**
 * Update queue size
 */
export async function updateQueueSizeGauge(queueName: string, size: number): Promise<void> {
  await metrics.setGauge(PAYMENT_METRICS.QUEUE_SIZE, size, { queue_name: queueName });
}

export type { MetricDefinition, MetricType };
