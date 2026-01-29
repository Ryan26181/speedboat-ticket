import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a new QueryClient instance with default options
 * 
 * Configuration:
 * - staleTime: Data is fresh for 1 minute
 * - retry: Only retry failed requests once
 * - refetchOnWindowFocus: Disabled to prevent unwanted refetches
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 1 minute
        staleTime: 60 * 1000,
        // Only retry failed requests once
        retry: 1,
        // Don't refetch when window regains focus
        refetchOnWindowFocus: false,
        // Garbage collection time: 5 minutes
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
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
