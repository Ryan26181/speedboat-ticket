import { BookingStatus, PaymentStatus } from '@prisma/client';
import { logger } from './logger';

// ============================================
// STATE MACHINE TYPES
// ============================================

interface StateTransition<S> {
  from: S | S[];
  to: S;
  guard?: () => boolean;
  action?: string;
}

interface StateMachineConfig<S> {
  initialState: S;
  transitions: StateTransition<S>[];
}

// ============================================
// BOOKING STATE MACHINE
// ============================================

const bookingStateMachine: StateMachineConfig<BookingStatus> = {
  initialState: 'PENDING',
  transitions: [
    // From PENDING
    { from: 'PENDING', to: 'CONFIRMED', action: 'PAYMENT_SUCCESS' },
    { from: 'PENDING', to: 'CONFIRMED', action: 'CONFIRM' },
    { from: 'PENDING', to: 'CANCELLED', action: 'PAYMENT_FAILED' },
    { from: 'PENDING', to: 'CANCELLED', action: 'USER_CANCELLED' },
    { from: 'PENDING', to: 'CANCELLED', action: 'ADMIN_CANCELLED' },
    { from: 'PENDING', to: 'CANCELLED', action: 'CANCEL' },
    { from: 'PENDING', to: 'EXPIRED', action: 'PAYMENT_EXPIRED' },
    { from: 'PENDING', to: 'EXPIRED', action: 'EXPIRE' },
    
    // From CONFIRMED
    { from: 'CONFIRMED', to: 'COMPLETED', action: 'TRIP_COMPLETED' },
    { from: 'CONFIRMED', to: 'CANCELLED', action: 'ADMIN_CANCELLED' },
    { from: 'CONFIRMED', to: 'CANCELLED', action: 'CANCEL' },
    { from: 'CONFIRMED', to: 'REFUNDED', action: 'REFUND_PROCESSED' },
    { from: 'CONFIRMED', to: 'REFUNDED', action: 'REFUND' },
    
    // From COMPLETED
    { from: 'COMPLETED', to: 'REFUNDED', action: 'REFUND_PROCESSED' },
    { from: 'COMPLETED', to: 'REFUNDED', action: 'REFUND' },
    
    // Terminal states - no transitions out
    // CANCELLED, EXPIRED, REFUNDED
  ],
};

const paymentStateMachine: StateMachineConfig<PaymentStatus> = {
  initialState: 'PENDING',
  transitions: [
    // From PENDING
    { from: 'PENDING', to: 'SUCCESS', action: 'PAYMENT_CAPTURED' },
    { from: 'PENDING', to: 'SUCCESS', action: 'PAYMENT_SETTLED' },
    { from: 'PENDING', to: 'SUCCESS', action: 'CONFIRM' },
    { from: 'PENDING', to: 'FAILED', action: 'PAYMENT_DENIED' },
    { from: 'PENDING', to: 'FAILED', action: 'PAYMENT_CANCELLED' },
    { from: 'PENDING', to: 'FAILED', action: 'CANCEL' },
    { from: 'PENDING', to: 'EXPIRED', action: 'PAYMENT_EXPIRED' },
    { from: 'PENDING', to: 'EXPIRED', action: 'EXPIRE' },
    { from: 'PENDING', to: 'CANCELLED', action: 'USER_CANCELLED' },
    { from: 'PENDING', to: 'CANCELLED', action: 'CANCEL' },
    { from: 'PENDING', to: 'CHALLENGE', action: 'FRAUD_REVIEW' },
    { from: 'PENDING', to: 'CHALLENGE', action: 'HOLD' },
    { from: 'PENDING', to: 'DENY', action: 'FRAUD_DENIED' },
    
    // From CHALLENGE (fraud review)
    { from: 'CHALLENGE', to: 'SUCCESS', action: 'FRAUD_ACCEPTED' },
    { from: 'CHALLENGE', to: 'SUCCESS', action: 'CONFIRM' },
    { from: 'CHALLENGE', to: 'DENY', action: 'FRAUD_REJECTED' },
    { from: 'CHALLENGE', to: 'CANCELLED', action: 'USER_CANCELLED' },
    { from: 'CHALLENGE', to: 'CANCELLED', action: 'CANCEL' },
    
    // From SUCCESS
    { from: 'SUCCESS', to: 'REFUNDED', action: 'REFUND_FULL' },
    { from: 'SUCCESS', to: 'REFUNDED', action: 'REFUND_PARTIAL' },
    { from: 'SUCCESS', to: 'REFUNDED', action: 'CHARGEBACK' },
    { from: 'SUCCESS', to: 'REFUNDED', action: 'REFUND' },
    
    // Terminal states - no transitions out
    // FAILED, EXPIRED, REFUNDED, CANCELLED, DENY
  ],
};

// ============================================
// STATE MACHINE CLASS
// ============================================

export class StateMachine<S extends string> {
  private config: StateMachineConfig<S>;
  private currentState: S;

  constructor(config: StateMachineConfig<S>, initialState?: S) {
    this.config = config;
    this.currentState = initialState || config.initialState;
  }

  /**
   * Check if transition is valid
   */
  canTransition(to: S, action?: string): boolean {
    // Same state is always valid (idempotent)
    if (this.currentState === to) {
      return true;
    }

    const validTransition = this.config.transitions.find(t => {
      const fromMatch = Array.isArray(t.from) 
        ? t.from.includes(this.currentState)
        : t.from === this.currentState;
      
      const toMatch = t.to === to;
      const actionMatch = !action || !t.action || t.action === action;
      const guardPass = !t.guard || t.guard();

      return fromMatch && toMatch && actionMatch && guardPass;
    });

    return !!validTransition;
  }

  /**
   * Attempt transition
   */
  transition(to: S, action?: string): { success: boolean; error?: string } {
    if (this.currentState === to) {
      return { success: true }; // Idempotent
    }

    if (!this.canTransition(to, action)) {
      logger.warn('[STATE_MACHINE_INVALID_TRANSITION]', {
        from: this.currentState,
        to,
        action,
      });
      
      return {
        success: false,
        error: `Invalid transition from ${this.currentState} to ${to}`,
      };
    }

    const previousState = this.currentState;
    this.currentState = to;

    logger.info('[STATE_MACHINE_TRANSITION]', {
      from: previousState,
      to,
      action,
    });

    return { success: true };
  }

  /**
   * Get current state
   */
  getState(): S {
    return this.currentState;
  }

  /**
   * Get valid next states
   */
  getValidNextStates(): S[] {
    const nextStates = new Set<S>();
    
    for (const transition of this.config.transitions) {
      const fromMatch = Array.isArray(transition.from)
        ? transition.from.includes(this.currentState)
        : transition.from === this.currentState;
      
      if (fromMatch) {
        nextStates.add(transition.to);
      }
    }

    return Array.from(nextStates);
  }

  /**
   * Check if current state is terminal
   */
  isTerminal(): boolean {
    return this.getValidNextStates().length === 0;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createBookingStateMachine(currentState?: BookingStatus): StateMachine<BookingStatus> {
  return new StateMachine(bookingStateMachine, currentState);
}

export function createPaymentStateMachine(currentState?: PaymentStatus): StateMachine<PaymentStatus> {
  return new StateMachine(paymentStateMachine, currentState);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate booking status transition
 */
export function validateBookingTransition(
  from: BookingStatus,
  to: BookingStatus,
  action?: string
): { valid: boolean; error?: string } {
  const machine = createBookingStateMachine(from);
  
  if (!machine.canTransition(to, action)) {
    return {
      valid: false,
      error: `Invalid booking transition: ${from} → ${to} (action: ${action || 'none'})`,
    };
  }

  return { valid: true };
}

/**
 * Validate payment status transition
 */
export function validatePaymentTransition(
  from: PaymentStatus,
  to: PaymentStatus,
  action?: string
): { valid: boolean; error?: string } {
  const machine = createPaymentStateMachine(from);
  
  if (!machine.canTransition(to, action)) {
    return {
      valid: false,
      error: `Invalid payment transition: ${from} → ${to} (action: ${action || 'none'})`,
    };
  }

  return { valid: true };
}

/**
 * Get booking status info
 */
export function getBookingStatusInfo(status: BookingStatus): {
  label: string;
  description: string;
  isTerminal: boolean;
  canRefund: boolean;
  canCancel: boolean;
} {
  const info: Record<BookingStatus, {
    label: string;
    description: string;
    isTerminal: boolean;
    canRefund: boolean;
    canCancel: boolean;
  }> = {
    PENDING: {
      label: 'Pending Payment',
      description: 'Waiting for payment to be completed',
      isTerminal: false,
      canRefund: false,
      canCancel: true,
    },
    CONFIRMED: {
      label: 'Confirmed',
      description: 'Payment received, booking confirmed',
      isTerminal: false,
      canRefund: true,
      canCancel: true,
    },
    COMPLETED: {
      label: 'Completed',
      description: 'Trip has been completed',
      isTerminal: false,
      canRefund: true,
      canCancel: false,
    },
    CANCELLED: {
      label: 'Cancelled',
      description: 'Booking has been cancelled',
      isTerminal: true,
      canRefund: false,
      canCancel: false,
    },
    EXPIRED: {
      label: 'Expired',
      description: 'Payment window expired',
      isTerminal: true,
      canRefund: false,
      canCancel: false,
    },
    REFUNDED: {
      label: 'Refunded',
      description: 'Payment has been refunded',
      isTerminal: true,
      canRefund: false,
      canCancel: false,
    },
  };

  return info[status];
}

/**
 * Get payment status info
 */
export function getPaymentStatusInfo(status: PaymentStatus): {
  label: string;
  description: string;
  isTerminal: boolean;
  isSuccess: boolean;
  isFailed: boolean;
} {
  const info: Record<PaymentStatus, {
    label: string;
    description: string;
    isTerminal: boolean;
    isSuccess: boolean;
    isFailed: boolean;
  }> = {
    PENDING: {
      label: 'Pending',
      description: 'Waiting for payment',
      isTerminal: false,
      isSuccess: false,
      isFailed: false,
    },
    SUCCESS: {
      label: 'Success',
      description: 'Payment completed successfully',
      isTerminal: false,
      isSuccess: true,
      isFailed: false,
    },
    FAILED: {
      label: 'Failed',
      description: 'Payment failed',
      isTerminal: true,
      isSuccess: false,
      isFailed: true,
    },
    EXPIRED: {
      label: 'Expired',
      description: 'Payment window expired',
      isTerminal: true,
      isSuccess: false,
      isFailed: true,
    },
    REFUNDED: {
      label: 'Refunded',
      description: 'Payment has been refunded',
      isTerminal: true,
      isSuccess: false,
      isFailed: false,
    },
    CANCELLED: {
      label: 'Cancelled',
      description: 'Payment was cancelled',
      isTerminal: true,
      isSuccess: false,
      isFailed: true,
    },
    CHALLENGE: {
      label: 'Under Review',
      description: 'Payment is under fraud review',
      isTerminal: false,
      isSuccess: false,
      isFailed: false,
    },
    DENY: {
      label: 'Denied',
      description: 'Payment denied due to fraud detection',
      isTerminal: true,
      isSuccess: false,
      isFailed: true,
    },
  };

  return info[status];
}

// ============================================
// EXPORTS
// ============================================

export type { StateTransition, StateMachineConfig };
