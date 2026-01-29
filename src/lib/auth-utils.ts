import { auth } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "UNAUTHORIZED" | "FORBIDDEN"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Get the current session
 * Server-side only
 * 
 * @returns Current session or null
 */
export async function getSession(): Promise<Session | null> {
  return await auth();
}

/**
 * Get the current authenticated user
 * Server-side only
 * 
 * @returns User object or null if not authenticated
 * 
 * @example
 * ```ts
 * const user = await getCurrentUser();
 * if (!user) {
 *   redirect("/login");
 * }
 * ```
 */
export async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

/**
 * Get the current user or throw an error
 * Server-side only
 * 
 * @throws AuthError if not authenticated
 * @returns Authenticated user object
 * 
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   const user = await requireAuth();
 *   // User is guaranteed to exist here
 * }
 * ```
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError("Authentication required", "UNAUTHENTICATED");
  }

  return user;
}

/**
 * Require authentication and redirect if not authenticated
 * For use in Server Components
 * 
 * @param redirectTo - URL to redirect to if not authenticated
 * @returns Authenticated user object
 * 
 * @example
 * ```ts
 * export default async function DashboardPage() {
 *   const user = await requireAuthRedirect();
 *   return <Dashboard user={user} />;
 * }
 * ```
 */
export async function requireAuthRedirect(redirectTo: string = "/login") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Require specific role(s) for access
 * Server-side only
 * 
 * @param allowedRoles - Array of roles that are allowed
 * @throws AuthError if not authenticated or wrong role
 * @returns Authenticated user with valid role
 * 
 * @example
 * ```ts
 * export async function DELETE(request: Request) {
 *   const user = await requireRole(["ADMIN"]);
 *   // Only admins can reach here
 * }
 * ```
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      "FORBIDDEN"
    );
  }

  return user;
}

/**
 * Require role and redirect if not authorized
 * For use in Server Components
 * 
 * @param allowedRoles - Array of roles that are allowed
 * @param redirectTo - URL to redirect to if not authorized
 * @returns Authenticated user with valid role
 * 
 * @example
 * ```ts
 * export default async function AdminPage() {
 *   const user = await requireRoleRedirect(["ADMIN"], "/dashboard");
 *   return <AdminPanel user={user} />;
 * }
 * ```
 */
export async function requireRoleRedirect(
  allowedRoles: UserRole[],
  redirectTo: string = "/dashboard"
) {
  const user = await requireAuthRedirect();

  if (!allowedRoles.includes(user.role)) {
    redirect(redirectTo);
  }

  return user;
}

/**
 * Check if user has specific role
 * Server-side only
 * 
 * @param allowedRoles - Array of roles to check
 * @returns Whether the user has one of the allowed roles
 */
export async function hasRole(allowedRoles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role);
}

/**
 * Check if current user is admin
 * Server-side only
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(["ADMIN"]);
}

/**
 * Check if current user is operator
 * Server-side only
 */
export async function isOperator(): Promise<boolean> {
  return hasRole(["ADMIN", "OPERATOR"]);
}

/**
 * Validate API request authentication
 * For use in API routes
 * 
 * @returns Object with user and response helpers
 * 
 * @example
 * ```ts
 * export async function GET(request: Request) {
 *   const { user, unauthorized } = await validateApiAuth();
 *   if (!user) return unauthorized();
 *   // Continue with authenticated user
 * }
 * ```
 */
export async function validateApiAuth() {
  const user = await getCurrentUser();

  return {
    user,
    unauthorized: () =>
      Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    forbidden: () =>
      Response.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
  };
}

/**
 * Validate API request with role check
 * For use in API routes
 * 
 * @param allowedRoles - Array of roles that are allowed
 * @returns Object with user and response helpers
 */
export async function validateApiRole(allowedRoles: UserRole[]) {
  const { user, unauthorized, forbidden } = await validateApiAuth();

  if (!user) {
    return { user: null, unauthorized, forbidden, hasAccess: false };
  }

  const hasAccess = allowedRoles.includes(user.role);

  return { user, unauthorized, forbidden, hasAccess };
}
