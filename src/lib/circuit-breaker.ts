import { logger } from './logger';

// ============================================
// CIRCUIT BREAKER TYPES
// ============================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening
  successThreshold: number;      // Successes to close from half-open
  timeout: number;               // Time in OPEN state before trying again (ms)
  monitoringWindow: number;      // Time window to count failures (ms)
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  state: CircuitState;
  stateChangedAt: number;
  totalRequests: number;
  failedRequests: number;
}

// ============================================
// CIRCUIT BREAKER CLASS
// ============================================

export class CircuitBreaker {
  private name: string;
  private config: CircuitBreakerConfig;
  private stats: CircuitStats;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30000, // 30 seconds
      monitoringWindow: 60000, // 1 minute
      ...config,
    };
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: 'CLOSED',
      stateChangedAt: Date.now(),
      totalRequests: 0,
      failedRequests: 0,
    };
  }

  /**
   * Execute function through circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    this.checkStateTransition();

    this.stats.totalRequests++;

    // If OPEN, fail fast
    if (this.stats.state === 'OPEN') {
      this.stats.failedRequests++;
      
      logger.warn('[CIRCUIT_BREAKER_OPEN]', { 
        name: this.name,
        openSince: Date.now() - this.stats.stateChangedAt,
        timeUntilRetry: this.config.timeout - (Date.now() - this.stats.stateChangedAt),
      });
      
      throw new CircuitBreakerOpenError(
        `Circuit breaker ${this.name} is OPEN`,
        this.name,
        this.config.timeout - (Date.now() - this.stats.stateChangedAt)
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if state should transition
   */
  private checkStateTransition(): void {
    const now = Date.now();

    if (this.stats.state === 'OPEN') {
      // Check if timeout has passed
      if (now - this.stats.stateChangedAt >= this.config.timeout) {
        this.transitionTo('HALF_OPEN');
      }
    } else if (this.stats.state === 'CLOSED') {
      // Reset counters if monitoring window has passed
      if (this.stats.lastFailureTime && 
          now - this.stats.lastFailureTime > this.config.monitoringWindow) {
        this.stats.failures = 0;
      }
    }
  }

  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.lastSuccessTime = Date.now();

    if (this.stats.state === 'HALF_OPEN') {
      if (this.stats.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }

    // Reset failure count on success in CLOSED state
    if (this.stats.state === 'CLOSED') {
      this.stats.failures = 0;
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.stats.failures++;
    this.stats.failedRequests++;
    this.stats.lastFailureTime = Date.now();
    this.stats.successes = 0;

    if (this.stats.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN immediately opens the circuit
      this.transitionTo('OPEN');
    } else if (this.stats.state === 'CLOSED') {
      if (this.stats.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.stats.state;
    this.stats.state = newState;
    this.stats.stateChangedAt = Date.now();
    this.stats.failures = 0;
    this.stats.successes = 0;

    logger.info('[CIRCUIT_BREAKER_TRANSITION]', {
      name: this.name,
      from: previousState,
      to: newState,
    });
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.stats.state;
  }

  /**
   * Get current stats
   */
  getStats(): CircuitStats & { name: string; config: CircuitBreakerConfig } {
    this.checkStateTransition();
    return { 
      ...this.stats, 
      name: this.name,
      config: this.config,
    };
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    this.checkStateTransition();
    return this.stats.state === 'CLOSED';
  }

  /**
   * Force reset (for testing or manual intervention)
   */
  reset(): void {
    this.stats = {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: 'CLOSED',
      stateChangedAt: Date.now(),
      totalRequests: this.stats.totalRequests,
      failedRequests: this.stats.failedRequests,
    };
    logger.info('[CIRCUIT_BREAKER_RESET]', { name: this.name });
  }

  /**
   * Force open (for maintenance)
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
    logger.info('[CIRCUIT_BREAKER_FORCED_OPEN]', { name: this.name });
  }

  /**
   * Force close (for recovery)
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
    logger.info('[CIRCUIT_BREAKER_FORCED_CLOSE]', { name: this.name });
  }
}

// ============================================
// CIRCUIT BREAKER ERROR
// ============================================

export class CircuitBreakerOpenError extends Error {
  public readonly circuitName: string;
  public readonly retryAfterMs: number;

  constructor(message: string, circuitName: string, retryAfterMs: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = circuitName;
    this.retryAfterMs = Math.max(0, retryAfterMs);
  }
}

// ============================================
// CIRCUIT BREAKER REGISTRY
// ============================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker
 */
export function getCircuitBreaker(
  name: string, 
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, config));
  }
  return circuitBreakers.get(name)!;
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats(): Array<CircuitStats & { name: string; config: CircuitBreakerConfig }> {
  return Array.from(circuitBreakers.values()).map(cb => cb.getStats());
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach(cb => cb.reset());
  logger.info('[ALL_CIRCUIT_BREAKERS_RESET]');
}

// ============================================
// PRE-CONFIGURED CIRCUIT BREAKERS
// ============================================

export const midtransCircuitBreaker = getCircuitBreaker('midtrans', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringWindow: 120000, // 2 minutes
});

export const emailCircuitBreaker = getCircuitBreaker('email', {
  failureThreshold: 3,
  successThreshold: 1,
  timeout: 120000, // 2 minutes
  monitoringWindow: 300000, // 5 minutes
});

export const databaseCircuitBreaker = getCircuitBreaker('database', {
  failureThreshold: 10,
  successThreshold: 3,
  timeout: 30000, // 30 seconds
  monitoringWindow: 60000, // 1 minute
});

// ============================================
// CIRCUIT BREAKER WRAPPER
// ============================================

/**
 * Wrap a function with circuit breaker protection
 */
export function withCircuitBreaker<T>(
  circuitBreaker: CircuitBreaker,
  fn: () => Promise<T>
): Promise<T> {
  return circuitBreaker.execute(fn);
}

export type { CircuitState, CircuitBreakerConfig, CircuitStats };
