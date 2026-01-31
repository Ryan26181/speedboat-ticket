'use client';

import { useState, useEffect, useCallback } from 'react';
import { CSRF_CONSTANTS } from '@/lib/csrf';

/**
 * React hook for CSRF protection
 * 
 * Usage:
 * const { csrfToken, fetchWithCsrf, isLoading } = useCsrf();
 * 
 * // Include token in fetch headers
 * await fetchWithCsrf('/api/endpoint', { method: 'POST', body: ... });
 * 
 * // Or manually add to headers
 * fetch('/api/endpoint', {
 *   headers: { [CSRF_HEADER_NAME]: csrfToken }
 * });
 */

interface UseCsrfReturn {
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>;
  refresh: () => Promise<void>;
}

export function useCsrf(): UseCsrfReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      setCsrfToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[CSRF_FETCH_ERROR]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const fetchWithCsrf = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      if (!csrfToken) {
        // Try to fetch token if not available
        await fetchToken();
      }

      const headers = new Headers(options.headers);
      
      if (csrfToken) {
        headers.set(CSRF_CONSTANTS.HEADER_NAME, csrfToken);
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    },
    [csrfToken, fetchToken]
  );

  return {
    csrfToken,
    isLoading,
    error,
    fetchWithCsrf,
    refresh: fetchToken,
  };
}

export default useCsrf;

