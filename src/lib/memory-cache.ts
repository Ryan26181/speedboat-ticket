/**
 * Simple in-memory cache for edge/serverless environments
 * Falls back to this when Redis is not available
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup expired entries every minute
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlSeconds);
    return value;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const memoryCache = new MemoryCache();

// Cache keys
export const CACHE_KEYS = {
  PORTS_ALL: 'ports:all',
  ROUTES_ACTIVE: 'routes:active',
  SCHEDULES_SEARCH: (params: string) => `schedules:search:${params}`,
} as const;

// TTL values in seconds
export const CACHE_TTL = {
  PORTS: 300, // 5 minutes - ports rarely change
  ROUTES: 300, // 5 minutes - routes rarely change
  SCHEDULES: 30, // 30 seconds - schedules change more frequently
  SEARCH_RESULTS: 60, // 1 minute - search results
} as const;
