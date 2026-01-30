import { EventEmitter } from 'events';
import { prisma } from './prisma';
import { logger } from './logger';

// ============================================
// PAYMENT EVENT TYPES
// ============================================

export interface PaymentProcessedEvent {
  bookingId: string;
  paymentStatus: string;
  bookingStatus: string;
  orderId: string;
}

export interface PaymentFailedEvent {
  bookingId: string;
  orderId: string;
  reason: string;
}

export interface PaymentRefundedEvent {
  bookingId: string;
  orderId: string;
  amount: number;
  reason?: string;
}

export type PaymentEventMap = {
  'payment:processed': PaymentProcessedEvent;
  'payment:failed': PaymentFailedEvent;
  'payment:refunded': PaymentRefundedEvent;
};

// ============================================
// PAYMENT EVENT EMITTER
// ============================================

class PaymentEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
    this.registerHandlers();
  }

  emit<K extends keyof PaymentEventMap>(
    event: K,
    data: PaymentEventMap[K]
  ): boolean {
    logger.info(`[EVENT] ${event}`, data as unknown as Record<string, unknown>);
    return super.emit(event, data);
  }

  on<K extends keyof PaymentEventMap>(
    event: K,
    listener: (data: PaymentEventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }

  private registerHandlers() {
    // Handle successful payment
    this.on('payment:processed', async (data) => {
      try {
        await this.handlePaymentProcessed(data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[EVENT_HANDLER_ERROR]', { 
          event: 'payment:processed', 
          error: errorMessage 
        });
      }
    });

    // Handle failed payment
    this.on('payment:failed', async (data) => {
      try {
        await this.handlePaymentFailed(data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[EVENT_HANDLER_ERROR]', { 
          event: 'payment:failed', 
          error: errorMessage 
        });
      }
    });

    // Handle refund
    this.on('payment:refunded', async (data) => {
      try {
        await this.handlePaymentRefunded(data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[EVENT_HANDLER_ERROR]', { 
          event: 'payment:refunded', 
          error: errorMessage 
        });
      }
    });
  }

  /**
   * Handle successful payment - async operations
   * These run AFTER the main transaction commits
   */
  private async handlePaymentProcessed(data: PaymentProcessedEvent) {
    const { bookingId, paymentStatus, orderId } = data;

    if (paymentStatus !== 'SUCCESS') return;

    logger.info('[EVENT_PAYMENT_SUCCESS]', { bookingId, orderId });

    try {
      // Get booking details for notifications
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
          schedule: {
            include: {
              route: { include: { departurePort: true, arrivalPort: true } },
              ship: true,
            },
          },
          passengers: { include: { ticket: true } },
          payment: true,
        },
      });

      if (!booking) return;

      // Queue email notification (non-blocking)
      this.queueEmailNotification(booking, 'payment_success');

      // Queue SMS notification (if phone available)
      if (booking.user.phone) {
        this.queueSMSNotification(booking, 'payment_success');
      }

      // Update analytics (non-blocking)
      this.updateAnalytics('payment_success', {
        bookingId,
        amount: booking.payment?.amount,
        paymentType: booking.payment?.paymentType,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[EVENT_PAYMENT_SUCCESS_ERROR]', { 
        bookingId, 
        error: errorMessage 
      });
      // Don't throw - this is async, main transaction already committed
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(data: PaymentFailedEvent) {
    const { bookingId, orderId, reason } = data;

    logger.info('[EVENT_PAYMENT_FAILED]', { bookingId, orderId, reason });

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) return;

      // Queue failure notification
      this.queueEmailNotification(booking, 'payment_failed');

      // Update analytics
      this.updateAnalytics('payment_failed', { bookingId, reason });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[EVENT_PAYMENT_FAILED_ERROR]', { 
        bookingId, 
        error: errorMessage 
      });
    }
  }

  /**
   * Handle refund
   */
  private async handlePaymentRefunded(data: PaymentRefundedEvent) {
    const { bookingId, orderId, amount: refundAmount } = data;

    logger.info('[EVENT_PAYMENT_REFUNDED]', { bookingId, orderId, refundAmount });

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true },
      });

      if (!booking) return;

      // Queue refund notification
      this.queueEmailNotification(booking, 'payment_refunded');

      // Update analytics
      this.updateAnalytics('payment_refunded', { bookingId, refundAmount });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[EVENT_PAYMENT_REFUNDED_ERROR]', { 
        bookingId, 
        error: errorMessage 
      });
    }
  }

  // ============================================
  // NOTIFICATION QUEUING
  // ============================================

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private queueEmailNotification(booking: any, template: string) {
    // In production, use a proper queue (Bull, SQS, etc.)
    // For now, fire-and-forget with error handling
    setImmediate(async () => {
      try {
        // TODO: Import email service when implemented
        // const { sendPaymentEmail } = await import('./email-service');
        // await sendPaymentEmail(booking, template);
        logger.info('[EMAIL_QUEUED]', { 
          bookingCode: booking.bookingCode, 
          template 
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[EMAIL_FAILED]', { 
          bookingCode: booking.bookingCode, 
          template, 
          error: errorMessage 
        });
      }
    });
  }

  private queueSMSNotification(booking: any, template: string) {
    setImmediate(async () => {
      try {
        // const { sendPaymentSMS } = await import('./sms-service');
        // await sendPaymentSMS(booking, template);
        logger.info('[SMS_QUEUED]', { 
          bookingCode: booking.bookingCode, 
          template 
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[SMS_FAILED]', { 
          bookingCode: booking.bookingCode, 
          error: errorMessage 
        });
      }
    });
  }

  private updateAnalytics(event: string, data: Record<string, unknown>) {
    setImmediate(() => {
      try {
        // In production, send to analytics service
        // e.g., Mixpanel, Amplitude, internal analytics
        logger.debug('[ANALYTICS]', { event, ...data });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ANALYTICS_ERROR]', { event, error: errorMessage });
      }
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export const PaymentEventEmitter = new PaymentEvents();
