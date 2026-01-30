import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// ============================================
// LOG LEVELS
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const currentLogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

// ============================================
// ASYNC CONTEXT FOR REQUEST TRACKING
// ============================================

interface LogContext {
  requestId: string;
  userId?: string;
  orderId?: string;
  startTime: number;
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

export function runWithContext<T>(
  context: Partial<LogContext>,
  fn: () => T
): T {
  const fullContext: LogContext = {
    requestId: context.requestId || randomUUID(),
    userId: context.userId,
    orderId: context.orderId,
    startTime: context.startTime || Date.now(),
  };
  return asyncLocalStorage.run(fullContext, fn);
}

export function getContext(): LogContext | undefined {
  return asyncLocalStorage.getStore();
}

// ============================================
// LOG ENTRY STRUCTURE
// ============================================

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  orderId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

// ============================================
// LOGGER CLASS
// ============================================

class Logger {
  private service: string;
  private environment: string;

  constructor() {
    this.service = process.env.SERVICE_NAME || 'speedboat-payment';
    this.environment = process.env.NODE_ENV || 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const context = getContext();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      environment: this.environment,
      requestId: context?.requestId || (metadata?.requestId as string | undefined),
      userId: context?.userId || (metadata?.userId as string | undefined),
      orderId: context?.orderId || (metadata?.orderId as string | undefined),
    };

    if (context?.startTime) {
      entry.duration = Date.now() - context.startTime;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.environment === 'development' ? error.stack : undefined,
      };
    }

    if (metadata) {
      // Remove fields already in entry
      const { requestId, userId, orderId, ...rest } = metadata;
      if (Object.keys(rest).length > 0) {
        entry.metadata = rest;
      }
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const jsonOutput = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(jsonOutput);
        break;
      case 'info':
        console.info(jsonOutput);
        break;
      case 'warn':
        console.warn(jsonOutput);
        break;
      case 'error':
      case 'fatal':
        console.error(jsonOutput);
        break;
    }

    // Send to external services in production
    if (this.environment === 'production') {
      this.sendToExternalServices(entry);
    }
  }

  private async sendToExternalServices(entry: LogEntry): Promise<void> {
    // Send to your logging service (e.g., Datadog, CloudWatch, etc.)
    try {
      // Example: Send errors to Sentry
      if (entry.level === 'error' || entry.level === 'fatal') {
        // await sendToSentry(entry);
      }

      // Example: Send to Datadog
      // await sendToDatadog(entry);

      // Example: Send to CloudWatch
      // await sendToCloudWatch(entry);
    } catch (error) {
      // Don't throw - logging should never break the app
      console.error('Failed to send log to external service', error);
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, metadata));
    }
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, metadata));
    }
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, metadata));
    }
  }

  error(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    if (this.shouldLog('error')) {
      this.output(this.formatEntry('error', message, metadata, error));
    }
  }

  fatal(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    if (this.shouldLog('fatal')) {
      this.output(this.formatEntry('fatal', message, metadata, error));
    }
  }

  // Convenience method for timing operations
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration });
    };
  }
}

export const logger = new Logger();

