/**
 * Cache-Control HTTP Header Utilities
 * 
 * Provides standardized cache headers for API responses
 */

// ============================================
// CACHE PROFILES
// ============================================

export const CACHE_PROFILES = {
  /**
   * Public caching - can be cached by CDN and browsers
   * Use for: public data like schedules, routes, ports
   */
  public: (maxAge: number, staleWhileRevalidate?: number) => ({
    'Cache-Control': staleWhileRevalidate
      ? `public, max-age=${maxAge}, s-maxage=${maxAge * 2}, stale-while-revalidate=${staleWhileRevalidate}`
      : `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`,
  }),

  /**
   * Private caching - only browser can cache
   * Use for: user-specific data like bookings, profile
   */
  private: (maxAge: number) => ({
    'Cache-Control': `private, max-age=${maxAge}`,
  }),

  /**
   * No caching - always fresh
   * Use for: real-time data, mutations, auth endpoints
   */
  noCache: () => ({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  }),

  /**
   * Immutable - content never changes
   * Use for: versioned assets, static resources with hash
   */
  immutable: (maxAge: number = 31536000) => ({
    'Cache-Control': `public, max-age=${maxAge}, immutable`,
  }),

  /**
   * Revalidate - must check with server before using cache
   * Use for: frequently changing data that needs freshness validation
   */
  revalidate: (maxAge: number) => ({
    'Cache-Control': `public, max-age=${maxAge}, must-revalidate`,
    'ETag': `"${Date.now()}"`,
  }),
} as const;

// ============================================
// API ROUTE CACHE CONFIG
// ============================================

export const API_CACHE_CONFIG = {
  // Public GET endpoints
  schedules: {
    list: CACHE_PROFILES.public(120, 60),      // 2 min fresh, 1 min stale
    detail: CACHE_PROFILES.public(60, 30),      // 1 min fresh, 30s stale
  },
  routes: {
    list: CACHE_PROFILES.public(3600, 300),     // 1 hour fresh, 5 min stale
    detail: CACHE_PROFILES.public(1800, 120),   // 30 min fresh, 2 min stale
  },
  ports: {
    list: CACHE_PROFILES.public(3600, 300),     // 1 hour fresh, 5 min stale
    detail: CACHE_PROFILES.public(3600, 300),   // 1 hour fresh, 5 min stale
  },
  ships: {
    list: CACHE_PROFILES.public(1800, 120),     // 30 min fresh, 2 min stale
    detail: CACHE_PROFILES.public(1800, 120),   // 30 min fresh, 2 min stale
  },

  // Private/authenticated endpoints
  bookings: {
    list: CACHE_PROFILES.private(60),           // 1 min private cache
    detail: CACHE_PROFILES.private(30),         // 30s private cache
  },
  users: {
    profile: CACHE_PROFILES.private(300),       // 5 min private cache
  },

  // No cache endpoints
  auth: CACHE_PROFILES.noCache(),
  payments: CACHE_PROFILES.noCache(),
  webhooks: CACHE_PROFILES.noCache(),
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Apply cache headers to NextResponse
 */
export function applyCacheHeaders(
  headers: Headers,
  profile: ReturnType<typeof CACHE_PROFILES.public | typeof CACHE_PROFILES.private | typeof CACHE_PROFILES.noCache>
): void {
  Object.entries(profile).forEach(([key, value]) => {
    headers.set(key, value);
  });
}

/**
 * Create response with cache headers
 */
export function withCacheHeaders<T>(
  data: T,
  profile: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...profile,
    },
  });
}

/**
 * Generate ETag from data
 */
export function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

/**
 * Check if request has valid cached version (ETag)
 */
export function isNotModified(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get('If-None-Match');
  return ifNoneMatch === etag;
}

/**
 * Create 304 Not Modified response
 */
export function notModifiedResponse(etag: string): Response {
  return new Response(null, {
    status: 304,
    headers: {
      'ETag': etag,
    },
  });
}

// ============================================
// CACHE KEY BUILDER FOR URL PARAMS
// ============================================

/**
 * Build a stable cache key from URL search params
 * Sorts params alphabetically for consistent keys
 */
export function buildCacheKeyFromParams(searchParams: URLSearchParams): string {
  const params = Array.from(searchParams.entries())
    .filter(([, value]) => value) // Remove empty values
    .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return params || 'default';
}
