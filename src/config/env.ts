/**
 * Environment Variables
 *
 * This file centralizes all environment variable access and provides
 * type-safety and validation.
 */

import { z } from "zod";

// Schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().optional().or(z.literal("")),
  DIRECT_URL: z.string().optional().or(z.literal("")),

  // Auth
  CLERK_SECRET_KEY: z.string().optional().or(z.literal("")),
  CLERK_WEBHOOK_SECRET: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),

  // API services
  UPLOADTHING_SECRET: z.string().optional().or(z.literal("")),
  UPLOADTHING_APP_ID: z.string().optional().or(z.literal("")),

  // Midtrans
  MIDTRANS_SERVER_KEY: z.string().optional().or(z.literal("")),
  MIDTRANS_CLIENT_KEY: z.string().optional().or(z.literal("")),

  // Public URL
  NEXT_PUBLIC_APP_URL: z.string().optional().or(z.literal("")),

  // Email
  RESEND_API_KEY: z.string().optional().or(z.literal("")),

  // Social Media APIs
  FACEBOOK_APP_ID: z.string().optional().or(z.literal("")),
  FACEBOOK_APP_SECRET: z.string().optional().or(z.literal("")),
});

// Parse and validate environment variables
function getEnv() {
  try {
    // In server components/api routes, we can access process.env directly
    if (typeof process !== "undefined" && process.env) {
      return envSchema.parse(process.env);
    }

    // In client components, we can only access NEXT_PUBLIC_* variables
    const clientEnv = {
      NODE_ENV: process.env?.NODE_ENV || "development",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env?.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env?.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up",
      NEXT_PUBLIC_APP_URL: process.env?.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_MIDTRANS_CLIENT_KEY:
        process.env?.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
      NEXT_PUBLIC_MIDTRANS_SNAP_URL: process.env?.NEXT_PUBLIC_MIDTRANS_SNAP_URL,
    };

    return envSchema.parse(clientEnv);
  } catch (error) {
    // Fallback for build time when environment variables might not be available
    console.warn("Environment variables validation failed, using fallback values:", error);
    return {
      NODE_ENV: "development" as const,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    };
  }
}

// Lazy load environment variables to avoid build-time execution
let _env: ReturnType<typeof getEnv> | null = null;

export function getEnvironment() {
  if (!_env) {
    try {
      _env = getEnv();
    } catch (error) {
      console.warn("Failed to load environment variables, using fallback:", error);
      _env = {
        NODE_ENV: "development" as const,
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
      };
    }
  }
  return _env;
}

// Helper function to check if required environment variables are available
export function validateRequiredEnvVars() {
  const env = getEnvironment();
  const missing: string[] = [];
  
  // Check critical environment variables
  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  
  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
    console.warn('Application may not function correctly without these variables.');
  }
  
  return { isValid: missing.length === 0, missing };
}

// Export validated environment variables (deprecated - use getEnvironment() instead)
export const env = typeof process !== 'undefined' && process.env.NODE_ENV !== 'test' ? getEnvironment() : {} as any;
