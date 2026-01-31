import { Redis } from 'ioredis';
import { getRedisConnection } from './queue/connection';
import { logger } from './logger';

// ============================================
// TYPED CACHE KEYS
// ============================================

export const CACHE_KEYS = {
  // Schedule caching
  schedules: {
    list: (params: string) => `schedules:list:${params}`,
    detail: (id: string) => `schedules:detail:${id}`,
    availability: (id: string) => `schedules:seats:${id}`,
    byDate: (date: string) => `schedules:date:${date}`,
  },
  // Route caching
  routes: {
    list: (params: string) => `routes:list:${params}`,
    detail: (id: string) => `routes:detail:${id}`,
    active: () => 'routes:active',
  },
  // Port caching
  ports: {
    list: () => 'ports:list',
    detail: (id: string) => `ports:detail:${id}`,
    active: () => 'ports:active',
  },
  // Ship caching
  ships: {
    list: () => 'ships:list',
    detail: (id: string) => `ships:detail:${id}`,
    active: () => 'ships:active',
  },
  // Booking caching
  bookings: {
    status: (code: string) => `bookings:status:${code}`,
    detail: (id: string) => `bookings:detail:${id}`,
    user: (userId: string) => `bookings:user:${userId}`,
  },
  // Payment caching
  payments: {
    status: (orderId: string) => `payments:status:${orderId}`,
    pending: (bookingId: string) => `payments:pending:${bookingId}`,
  },
  // User/session caching
  users: {
    session: (userId: string) => `users:session:${userId}`,
    profile: (userId: string) => `users:profile:${userId}`,
  },
} as const;

// ============================================
// CACHE TTL PRESETS (in seconds)
// ============================================

export const CACHE_TTL = {
  // Short-lived (real-time data)
  REALTIME: 15,           // 15 seconds - availability, status
  SHORT: 30,              // 30 seconds - frequently changing data
  
  // Medium-lived (semi-static data)
  MEDIUM: 120,            // 2 minutes - schedules list
  STANDARD: 300,          // 5 minutes - default
  
  // Long-lived (static data)
  LONG: 900,              // 15 minutes - routes, ports
  EXTENDED: 3600,         // 1 hour - rarely changing data
  DAY: 86400,             // 24 hours - static reference data
} as const;

// ============================================
// CACHE WRAPPER
// ============================================

const DEFAULT_TTL = CACHE_TTL.STANDARD;
const KEY_PREFIX = 'speedboat:';

export class CacheService {
  private redis: Redis;
  private prefix: string;

  constructor(prefix: string = KEY_PREFIX) {
    this.redis = getRedisConnection();
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_GET_ERROR]', { key, error: errorMessage });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      await this.redis.setex(
        this.getKey(key),
        ttl,
        JSON.stringify(value)
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_SET_ERROR]', { key, error: errorMessage });
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_DELETE_ERROR]', { key, error: errorMessage });
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Delete by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(this.getKey(pattern));
      if (keys.length === 0) return 0;
      return await this.redis.del(...keys);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_DELETE_PATTERN_ERROR]', { pattern, error: errorMessage });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_EXISTS_ERROR]', { key, error: errorMessage });
      return false;
    }
  }

  /**
   * Increment value atomically
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(this.getKey(key), amount);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_INCREMENT_ERROR]', { key, error: errorMessage });
      return 0;
    }
  }

  /**
   * Set with expiry if not exists (for locks)
   */
  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.set(
        this.getKey(key),
        value,
        'EX',
        ttlSeconds,
        'NX'
      );
      return result === 'OK';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[CACHE_SETNX_ERROR]', { key, error: errorMessage });
      return false;
    }
  }
}

// ============================================
// SPECIALIZED CACHES
// ============================================

export const paymentCache = new CacheService('speedboat:payment:');
export const bookingCache = new CacheService('speedboat:booking:');
export const scheduleCache = new CacheService('speedboat:schedule:');
export const routeCache = new CacheService('speedboat:route:');
export const portCache = new CacheService('speedboat:port:');
export const shipCache = new CacheService('speedboat:ship:');

// Default cache instance for general use
export const cache = new CacheService();

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

/**
 * Invalidate all schedule-related caches
 */
export async function invalidateAllScheduleCaches(): Promise<void> {
  await scheduleCache.deleteByPattern('*');
  logger.info('[CACHE] Invalidated all schedule caches');
}

/**
 * Invalidate all route-related caches
 */
export async function invalidateAllRouteCaches(): Promise<void> {
  await routeCache.deleteByPattern('*');
  logger.info('[CACHE] Invalidated all route caches');
}

/**
 * Invalidate all port-related caches
 */
export async function invalidateAllPortCaches(): Promise<void> {
  await portCache.deleteByPattern('*');
  logger.info('[CACHE] Invalidated all port caches');
}

/**
 * Invalidate caches related to a specific schedule
 */
export async function invalidateScheduleById(scheduleId: string): Promise<void> {
  await Promise.all([
    scheduleCache.delete(`detail:${scheduleId}`),
    scheduleCache.delete(`seats:${scheduleId}`),
    scheduleCache.deleteByPattern('list:*'), // Invalidate all list caches
  ]);
  logger.info('[CACHE] Invalidated schedule caches', { scheduleId });
}

/**
 * Invalidate caches related to a specific route
 */
export async function invalidateRouteById(routeId: string): Promise<void> {
  await Promise.all([
    routeCache.delete(`detail:${routeId}`),
    routeCache.deleteByPattern('list:*'),
    routeCache.delete('active'),
  ]);
  logger.info('[CACHE] Invalidated route caches', { routeId });
}

// ============================================
// CACHE HELPERS
// ============================================

/**
 * Cache booking status
 */
export async function cacheBookingStatus(
  bookingCode: string,
  status: string
): Promise<void> {
  await bookingCache.set(`status:${bookingCode}`, { status }, 60); // 1 min
}

/**
 * Get cached booking status
 */
export async function getCachedBookingStatus(
  bookingCode: string
): Promise<string | null> {
  const cached = await bookingCache.get<{ status: string }>(`status:${bookingCode}`);
  return cached?.status || null;
}

/**
 * Invalidate booking cache
 */
export async function invalidateBookingCache(bookingCode: string): Promise<void> {
  await bookingCache.deleteByPattern(`*${bookingCode}*`);
}

/**
 * Cache schedule availability
 */
export async function cacheScheduleAvailability(
  scheduleId: string,
  availableSeats: number
): Promise<void> {
  await scheduleCache.set(`seats:${scheduleId}`, { availableSeats }, 30); // 30 sec
}

/**
 * Get cached schedule availability
 */
export async function getCachedScheduleAvailability(
  scheduleId: string
): Promise<number | null> {
  const cached = await scheduleCache.get<{ availableSeats: number }>(`seats:${scheduleId}`);
  return cached?.availableSeats ?? null;
}

/**
 * Invalidate schedule cache
 */
export async function invalidateScheduleCache(scheduleId: string): Promise<void> {
  await scheduleCache.deleteByPattern(`*${scheduleId}*`);
}

/**
 * Cache payment status
 */
export async function cachePaymentStatus(
  orderId: string,
  status: string,
  transactionId?: string
): Promise<void> {
  await paymentCache.set(`status:${orderId}`, { status, transactionId }, 120); // 2 min
}

/**
 * Get cached payment status
 */
export async function getCachedPaymentStatus(
  orderId: string
): Promise<{ status: string; transactionId?: string } | null> {
  return await paymentCache.get<{ status: string; transactionId?: string }>(`status:${orderId}`);
}

/**
 * Invalidate payment cache
 */
export async function invalidatePaymentCache(orderId: string): Promise<void> {
  await paymentCache.deleteByPattern(`*${orderId}*`);
}
