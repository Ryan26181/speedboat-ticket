import { handlers } from "@/lib/auth";

/**
 * NextAuth.js API Route Handler
 * 
 * Exports GET and POST handlers for NextAuth endpoints:
 * - GET /api/auth/signin
 * - GET /api/auth/signout
 * - GET /api/auth/session
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 * - GET /api/auth/callback/:provider
 * - POST /api/auth/signin/:provider
 * - POST /api/auth/signout
 * - POST /api/auth/callback/:provider
 */

export const { GET, POST } = handlers;
