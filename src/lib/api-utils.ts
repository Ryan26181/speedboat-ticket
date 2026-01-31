import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import type { ApiResponse, PaginatedResponse } from "@/types";

// ============================================
// Response Helpers
// ============================================

/**
 * Create a success response with data
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors,
    },
    { status }
  );
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<ApiResponse<PaginatedResponse<T>>> {
  const totalPages = Math.ceil(total / limit);
  
  return NextResponse.json({
    success: true,
    data: {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
}

// ============================================
// Validation Helper
// ============================================

/**
 * Validate request data against a Zod schema
 */
export async function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string[]> }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string[]> = {};
      
      for (const issue of error.issues) {
        const path = issue.path.join(".") || "root";
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(issue.message);
      }
      
      return { success: false, errors };
    }
    throw error;
  }
}

// ============================================
// Auth Helpers for API Routes
// ============================================

/**
 * Get the authenticated user from the session
 */
export async function getAuthUser(): Promise<User | null> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  
  return user;
}

/**
 * Require an authenticated user, throws if not authenticated
 */
export async function requireAuthUser(): Promise<User> {
  const user = await getAuthUser();
  
  if (!user) {
    throw new AuthError("Authentication required", 401);
  }
  
  return user;
}

/**
 * Require ADMIN role
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuthUser();
  
  if (user.role !== "ADMIN") {
    throw new AuthError("Admin access required", 403);
  }
  
  return user;
}

/**
 * Require OPERATOR or ADMIN role
 */
export async function requireOperator(): Promise<User> {
  const user = await requireAuthUser();
  
  if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
    throw new AuthError("Operator access required", 403);
  }
  
  return user;
}

// ============================================
// Custom Error Classes
// ============================================

export class AuthError extends Error {
  status: number;
  
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class ValidationError extends Error {
  errors: Record<string, string[]>;
  
  constructor(message: string, errors: Record<string, string[]>) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// ============================================
// Error Handler
// ============================================

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`[${context}]`, error);
  
  // Auth errors
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.status);
  }
  
  // Validation errors
  if (error instanceof ValidationError) {
    return errorResponse(error.message, 400, error.errors);
  }
  
  // Not found errors
  if (error instanceof NotFoundError) {
    return errorResponse(error.message, 404);
  }
  
  // Conflict errors
  if (error instanceof ConflictError) {
    return errorResponse(error.message, 409);
  }
  
  // Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "root";
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    }
    return errorResponse("Validation failed", 400, errors);
  }
  
  // Prisma errors
  if (isPrismaError(error)) {
    return handlePrismaError(error);
  }
  
  // Generic error
  return errorResponse("Internal server error", 500);
}

// ============================================
// Prisma Error Handling
// ============================================

interface PrismaError {
  code: string;
  meta?: {
    target?: string[];
    field_name?: string;
  };
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PrismaError).code === "string"
  );
}

function handlePrismaError(error: PrismaError): NextResponse {
  switch (error.code) {
    case "P2002": // Unique constraint violation
      const field = error.meta?.target?.[0] || "field";
      return errorResponse(`A record with this ${field} already exists`, 409);
    
    case "P2003": // Foreign key constraint violation
      return errorResponse("Related record not found", 400);
    
    case "P2025": // Record not found
      return errorResponse("Record not found", 404);
    
    case "P2014": // Required relation violation
      return errorResponse("Cannot delete record with existing relations", 400);
    
    default:
      return errorResponse("Database error", 500);
  }
}

// ============================================
// IDOR Protection Helpers
// ============================================

/**
 * Require access to a booking (IDOR Protection)
 * Users can only access their own bookings unless admin/operator
 * @param bookingId - The booking ID to check
 * @throws NotFoundError if booking doesn't exist
 * @throws AuthError if user doesn't have access
 */
export async function requireBookingAccess(bookingId: string): Promise<{
  booking: { id: string; userId: string; bookingCode: string };
  user: { id: string; role: string };
}> {
  const user = await requireAuthUser();
  
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, bookingCode: true },
  });
  
  if (!booking) {
    throw new NotFoundError("Booking");
  }
  
  // Admin and Operator can access all bookings
  const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";
  
  // Regular users can only access their own bookings
  if (!isAdminOrOperator && booking.userId !== user.id) {
    throw new AuthError("You don't have permission to access this booking");
  }
  
  return { booking, user };
}

/**
 * Require access to a ticket (IDOR Protection)
 * Users can only access tickets from their own bookings unless admin/operator
 * @param ticketId - The ticket ID to check
 * @throws NotFoundError if ticket doesn't exist  
 * @throws AuthError if user doesn't have access
 */
export async function requireTicketAccess(ticketId: string): Promise<{
  ticket: { id: string; ticketCode: string; bookingId: string };
  user: { id: string; role: string };
}> {
  const user = await requireAuthUser();
  
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      ticketCode: true,
      bookingId: true,
      booking: {
        select: { userId: true },
      },
    },
  });
  
  if (!ticket) {
    throw new NotFoundError("Ticket");
  }
  
  // Admin and Operator can access all tickets
  const isAdminOrOperator = user.role === "ADMIN" || user.role === "OPERATOR";
  
  // Regular users can only access tickets from their own bookings
  if (!isAdminOrOperator && ticket.booking.userId !== user.id) {
    throw new AuthError("You don't have permission to access this ticket");
  }
  
  return {
    ticket: { id: ticket.id, ticketCode: ticket.ticketCode, bookingId: ticket.bookingId },
    user,
  };
}

// ============================================
// Query Helpers
// ============================================

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limitParam = searchParams.get("limit");
  
  // If limit is -1, return all records (useful for dropdowns)
  if (limitParam === "-1") {
    return { page: 1, limit: -1, skip: 0 };
  }
  
  const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10", 10)));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

/**
 * Parse search param
 */
export function parseSearchParam(searchParams: URLSearchParams): string | undefined {
  const search = searchParams.get("search")?.trim();
  return search && search.length > 0 ? search : undefined;
}

/**
 * Parse status filter param
 */
export function parseStatusParam<T extends string>(
  searchParams: URLSearchParams,
  validStatuses: T[]
): T | undefined {
  const status = searchParams.get("status") as T;
  return validStatuses.includes(status) ? status : undefined;
}
