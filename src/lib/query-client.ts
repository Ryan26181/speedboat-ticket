import { QueryClient } from "@tanstack/react-query";

// ============================================
// QUERY KEYS FACTORY
// ============================================

export const queryKeys = {
  // Schedules
  schedules: {
    all: ['schedules'] as const,
    lists: () => [...queryKeys.schedules.all, 'list'] as const,
    list: (params: unknown) => [...queryKeys.schedules.lists(), params] as const,
    details: () => [...queryKeys.schedules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.schedules.details(), id] as const,
    availability: (id: string) => [...queryKeys.schedules.all, 'availability', id] as const,
  },
  
  // Routes
  routes: {
    all: ['routes'] as const,
    lists: () => [...queryKeys.routes.all, 'list'] as const,
    list: (params?: unknown) => [...queryKeys.routes.lists(), params] as const,
    details: () => [...queryKeys.routes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.routes.details(), id] as const,
  },
  
  // Ports
  ports: {
    all: ['ports'] as const,
    lists: () => [...queryKeys.ports.all, 'list'] as const,
    list: (params?: unknown) => [...queryKeys.ports.lists(), params] as const,
    details: () => [...queryKeys.ports.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.ports.details(), id] as const,
  },
  
  // Ships
  ships: {
    all: ['ships'] as const,
    lists: () => [...queryKeys.ships.all, 'list'] as const,
    list: (params?: unknown) => [...queryKeys.ships.lists(), params] as const,
    details: () => [...queryKeys.ships.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.ships.details(), id] as const,
  },
  
  // Bookings
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (params?: unknown) => [...queryKeys.bookings.lists(), params] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
    byCode: (code: string) => [...queryKeys.bookings.all, 'code', code] as const,
    user: (userId: string) => [...queryKeys.bookings.all, 'user', userId] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
  },
  
  // Tickets
  tickets: {
    all: ['tickets'] as const,
    byBooking: (bookingId: string) => [...queryKeys.tickets.all, 'booking', bookingId] as const,
    detail: (id: string) => [...queryKeys.tickets.all, 'detail', id] as const,
  },
} as const;

// ============================================
// STALE TIME CONFIGURATION
// ============================================

export const STALE_TIMES = {
  // Real-time data - very short
  realtime: 15 * 1000,        // 15 seconds
  
  // Frequently changing
  schedules: 2 * 60 * 1000,   // 2 minutes
  availability: 30 * 1000,     // 30 seconds
  
  // Semi-static data
  routes: 10 * 60 * 1000,     // 10 minutes
  ports: 30 * 60 * 1000,      // 30 minutes
  ships: 15 * 60 * 1000,      // 15 minutes
  
  // User data
  bookings: 60 * 1000,        // 1 minute
  profile: 5 * 60 * 1000,     // 5 minutes
  
  // Default
  default: 60 * 1000,         // 1 minute
} as const;

// ============================================
// GC TIME CONFIGURATION (cache retention)
// ============================================

export const GC_TIMES = {
  short: 5 * 60 * 1000,       // 5 minutes
  medium: 15 * 60 * 1000,     // 15 minutes
  long: 60 * 60 * 1000,       // 1 hour
  default: 10 * 60 * 1000,    // 10 minutes
} as const;

// ============================================
// QUERY CLIENT FACTORY
// ============================================

/**
 * Creates a new QueryClient instance with optimized options
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time
        staleTime: STALE_TIMES.default,
        // Garbage collection time
        gcTime: GC_TIMES.default,
        // Only retry failed requests once
        retry: 1,
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Don't refetch when window regains focus (user-initiated)
        refetchOnWindowFocus: false,
        // Refetch on reconnect
        refetchOnReconnect: true,
        // Network mode - always attempt even offline (use cache)
        networkMode: 'offlineFirst',
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get the singleton QueryClient instance
 * 
 * On the server, always create a new QueryClient to avoid
 * sharing state between requests.
 * 
 * On the client, reuse the same QueryClient instance.
 */
export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Default query client for direct exports
 */
export const queryClient = getQueryClient();

