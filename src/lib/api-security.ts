/**
 * API Security Wrapper
 * Provides consistent security checks for all API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sanitizeObject, detectInjection } from "@/lib/sanitize";
import { ZodSchema, ZodError } from "zod";

// ============================================
// TYPES
// ============================================

export interface ApiContext {
  request: NextRequest;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  body?: unknown;
  params?: Record<string, string>;
}

export interface ApiHandlerOptions {
  // Authentication
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireOperator?: boolean;
  
  // Validation
  bodySchema?: ZodSchema;
  querySchema?: ZodSchema;
  
  // Size limits
  maxBodySize?: number;
}

export type ApiHandler = (ctx: ApiContext) => Promise<NextResponse>;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

// ============================================
// SECURE API WRAPPER
// ============================================

/**
 * Wrap API handler with security checks
 */
export function secureApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
): (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Resolve params if provided
      const params = context?.params ? await context.params : undefined;
      
      // 1. Check request size
      if (options.maxBodySize) {
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > options.maxBodySize) {
          return NextResponse.json(
            { error: "Payload too large" },
            { status: 413 }
          );
        }
      }
      
      // 2. Authentication check
      let user: ApiContext["user"];
      if (options.requireAuth || options.requireAdmin || options.requireOperator) {
        const session = await auth();
        
        if (!session?.user) {
          return NextResponse.json(
            { error: "Unauthorized", message: "Authentication required" },
            { status: 401 }
          );
        }
        
        user = {
          id: session.user.id!,
          email: session.user.email!,
          role: session.user.role || "USER",
        };
        
        // Admin check
        if (options.requireAdmin && user.role !== "ADMIN") {
          return NextResponse.json(
            { error: "Forbidden", message: "Admin access required" },
            { status: 403 }
          );
        }
        
        // Operator check (admin or operator)
        if (options.requireOperator && !["ADMIN", "OPERATOR"].includes(user.role)) {
          return NextResponse.json(
            { error: "Forbidden", message: "Operator access required" },
            { status: 403 }
          );
        }
      }
      
      // 3. Parse and validate body
      let body: unknown;
      if (["POST", "PUT", "PATCH"].includes(request.method.toUpperCase())) {
        const contentType = request.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
          try {
            body = await request.json();
            
            // Check for injection in body
            if (typeof body === "object" && body !== null) {
              const stringified = JSON.stringify(body);
              const injection = detectInjection(stringified);
              if (injection.detected) {
                console.warn("[SECURITY_WARNING] Injection attempt in body:", {
                  ip: getClientIP(request),
                  path: request.nextUrl.pathname,
                  types: injection.types,
                });
                // Sanitize the body
                body = sanitizeObject(body as Record<string, unknown>);
              }
            }
            
            // Validate against schema
            if (options.bodySchema) {
              body = options.bodySchema.parse(body);
            }
          } catch (error) {
            if (error instanceof ZodError) {
              return NextResponse.json(
                { 
                  error: "Validation failed", 
                  details: error.flatten().fieldErrors 
                },
                { status: 400 }
              );
            }
            return NextResponse.json(
              { error: "Invalid request body" },
              { status: 400 }
            );
          }
        }
      }
      
      // 4. Validate query parameters
      if (options.querySchema) {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams);
        try {
          options.querySchema.parse(searchParams);
        } catch (error) {
          if (error instanceof ZodError) {
            return NextResponse.json(
              { 
                error: "Invalid query parameters", 
                details: error.flatten().fieldErrors 
              },
              { status: 400 }
            );
          }
        }
      }
      
      // 5. Execute handler
      const ctx: ApiContext = { request, user, body, params };
      const response = await handler(ctx);
      
      // 6. Add security headers
      addSecurityHeaders(response);
      
      // Log slow requests
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[SLOW_API] ${request.method} ${request.nextUrl.pathname} took ${duration}ms`);
      }
      
      return response;
      
    } catch (error) {
      console.error("[API_ERROR]", error);
      
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Create authenticated API handler
 */
export function authApiHandler(handler: ApiHandler, options: Omit<ApiHandlerOptions, "requireAuth"> = {}) {
  return secureApiHandler(handler, { ...options, requireAuth: true });
}

/**
 * Create admin API handler
 */
export function adminApiHandler(handler: ApiHandler, options: Omit<ApiHandlerOptions, "requireAdmin"> = {}) {
  return secureApiHandler(handler, { ...options, requireAdmin: true });
}

/**
 * Create operator API handler
 */
export function operatorApiHandler(handler: ApiHandler, options: Omit<ApiHandlerOptions, "requireOperator"> = {}) {
  return secureApiHandler(handler, { ...options, requireOperator: true });
}

/**
 * Create public API handler
 */
export function publicApiHandler(handler: ApiHandler, options: ApiHandlerOptions = {}) {
  return secureApiHandler(handler, { ...options, requireAuth: false });
}
