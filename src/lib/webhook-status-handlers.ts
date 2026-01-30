import { PaymentStatus, BookingStatus } from '@prisma/client';
import { logger } from './logger';

// ============================================
// COMPREHENSIVE STATUS MAPPING
// ============================================

interface StatusMapping {
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  action: 'CONFIRM' | 'CANCEL' | 'EXPIRE' | 'REFUND' | 'HOLD' | 'NONE';
  shouldGenerateTickets: boolean;
  shouldReleaseSeats: boolean;
  shouldNotifyUser: boolean;
  notificationType?: string;
}

/**
 * Complete mapping of all Midtrans transaction statuses
 * Reference: https://docs.midtrans.com/docs/https-notification-webhooks
 */
export function getStatusMapping(
  transactionStatus: string,
  fraudStatus?: string,
  paymentType?: string
): StatusMapping {
  
  // Handle credit card with fraud detection
  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') {
      return {
        paymentStatus: 'SUCCESS',
        bookingStatus: 'CONFIRMED',
        action: 'CONFIRM',
        shouldGenerateTickets: true,
        shouldReleaseSeats: false,
        shouldNotifyUser: true,
        notificationType: 'payment_success',
      };
    } else if (fraudStatus === 'challenge') {
      // Payment needs manual review
      return {
        paymentStatus: 'CHALLENGE',
        bookingStatus: 'PENDING',
        action: 'HOLD',
        shouldGenerateTickets: false,
        shouldReleaseSeats: false,
        shouldNotifyUser: true,
        notificationType: 'payment_review',
      };
    } else {
      // fraud_status === 'deny'
      return {
        paymentStatus: 'DENY',
        bookingStatus: 'CANCELLED',
        action: 'CANCEL',
        shouldGenerateTickets: false,
        shouldReleaseSeats: true,
        shouldNotifyUser: true,
        notificationType: 'payment_fraud_denied',
      };
    }
  }

  // Standard status mappings
  const statusMap: Record<string, StatusMapping> = {
    // Payment completed (bank transfer, e-wallet, etc.)
    settlement: {
      paymentStatus: 'SUCCESS',
      bookingStatus: 'CONFIRMED',
      action: 'CONFIRM',
      shouldGenerateTickets: true,
      shouldReleaseSeats: false,
      shouldNotifyUser: true,
      notificationType: 'payment_success',
    },

    // Waiting for payment
    pending: {
      paymentStatus: 'PENDING',
      bookingStatus: 'PENDING',
      action: 'NONE',
      shouldGenerateTickets: false,
      shouldReleaseSeats: false,
      shouldNotifyUser: false,
    },

    // Payment denied by bank/processor
    deny: {
      paymentStatus: 'DENY',
      bookingStatus: 'CANCELLED',
      action: 'CANCEL',
      shouldGenerateTickets: false,
      shouldReleaseSeats: true,
      shouldNotifyUser: true,
      notificationType: 'payment_denied',
    },

    // Cancelled by merchant or customer
    cancel: {
      paymentStatus: 'CANCELLED',
      bookingStatus: 'CANCELLED',
      action: 'CANCEL',
      shouldGenerateTickets: false,
      shouldReleaseSeats: true,
      shouldNotifyUser: true,
      notificationType: 'payment_cancelled',
    },

    // Payment expired (timeout)
    expire: {
      paymentStatus: 'EXPIRED',
      bookingStatus: 'EXPIRED',
      action: 'EXPIRE',
      shouldGenerateTickets: false,
      shouldReleaseSeats: true,
      shouldNotifyUser: true,
      notificationType: 'payment_expired',
    },

    // Payment failed
    failure: {
      paymentStatus: 'FAILED',
      bookingStatus: 'CANCELLED',
      action: 'CANCEL',
      shouldGenerateTickets: false,
      shouldReleaseSeats: true,
      shouldNotifyUser: true,
      notificationType: 'payment_failed',
    },

    // Full refund
    refund: {
      paymentStatus: 'REFUNDED',
      bookingStatus: 'REFUNDED',
      action: 'REFUND',
      shouldGenerateTickets: false,
      shouldReleaseSeats: true,
      shouldNotifyUser: true,
      notificationType: 'payment_refunded',
    },

    // Partial refund
    partial_refund: {
      paymentStatus: 'REFUNDED',
      bookingStatus: 'REFUNDED',
      action: 'REFUND',
      shouldGenerateTickets: false,
      shouldReleaseSeats: false, // Partial refund might not release seats
      shouldNotifyUser: true,
      notificationType: 'payment_partial_refund',
    },

    // Pre-authorization (credit card)
    authorize: {
      paymentStatus: 'PENDING',
      bookingStatus: 'PENDING',
      action: 'HOLD',
      shouldGenerateTickets: false,
      shouldReleaseSeats: false,
      shouldNotifyUser: false,
    },

    // Chargeback initiated
    chargeback: {
      paymentStatus: 'REFUNDED',
      bookingStatus: 'CANCELLED',
      action: 'CANCEL',
      shouldGenerateTickets: false,
      shouldReleaseSeats: true,
      shouldNotifyUser: true,
      notificationType: 'payment_chargeback',
    },
  };

  const mapping = statusMap[transactionStatus];

  if (!mapping) {
    logger.warn('[STATUS_MAPPING_UNKNOWN]', { transactionStatus, fraudStatus, paymentType });
    
    // Default: don't change anything
    return {
      paymentStatus: 'PENDING',
      bookingStatus: 'PENDING',
      action: 'NONE',
      shouldGenerateTickets: false,
      shouldReleaseSeats: false,
      shouldNotifyUser: false,
    };
  }

  return mapping;
}

/**
 * Validate if a payment status transition is allowed
 */
export function isValidPaymentStatusTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): boolean {
  // Same status is always valid (idempotent)
  if (currentStatus === newStatus) {
    return true;
  }

  // Define valid transitions
  const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    PENDING: ['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'CHALLENGE', 'DENY'],
    CHALLENGE: ['SUCCESS', 'DENY', 'CANCELLED'],
    SUCCESS: ['REFUNDED'],
    FAILED: [],
    EXPIRED: [],
    CANCELLED: [],
    DENY: [],
    REFUNDED: [],
  };

  const allowed = validTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Validate if a booking status transition is allowed
 */
export function isValidBookingStatusTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): boolean {
  // Same status is always valid (idempotent)
  if (currentStatus === newStatus) {
    return true;
  }

  // Define valid transitions
  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
    COMPLETED: ['REFUNDED'],
    CANCELLED: [], // Terminal state - no further transitions
    EXPIRED: [],   // Terminal state - no further transitions
    REFUNDED: [],  // Terminal state - no further transitions
  };

  const allowed = validTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(
  transactionStatus: string,
  fraudStatus?: string
): string {
  const descriptions: Record<string, string> = {
    capture_accept: 'Payment captured and accepted',
    capture_challenge: 'Payment captured but needs review',
    capture_deny: 'Payment captured but denied due to fraud',
    settlement: 'Payment completed successfully',
    pending: 'Waiting for payment',
    deny: 'Payment denied by bank',
    cancel: 'Payment cancelled',
    expire: 'Payment expired',
    failure: 'Payment failed',
    refund: 'Payment refunded',
    partial_refund: 'Payment partially refunded',
    authorize: 'Payment pre-authorized',
    chargeback: 'Chargeback initiated',
  };

  const key = transactionStatus === 'capture' && fraudStatus 
    ? `capture_${fraudStatus}` 
    : transactionStatus;

  return descriptions[key] || `Unknown status: ${transactionStatus}`;
}

export type { StatusMapping };
