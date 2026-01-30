import { logger } from './logger';

// ============================================
// ALERT TYPES
// ============================================

type AlertSeverity = 'info' | 'warning' | 'critical';

interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ============================================
// ALERT THRESHOLDS
// ============================================

export const THRESHOLDS = {
  FAILED_PAYMENTS_PER_HOUR: 10,
  WEBHOOK_PROCESSING_TIME_MS: 5000,
  QUEUE_SIZE: 1000,
  ERROR_RATE_PERCENT: 5,
  STUCK_PAYMENTS_COUNT: 20,
};

// ============================================
// ALERT SERVICE
// ============================================

class AlertService {
  /**
   * Send alert to configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    logger.warn('[ALERT]', {
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      ...alert.metadata,
    });

    // Send to different channels based on severity
    switch (alert.severity) {
      case 'critical':
        await this.sendToSlack(alert);
        await this.sendToEmail(alert);
        await this.sendToPagerDuty(alert);
        break;
      case 'warning':
        await this.sendToSlack(alert);
        break;
      case 'info':
        // Just log, no notification
        break;
    }
  }

  /**
   * Send to Slack
   */
  private async sendToSlack(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const color = alert.severity === 'critical' ? '#dc2626' : '#f59e0b';
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color,
            title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
            text: alert.message,
            fields: alert.metadata 
              ? Object.entries(alert.metadata).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                }))
              : [],
            footer: 'Speedboat Payment System',
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });
      
      logger.info('[SLACK_ALERT_SENT]', { title: alert.title });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[SLACK_ALERT_FAILED]', { error: errorMessage });
    }
  }

  /**
   * Send to Email
   */
  private async sendToEmail(alert: Alert): Promise<void> {
    const alertEmail = process.env.ALERT_EMAIL;
    if (!alertEmail) return;

    try {
      // Use your email service
      // await sendEmail(alertEmail, 'payment_alert', alert);
      logger.info('[EMAIL_ALERT_SENT]', { to: alertEmail, title: alert.title });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[EMAIL_ALERT_FAILED]', { error: errorMessage });
    }
  }

  /**
   * Send to PagerDuty
   */
  private async sendToPagerDuty(alert: Alert): Promise<void> {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) return;

    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: routingKey,
          event_action: 'trigger',
          payload: {
            summary: `${alert.title}: ${alert.message}`,
            severity: alert.severity === 'critical' ? 'critical' : 'warning',
            source: 'speedboat-payment',
            custom_details: alert.metadata,
          },
        }),
      });
      
      logger.info('[PAGERDUTY_ALERT_SENT]', { title: alert.title });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[PAGERDUTY_ALERT_FAILED]', { error: errorMessage });
    }
  }
}

export const alertService = new AlertService();

// ============================================
// ALERT TRIGGERS
// ============================================

/**
 * Alert when too many failed payments
 */
export async function checkFailedPaymentsAlert(
  failedCount: number,
  timeWindowMinutes: number = 60
): Promise<void> {
  if (failedCount >= THRESHOLDS.FAILED_PAYMENTS_PER_HOUR) {
    await alertService.sendAlert({
      severity: 'critical',
      title: 'High Payment Failure Rate',
      message: `${failedCount} payments failed in the last ${timeWindowMinutes} minutes`,
      metadata: {
        failedCount,
        threshold: THRESHOLDS.FAILED_PAYMENTS_PER_HOUR,
        timeWindow: `${timeWindowMinutes}m`,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Alert when webhook processing is slow
 */
export async function checkWebhookProcessingAlert(
  processingTimeMs: number,
  orderId: string
): Promise<void> {
  if (processingTimeMs >= THRESHOLDS.WEBHOOK_PROCESSING_TIME_MS) {
    await alertService.sendAlert({
      severity: 'warning',
      title: 'Slow Webhook Processing',
      message: `Webhook took ${processingTimeMs}ms to process`,
      metadata: {
        orderId,
        processingTimeMs,
        threshold: THRESHOLDS.WEBHOOK_PROCESSING_TIME_MS,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Alert when queue size is too large
 */
export async function checkQueueSizeAlert(
  queueName: string,
  size: number
): Promise<void> {
  if (size >= THRESHOLDS.QUEUE_SIZE) {
    await alertService.sendAlert({
      severity: 'warning',
      title: 'Large Queue Size',
      message: `Queue ${queueName} has ${size} pending jobs`,
      metadata: {
        queueName,
        size,
        threshold: THRESHOLDS.QUEUE_SIZE,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Alert when too many stuck payments
 */
export async function checkStuckPaymentsAlert(
  stuckCount: number
): Promise<void> {
  if (stuckCount >= THRESHOLDS.STUCK_PAYMENTS_COUNT) {
    await alertService.sendAlert({
      severity: 'critical',
      title: 'Stuck Payments Detected',
      message: `${stuckCount} payments appear to be stuck`,
      metadata: {
        stuckCount,
        threshold: THRESHOLDS.STUCK_PAYMENTS_COUNT,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Alert on critical errors
 */
export async function alertCriticalError(
  error: Error,
  context: Record<string, unknown>
): Promise<void> {
  await alertService.sendAlert({
    severity: 'critical',
    title: 'Critical Payment Error',
    message: error.message,
    metadata: {
      errorName: error.name,
      ...context,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Alert when error rate exceeds threshold
 */
export async function checkErrorRateAlert(
  errorCount: number,
  totalCount: number,
  timeWindowMinutes: number = 60
): Promise<void> {
  if (totalCount === 0) return;
  
  const errorRate = (errorCount / totalCount) * 100;
  
  if (errorRate >= THRESHOLDS.ERROR_RATE_PERCENT) {
    await alertService.sendAlert({
      severity: 'warning',
      title: 'High Error Rate',
      message: `Error rate is ${errorRate.toFixed(2)}% in the last ${timeWindowMinutes} minutes`,
      metadata: {
        errorCount,
        totalCount,
        errorRate: `${errorRate.toFixed(2)}%`,
        threshold: `${THRESHOLDS.ERROR_RATE_PERCENT}%`,
        timeWindow: `${timeWindowMinutes}m`,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export type { Alert, AlertSeverity };
