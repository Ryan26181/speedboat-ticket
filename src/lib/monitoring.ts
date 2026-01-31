/**
 * Monitoring and Error Tracking Library
 * 
 * Provides error tracking, performance monitoring, and logging utilities.
 * In production, this can be connected to services like Sentry, DataDog, etc.
 */

import { logger } from "./logger";

// ============================================
// TYPES
// ============================================

export interface ErrorContext {
  context?: string;
  userId?: string;
  url?: string;
  digest?: string;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "s" | "bytes" | "count";
  tags?: Record<string, string>;
}

// ============================================
// CONFIGURATION
// ============================================

const config = {
  enabled: process.env.NODE_ENV === "production",
  debug: process.env.NODE_ENV === "development",
  slowThresholdMs: 500, // Log API routes slower than this
  sentryDsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
};

// ============================================
// INITIALIZATION
// ============================================

let isInitialized = false;

/**
 * Initialize monitoring services
 */
export function initMonitoring(): void {
  if (isInitialized) return;

  if (config.debug) {
    console.log("[MONITORING] Initializing in development mode");
  }

  // In production, initialize Sentry or other services here
  // Example Sentry initialization (uncomment when Sentry is added):
  // if (config.enabled && config.sentryDsn) {
  //   import("@sentry/nextjs").then((Sentry) => {
  //     Sentry.init({
  //       dsn: config.sentryDsn,
  //       environment: config.environment,
  //       release: config.release,
  //       tracesSampleRate: 0.1,
  //     });
  //   });
  // }

  isInitialized = true;
}

// ============================================
// ERROR TRACKING
// ============================================

/**
 * Capture and report an error
 */
export function captureError(
  error: Error | unknown,
  context?: ErrorContext
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Always log in development
  if (config.debug) {
    console.error("[ERROR]", errorObj.message, {
      stack: errorObj.stack,
      ...context,
    });
  }

  // In production, send to monitoring service
  if (config.enabled) {
    // Sentry.captureException(errorObj, { extra: context });
    
    // Log to our logger
    logger.error("[CAPTURED_ERROR]", {
      message: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
): void {
  if (config.debug) {
    console.log(`[${level.toUpperCase()}]`, message, context);
  }

  if (config.enabled) {
    // Sentry.captureMessage(message, { level, extra: context });
    logger.info(`[CAPTURED_MESSAGE:${level}]`, { message, ...context });
  }
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

const performanceMarks = new Map<string, number>();

/**
 * Start a performance measurement
 */
export function startMeasure(name: string): void {
  performanceMarks.set(name, performance.now());
}

/**
 * End a performance measurement and log if slow
 */
export function endMeasure(
  name: string,
  warnThresholdMs: number = config.slowThresholdMs
): number {
  const startTime = performanceMarks.get(name);
  if (!startTime) {
    console.warn(`[PERF] No start mark found for: ${name}`);
    return 0;
  }

  const duration = performance.now() - startTime;
  performanceMarks.delete(name);

  // Log slow operations
  if (duration > warnThresholdMs) {
    logSlowOperation(name, duration, warnThresholdMs);
  }

  return duration;
}

/**
 * Log a slow operation
 */
export function logSlowOperation(
  name: string,
  durationMs: number,
  thresholdMs: number
): void {
  const message = `Slow operation: ${name} took ${durationMs.toFixed(2)}ms (threshold: ${thresholdMs}ms)`;

  if (config.debug) {
    console.warn(`[SLOW_OPERATION] ${message}`);
  }

  logger.warn("[SLOW_OPERATION]", {
    name,
    durationMs: Math.round(durationMs),
    thresholdMs,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track a custom performance metric
 */
export function trackMetric(metric: PerformanceMetric): void {
  if (config.debug) {
    console.log(
      `[METRIC] ${metric.name}: ${metric.value}${metric.unit}`,
      metric.tags
    );
  }

  logger.info("[METRIC]", {
    ...metric,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// API ROUTE MONITORING WRAPPER
// ============================================

type ApiHandler = (...args: unknown[]) => Promise<Response>;

/**
 * Wrap an API route handler with performance monitoring
 */
export function withMonitoring<T extends ApiHandler>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const startTime = performance.now();

    try {
      const response = await handler(...args);
      const duration = performance.now() - startTime;

      // Log slow API routes
      if (duration > config.slowThresholdMs) {
        logSlowOperation(`API:${routeName}`, duration, config.slowThresholdMs);
      }

      // Track success metric
      trackMetric({
        name: `api.${routeName}.duration`,
        value: Math.round(duration),
        unit: "ms",
        tags: {
          status: String(response.status),
          success: String(response.ok),
        },
      });

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Capture error
      captureError(error, {
        context: `API:${routeName}`,
        duration: Math.round(duration),
      });

      // Track error metric
      trackMetric({
        name: `api.${routeName}.error`,
        value: 1,
        unit: "count",
        tags: {
          error: error instanceof Error ? error.name : "UnknownError",
        },
      });

      throw error;
    }
  }) as T;
}

// ============================================
// USER TRACKING
// ============================================

let currentUserId: string | null = null;

/**
 * Set the current user for error tracking context
 */
export function setUser(userId: string | null, email?: string): void {
  currentUserId = userId;

  if (config.debug) {
    console.log("[MONITORING] User set:", { userId, email });
  }

  // Sentry.setUser(userId ? { id: userId, email } : null);
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}

// ============================================
// BREADCRUMBS
// ============================================

interface Breadcrumb {
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;

/**
 * Add a breadcrumb for debugging errors
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const crumb: Breadcrumb = {
    category,
    message,
    data,
    timestamp: new Date(),
  };

  breadcrumbs.push(crumb);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  if (config.debug) {
    console.log(`[BREADCRUMB:${category}]`, message, data);
  }

  // Sentry.addBreadcrumb({ category, message, data, level: "info" });
}

/**
 * Get recent breadcrumbs (for debugging)
 */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// ============================================
// EXPORTS
// ============================================

export const monitoring = {
  init: initMonitoring,
  captureError,
  captureMessage,
  startMeasure,
  endMeasure,
  trackMetric,
  withMonitoring,
  setUser,
  addBreadcrumb,
  logSlowOperation,
};

export default monitoring;
