import type { UserRole } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

/**
 * NextAuth.js type extensions
 * 
 * Extends the default NextAuth types to include custom user properties
 * like `id` and `role` in both session and JWT.
 */

declare module "next-auth" {
  /**
   * Extended Session interface
   * Includes user id and role from database
   */
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  /**
   * Extended User interface
   * Includes role for internal use
   */
  interface User extends DefaultUser {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extended JWT interface
   * Stores user id and role in the token
   */
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
  }
}
