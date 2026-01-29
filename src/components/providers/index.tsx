"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth-provider";
import { getQueryClient } from "@/lib/query-client";

/**
 * Providers Props
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Combined Providers Component
 * 
 * Wraps the application with all necessary providers:
 * - AuthProvider (NextAuth SessionProvider)
 * - QueryClientProvider (React Query)
 * - Toaster (Sonner toast notifications)
 * 
 * Providers are nested in a specific order to ensure
 * proper dependency resolution.
 * 
 * @param children - Child components
 */
export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          duration={4000}
          toastOptions={{
            classNames: {
              error: "bg-destructive text-destructive-foreground",
              success: "bg-green-500 text-white",
              warning: "bg-yellow-500 text-white",
              info: "bg-blue-500 text-white",
            },
          }}
        />
      </AuthProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export { AuthProvider };
