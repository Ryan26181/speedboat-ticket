import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "./prisma";
import type { UserRole } from "@prisma/client";
import { verifyPassword } from "./password";
import { loginSchema } from "@/validations/auth";
import { 
  isAccountLocked, 
  recordFailedAttempt, 
  resetFailedAttempts,
  formatLockoutDuration 
} from "./account-lockout";
import { 
  checkRateLimit, 
  RATE_LIMITS,
  resetRateLimit 
} from "./rate-limit-edge";

/**
 * NextAuth.js v5 Configuration
 * 
 * - Uses Prisma adapter for database persistence
 * - Google OAuth provider (preserved)
 * - Credentials provider for email/password
 * - JWT session strategy for edge compatibility
 * - Custom callbacks to include user role in session
 * - Account lockout protection
 * - Rate limiting on login
 */

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        // Validate input
        const result = loginSchema.safeParse(credentials);
        if (!result.success) {
          throw new Error("Invalid email or password");
        }

        const { email, password } = result.data;

        // Rate limiting by email
        const rateLimitId = `login:email:${email.toLowerCase()}`;
        const rateLimit = checkRateLimit(
          rateLimitId,
          RATE_LIMITS.login.windowMs,
          RATE_LIMITS.login.maxRequests
        );

        if (!rateLimit.allowed) {
          const minutes = Math.ceil(rateLimit.retryAfterMs / 1000 / 60);
          throw new Error(`Too many login attempts. Please try again in ${minutes} minutes.`);
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            emailVerified: true,
            role: true,
            failedLoginAttempts: true,
            lockedUntil: true,
          },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // Check account lockout
        const lockStatus = await isAccountLocked(user.email);
        if (lockStatus.isLocked && lockStatus.lockedUntil) {
          const duration = formatLockoutDuration(lockStatus.lockedUntil);
          throw new Error(`Account is locked. Please try again in ${duration}.`);
        }

        // Check if user has password (credentials account)
        if (!user.password) {
          throw new Error("Please sign in with Google for this account");
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password);

        if (!isValidPassword) {
          // Record failed attempt
          const failedResult = await recordFailedAttempt(user.email);
          
          if (failedResult.isNowLocked && failedResult.lockedUntil) {
            const duration = formatLockoutDuration(failedResult.lockedUntil);
            throw new Error(`Too many failed attempts. Account locked for ${duration}.`);
          }
          
          const remaining = lockStatus.remainingAttempts;
          if (remaining <= 2 && remaining > 0) {
            throw new Error(`Invalid password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`);
          }
          
          throw new Error("Invalid email or password");
        }

        // Check email verification
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox for the verification link.");
        }

        // Success - reset failed attempts and rate limit
        await resetFailedAttempts(user.email);
        resetRateLimit(rateLimitId);

        // Return user object (without password)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * JWT callback - runs on token creation and update
     * Adds user id, role, and passwordChangedAt to the token
     */
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - user object is available
      if (user && user.id) {
        token.id = user.id;
        // For credentials, role is already in user object
        // For OAuth, fetch from database
        if (user.role) {
          token.role = user.role;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, passwordChangedAt: true },
          });
          token.role = dbUser?.role ?? "USER";
          // Store passwordChangedAt timestamp for security validation
          if (dbUser?.passwordChangedAt) {
            token.passwordChangedAt = dbUser.passwordChangedAt.getTime();
          }
        }
        
        // Fetch passwordChangedAt for credentials login
        if (!token.passwordChangedAt) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { passwordChangedAt: true },
          });
          if (dbUser?.passwordChangedAt) {
            token.passwordChangedAt = dbUser.passwordChangedAt.getTime();
          }
        }
      }

      // Handle session update (e.g., role change)
      if (trigger === "update" && session?.role) {
        token.role = session.role as UserRole;
      }

      return token;
    },

    /**
     * Session callback - runs when session is checked
     * Exposes user id and role to the client
     * Validates that password hasn't changed since token was issued
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        
        // Security: Check if password was changed after JWT was issued
        // This invalidates sessions when user changes password
        if (token.passwordChangedAt && token.iat) {
          const passwordChangedAt = token.passwordChangedAt as number;
          const tokenIssuedAt = (token.iat as number) * 1000; // Convert to milliseconds
          
          if (passwordChangedAt > tokenIssuedAt) {
            // Password was changed after token was issued
            // Return empty session to force re-authentication
            throw new Error("Session expired due to password change. Please sign in again.");
          }
        }
      }
      return session;
    },

    /**
     * Authorized callback - controls access to routes
     * Used by middleware for route protection
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes - always accessible
      const publicRoutes = ["/", "/login", "/register", "/schedules", "/api/webhooks"];
      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith("/api/auth")
      );

      // Auth pages that don't require login
      const authPages = ["/auth/register", "/auth/verify-email", "/auth/forgot-password", "/auth/reset-password"];
      const isAuthPage = authPages.some((page) => pathname.startsWith(page));

      if (isPublicRoute || isAuthPage) {
        return true;
      }

      // Dashboard routes - require authentication (route groups don't create URL segments)
      const isDashboardRoute = pathname.startsWith("/admin") || pathname.startsWith("/user") || pathname.startsWith("/operator");
      if (isDashboardRoute) {
        if (!isLoggedIn) {
          return false; // Redirect to login
        }

        // Admin routes
        const isAdminRoute = pathname.startsWith("/admin");
        if (isAdminRoute && auth.user.role !== "ADMIN") {
          return Response.redirect(new URL("/user", nextUrl));
        }

        // Operator routes
        const isOperatorRoute = pathname.startsWith("/operator");
        if (isOperatorRoute && !["ADMIN", "OPERATOR"].includes(auth.user.role)) {
          return Response.redirect(new URL("/user", nextUrl));
        }

        return true;
      }

      // API routes (non-public) - require authentication
      const isApiRoute = pathname.startsWith("/api");
      if (isApiRoute && !isLoggedIn) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return true;
    },

    /**
     * Sign in callback - runs on every sign in attempt
     */
    async signIn({ user, account }) {
      // Allow OAuth sign in
      if (account?.provider === "google") {
        // Auto-verify email for Google users
        if (user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, emailVerified: true },
          });
          
          if (existingUser && !existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            });
          }
        }
        return true;
      }

      // For credentials, authorize() handles everything
      return true;
    },
  },
  events: {
    /**
     * Create user event - set default role
     */
    async createUser({ user }) {
      // User already created by adapter, role defaults to USER in schema
      console.log(`New user created: ${user.email}`);
    },
  },
  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export { authConfig };
