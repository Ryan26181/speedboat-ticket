// ============================================
// CUSTOM ERROR CLASSES - ENTERPRISE GRADE
// ============================================

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  public code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// ============================================
// PAYMENT ERRORS
// ============================================

export class PaymentError extends AppError {
  public readonly orderId?: string;
  public readonly paymentId?: string;

  constructor(
    message: string,
    code: string = 'PAYMENT_ERROR',
    context?: Record<string, unknown> & { orderId?: string; paymentId?: string }
  ) {
    super(message, code, 400, true, context);
    this.orderId = context?.orderId;
    this.paymentId = context?.paymentId;
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(orderId: string, context?: Record<string, unknown>) {
    super(
      `Payment not found for order: ${orderId}`,
      'PAYMENT_NOT_FOUND',
      { orderId, ...context }
    );
  }
}

export class PaymentAlreadyProcessedError extends PaymentError {
  public readonly existingStatus: string;

  constructor(orderId: string, existingStatus: string, context?: Record<string, unknown>) {
    super(
      `Payment already processed for order: ${orderId} (status: ${existingStatus})`,
      'PAYMENT_ALREADY_PROCESSED',
      { orderId, existingStatus, ...context }
    );
    this.existingStatus = existingStatus;
  }
}

export class InvalidPaymentStateError extends PaymentError {
  public readonly currentStatus: string;
  public readonly attemptedStatus: string;

  constructor(
    orderId: string,
    currentStatus: string,
    attemptedStatus: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Invalid payment state transition: ${currentStatus} -> ${attemptedStatus} for order: ${orderId}`,
      'INVALID_PAYMENT_STATE',
      { orderId, currentStatus, attemptedStatus, ...context }
    );
    this.currentStatus = currentStatus;
    this.attemptedStatus = attemptedStatus;
  }
}

export class PaymentExpiredError extends PaymentError {
  public readonly expiredAt: Date;

  constructor(orderId: string, expiredAt: Date, context?: Record<string, unknown>) {
    super(
      `Payment expired at ${expiredAt.toISOString()} for order: ${orderId}`,
      'PAYMENT_EXPIRED',
      { orderId, expiredAt: expiredAt.toISOString(), ...context }
    );
    this.expiredAt = expiredAt;
  }
}

export class DoublePaymentError extends PaymentError {
  public readonly existingTransactionId: string;
  public readonly newTransactionId: string;

  constructor(
    orderId: string,
    existingTransactionId: string,
    newTransactionId: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Double payment detected for order: ${orderId}. Existing: ${existingTransactionId}, New: ${newTransactionId}`,
      'DOUBLE_PAYMENT_DETECTED',
      { orderId, existingTransactionId, newTransactionId, ...context }
    );
    this.existingTransactionId = existingTransactionId;
    this.newTransactionId = newTransactionId;
  }
}

export class PaymentAmountMismatchError extends PaymentError {
  public readonly expectedAmount: number;
  public readonly receivedAmount: number;

  constructor(
    orderId: string,
    expectedAmount: number,
    receivedAmount: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Amount mismatch for order: ${orderId}. Expected: ${expectedAmount}, Received: ${receivedAmount}`,
      'PAYMENT_AMOUNT_MISMATCH',
      { orderId, expectedAmount, receivedAmount, ...context }
    );
    this.expectedAmount = expectedAmount;
    this.receivedAmount = receivedAmount;
  }
}

export class RefundError extends PaymentError {
  public readonly refundAmount?: number;
  public readonly reason?: string;

  constructor(
    orderId: string,
    message: string,
    refundAmount?: number,
    reason?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'REFUND_ERROR',
      { orderId, refundAmount, reason, ...context }
    );
    this.refundAmount = refundAmount;
    this.reason = reason;
  }
}

// ============================================
// BOOKING ERRORS
// ============================================

export class BookingError extends AppError {
  public readonly bookingCode?: string;
  public readonly bookingId?: string;

  constructor(
    message: string,
    code: string = 'BOOKING_ERROR',
    context?: Record<string, unknown> & { bookingCode?: string; bookingId?: string }
  ) {
    super(message, code, 400, true, context);
    this.bookingCode = context?.bookingCode;
    this.bookingId = context?.bookingId;
  }
}

export class BookingNotFoundError extends BookingError {
  constructor(identifier: string, context?: Record<string, unknown>) {
    super(
      `Booking not found: ${identifier}`,
      'BOOKING_NOT_FOUND',
      { bookingCode: identifier, ...context }
    );
  }
}

export class InvalidBookingStateError extends BookingError {
  public readonly currentStatus: string;
  public readonly attemptedStatus: string;

  constructor(
    bookingCode: string,
    currentStatus: string,
    attemptedStatus: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Invalid booking state transition: ${currentStatus} -> ${attemptedStatus} for booking: ${bookingCode}`,
      'INVALID_BOOKING_STATE',
      { bookingCode, currentStatus, attemptedStatus, ...context }
    );
    this.currentStatus = currentStatus;
    this.attemptedStatus = attemptedStatus;
  }
}

export class BookingExpiredError extends BookingError {
  constructor(bookingCode: string, context?: Record<string, unknown>) {
    super(
      `Booking has expired: ${bookingCode}`,
      'BOOKING_EXPIRED',
      { bookingCode, ...context }
    );
  }
}

export class SeatsNotAvailableError extends BookingError {
  public readonly requestedSeats: number;
  public readonly availableSeats: number;

  constructor(
    requestedSeats: number,
    availableSeats: number,
    scheduleId: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Not enough seats available. Requested: ${requestedSeats}, Available: ${availableSeats}`,
      'SEATS_NOT_AVAILABLE',
      { requestedSeats, availableSeats, scheduleId, ...context }
    );
    this.requestedSeats = requestedSeats;
    this.availableSeats = availableSeats;
  }
}

// ============================================
// EXTERNAL SERVICE ERRORS
// ============================================

export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: unknown;

  constructor(
    serviceName: string,
    message: string,
    code: string = 'EXTERNAL_SERVICE_ERROR',
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, code, 502, true, context);
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

export class MidtransError extends ExternalServiceError {
  public readonly midtransErrorCode?: string;
  public readonly midtransErrorMessage?: string;

  constructor(
    message: string,
    midtransErrorCode?: string,
    midtransErrorMessage?: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super('Midtrans', message, 'MIDTRANS_ERROR', originalError, context);
    this.midtransErrorCode = midtransErrorCode;
    this.midtransErrorMessage = midtransErrorMessage;
  }
}

export class MidtransConnectionError extends MidtransError {
  constructor(originalError?: unknown, context?: Record<string, unknown>) {
    super(
      'Failed to connect to Midtrans API',
      'CONNECTION_ERROR',
      'Unable to establish connection',
      originalError,
      context
    );
  }
}

export class MidtransTimeoutError extends MidtransError {
  constructor(timeoutMs: number, originalError?: unknown, context?: Record<string, unknown>) {
    super(
      `Midtrans API request timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      'Request timeout',
      originalError,
      { timeoutMs, ...context }
    );
  }
}

export class MidtransSignatureError extends MidtransError {
  constructor(orderId: string, context?: Record<string, unknown>) {
    super(
      `Invalid Midtrans signature for order: ${orderId}`,
      'SIGNATURE_ERROR',
      'Signature verification failed',
      undefined,
      { orderId, ...context }
    );
  }
}

export class MidtransRateLimitError extends MidtransError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, context?: Record<string, unknown>) {
    super(
      `Midtrans API rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT',
      'Too many requests',
      undefined,
      { retryAfter, ...context }
    );
    this.retryAfter = retryAfter;
  }
}

export class EmailServiceError extends ExternalServiceError {
  public readonly emailTo?: string;
  public readonly emailType?: string;

  constructor(
    message: string,
    emailTo?: string,
    emailType?: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super('Email', message, 'EMAIL_SERVICE_ERROR', originalError, context);
    this.emailTo = emailTo;
    this.emailType = emailType;
  }
}

// ============================================
// VALIDATION ERRORS
// ============================================

export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly constraints?: Record<string, string>;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    constraints?: Record<string, string>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.field = field;
    this.value = value;
    this.constraints = constraints;
  }
}

export class InvalidInputError extends ValidationError {
  constructor(
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, field, value, undefined, context);
    this.code = 'INVALID_INPUT';
  }
}

// ============================================
// AUTHENTICATION ERRORS
// ============================================

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  public readonly requiredPermission?: string;

  constructor(
    message: string = 'Insufficient permissions',
    requiredPermission?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, true, context);
    this.requiredPermission = requiredPermission;
  }
}

export class InvalidWebhookSignatureError extends AuthenticationError {
  constructor(source: string = 'Midtrans', context?: Record<string, unknown>) {
    super(
      `Invalid ${source} webhook signature`,
      { source, ...context }
    );
    this.code = 'INVALID_WEBHOOK_SIGNATURE';
  }
}

// ============================================
// INFRASTRUCTURE ERRORS
// ============================================

export class DatabaseError extends AppError {
  public readonly query?: string;
  public readonly prismaCode?: string;

  constructor(
    message: string,
    prismaCode?: string,
    query?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'DATABASE_ERROR', 500, true, context);
    this.prismaCode = prismaCode;
    this.query = query;
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string = 'Transaction failed', context?: Record<string, unknown>) {
    super(message, undefined, undefined, context);
    this.code = 'TRANSACTION_ERROR';
  }
}

export class ConcurrencyError extends DatabaseError {
  constructor(
    message: string = 'Concurrent modification detected',
    context?: Record<string, unknown>
  ) {
    super(message, 'P2034', undefined, context);
    this.code = 'CONCURRENCY_ERROR';
  }
}

// ============================================
// CIRCUIT BREAKER / RETRY ERRORS
// ============================================

export class CircuitBreakerOpenError extends AppError {
  public readonly serviceName: string;
  public readonly nextRetryAt?: Date;

  constructor(
    serviceName: string,
    nextRetryAt?: Date,
    context?: Record<string, unknown>
  ) {
    super(
      `Circuit breaker open for service: ${serviceName}`,
      'CIRCUIT_BREAKER_OPEN',
      503,
      true,
      context
    );
    this.serviceName = serviceName;
    this.nextRetryAt = nextRetryAt;
  }
}

export class RetryExhaustedError extends AppError {
  public readonly attempts: number;
  public readonly lastError?: Error;

  constructor(
    message: string,
    attempts: number,
    lastError?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      `${message}. All ${attempts} retry attempts exhausted`,
      'RETRY_EXHAUSTED',
      500,
      true,
      context
    );
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export class TimeoutError extends AppError {
  public readonly timeoutMs: number;

  constructor(
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      408,
      true,
      context
    );
    this.timeoutMs = timeoutMs;
  }
}

// ============================================
// SAGA / COMPENSATION ERRORS
// ============================================

export class SagaError extends AppError {
  public readonly sagaId: string;
  public readonly step: string;
  public readonly compensationFailed: boolean;

  constructor(
    sagaId: string,
    step: string,
    message: string,
    compensationFailed: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(
      `Saga ${sagaId} failed at step '${step}': ${message}`,
      'SAGA_ERROR',
      500,
      true,
      context
    );
    this.sagaId = sagaId;
    this.step = step;
    this.compensationFailed = compensationFailed;
  }
}

export class CompensationError extends SagaError {
  public readonly originalError: Error;

  constructor(
    sagaId: string,
    step: string,
    originalError: Error,
    context?: Record<string, unknown>
  ) {
    super(
      sagaId,
      step,
      `Compensation failed: ${originalError.message}`,
      true,
      context
    );
    this.code = 'COMPENSATION_ERROR';
    this.originalError = originalError;
  }
}

// ============================================
// ERROR UTILITIES
// ============================================

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Wrap unknown errors into AppError
 */
export function wrapError(error: unknown, context?: Record<string, unknown>): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'INTERNAL_ERROR',
      500,
      false,
      { originalError: error.name, ...context }
    );
  }
  
  return new AppError(
    String(error),
    'UNKNOWN_ERROR',
    500,
    false,
    context
  );
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Extract error code safely
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }
  if (error instanceof Error) {
    return error.name;
  }
  return 'UNKNOWN';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof Error) {
    const retryableMessages = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'socket hang up',
      'network',
      'timeout',
    ];
    
    if (retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )) {
      return true;
    }
  }

  // Specific error types
  if (error instanceof MidtransConnectionError) return true;
  if (error instanceof MidtransTimeoutError) return true;
  if (error instanceof MidtransRateLimitError) return true;
  if (error instanceof ConcurrencyError) return true;

  // Circuit breaker - should not retry immediately
  if (error instanceof CircuitBreakerOpenError) return false;

  // Check for retryable HTTP status codes
  if (error instanceof AppError) {
    return [408, 429, 500, 502, 503, 504].includes(error.statusCode);
  }

  return false;
}
