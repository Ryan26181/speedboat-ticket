import { z } from "zod";

/**
 * Environment variable schema with validation
 * 
 * This schema ensures all required environment variables
 * are present and correctly formatted at build/runtime.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  
  // Midtrans Payment Gateway
  MIDTRANS_SERVER_KEY: z.string().min(1, "MIDTRANS_SERVER_KEY is required"),
  MIDTRANS_CLIENT_KEY: z.string().min(1, "MIDTRANS_CLIENT_KEY is required"),
  MIDTRANS_IS_PRODUCTION: z.enum(["true", "false"]).default("false"),
  
  // App Config (optional)
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Validated environment variables
 * 
 * This will throw an error during build/startup if any
 * required environment variable is missing or invalid.
 */
function validateEnv() {
  // In development or test, we want helpful error messages
  // In production, we still validate but might want to fail silently
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    
    // In production, throw to prevent app from starting with invalid config
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
    
    // In development, warn but continue with partial validation
    console.warn("⚠️ Some environment variables are missing. Some features may not work.");
    
    return {
      DATABASE_URL: process.env.DATABASE_URL || "",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "development-secret-min-32-characters",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY || "",
      MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY || "",
      MIDTRANS_IS_PRODUCTION: (process.env.MIDTRANS_IS_PRODUCTION || "false") as "true" | "false",
      NODE_ENV: (process.env.NODE_ENV || "development") as "development" | "production" | "test",
    };
  }
  
  return parsed.data;
}

export const env = validateEnv();

/**
 * Type-safe environment variable access
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Check if we're in production mode
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Check if Midtrans is in production mode
 */
export const isMidtransProduction = env.MIDTRANS_IS_PRODUCTION === "true";

/**
 * Get the Midtrans API URL based on environment
 */
export const midtransApiUrl = isMidtransProduction
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

/**
 * Get the Midtrans Snap URL based on environment
 */
export const midtransSnapUrl = isMidtransProduction
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";
