import { logger } from './logger';

// ============================================
// RETRY CONFIGURATION
// ============================================

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// ============================================
// RETRY FUNCTION
// ============================================

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (finalConfig.retryableErrors && finalConfig.retryableErrors.length > 0) {
        const errorMessage = lastError.message || '';
        const errorCode = (error as { code?: string })?.code || '';
        
        const isRetryable = finalConfig.retryableErrors.some(
          (e) => errorMessage.includes(e) || errorCode === e
        );
        if (!isRetryable) {
          throw lastError;
        }
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const baseDelay = finalConfig.initialDelayMs * 
        Math.pow(finalConfig.backoffMultiplier, attempt - 1);
      const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
      const delayMs = Math.min(baseDelay + jitter, finalConfig.maxDelayMs);

      logger.warn('[RETRY_ATTEMPT]', {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
        delayMs: Math.round(delayMs),
        error: lastError.message,
      });

      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, lastError, delayMs);
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// SPECIALIZED RETRY FUNCTIONS
// ============================================

/**
 * Retry for Midtrans API calls
 */
export async function withMidtransRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'socket hang up',
      '503',
      '502',
      '504',
      'rate limit',
      'Service Unavailable',
      'Gateway Timeout',
    ],
    onRetry: (attempt, error, delayMs) => {
      logger.warn('[MIDTRANS_RETRY]', {
        attempt,
        error: error.message,
        delayMs,
      });
    },
  });
}

/**
 * Retry for database operations
 */
export async function withDatabaseRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    retryableErrors: [
      'P2034', // Transaction conflict
      'P2024', // Connection pool timeout
      'P2028', // Transaction API error
      'deadlock',
      'lock wait timeout',
      'could not obtain lock',
      'serialization failure',
    ],
    onRetry: (attempt, error, delayMs) => {
      logger.warn('[DATABASE_RETRY]', {
        attempt,
        error: error.message,
        delayMs,
      });
    },
  });
}

/**
 * Retry for email sending
 */
export async function withEmailRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 3,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'rate limit',
      'too many requests',
      '429',
      '503',
    ],
    onRetry: (attempt, error, delayMs) => {
      logger.warn('[EMAIL_RETRY]', {
        attempt,
        error: error.message,
        delayMs,
      });
    },
  });
}

// ============================================
// RETRY WITH TIMEOUT
// ============================================

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(timeoutMessage, timeoutMs));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Execute function with retry and timeout per attempt
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retryConfig: Partial<RetryConfig> = {},
  timeoutMs: number = 30000
): Promise<T> {
  return withRetry(
    () => withTimeout(fn, timeoutMs, 'Request timed out'),
    retryConfig
  );
}

// ============================================
// TIMEOUT ERROR
// ============================================

export class TimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

// ============================================
// RETRY STATS
// ============================================

interface RetryStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageRetries: number;
}

const retryStats: Map<string, RetryStats> = new Map();

/**
 * Track retry statistics for a named operation
 */
export async function withTrackedRetry<T>(
  name: string,
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  let attempts = 0;
  
  const trackedFn = () => {
    attempts++;
    return fn();
  };

  try {
    const result = await withRetry(trackedFn, config);
    updateStats(name, attempts, true);
    return result;
  } catch (error) {
    updateStats(name, attempts, false);
    throw error;
  }
}

function updateStats(name: string, attempts: number, success: boolean): void {
  const stats = retryStats.get(name) || {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    averageRetries: 0,
  };

  stats.totalAttempts += attempts;
  if (success) {
    stats.successfulAttempts++;
  } else {
    stats.failedAttempts++;
  }
  
  const total = stats.successfulAttempts + stats.failedAttempts;
  stats.averageRetries = stats.totalAttempts / total;

  retryStats.set(name, stats);
}

export function getRetryStats(name: string): RetryStats | undefined {
  return retryStats.get(name);
}

export function getAllRetryStats(): Map<string, RetryStats> {
  return new Map(retryStats);
}

export type { RetryConfig, RetryStats };
