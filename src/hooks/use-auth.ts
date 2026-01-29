"use client";

import { useSession } from "next-auth/react";
import type { UserRole } from "@prisma/client";

/**
 * Authentication state interface
 */
interface AuthState {
  /** Current user data */
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: UserRole;
  } | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the user has admin role */
  isAdmin: boolean;
  /** Whether the user has operator role */
  isOperator: boolean;
  /** Whether the user has regular user role */
  isUser: boolean;
  /** Whether the session is loading */
  isLoading: boolean;
  /** Session status */
  status: "loading" | "authenticated" | "unauthenticated";
}

/**
 * Custom hook for accessing authentication state
 * 
 * Provides convenient access to:
 * - Current user information
 * - Authentication status
 * - Role-based checks
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, isAdmin } = useAuth();
 * 
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginPrompt />;
 * if (isAdmin) return <AdminPanel />;
 * ```
 */
export function useAuth(): AuthState {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!session?.user;

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        role: session.user.role,
      }
    : null;

  const role = user?.role;

  return {
    user,
    isAuthenticated,
    isAdmin: role === "ADMIN",
    isOperator: role === "OPERATOR",
    isUser: role === "USER",
    isLoading,
    status,
  };
}

/**
 * Hook to check if user has required role
 * 
 * @param allowedRoles - Array of roles that are allowed
 * @returns Whether the user has one of the allowed roles
 * 
 * @example
 * ```tsx
 * const canManageShips = useHasRole(["ADMIN", "OPERATOR"]);
 * ```
 */
export function useHasRole(allowedRoles: UserRole[]): boolean {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return false;
  }

  return allowedRoles.includes(user.role);
}

/**
 * Hook to require authentication
 * Throws if user is not authenticated (use with error boundary)
 * 
 * @returns Authenticated user data
 */
export function useRequireAuth() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return { user: null, isLoading: true };
  }

  if (!isAuthenticated || !user) {
    throw new Error("Authentication required");
  }

  return { user, isLoading: false };
}
