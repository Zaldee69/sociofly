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
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // Auth
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/auth/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/auth/sign-up"),

  // API services
  UPLOADTHING_SECRET: z.string().min(1).optional(),
  UPLOADTHING_APP_ID: z.string().min(1).optional(),

  // Midtrans
  MIDTRANS_SERVER_KEY: z.string().min(1),
  MIDTRANS_CLIENT_KEY: z.string().min(1),

  // Public URL
  NEXT_PUBLIC_APP_URL: z.string().min(1),

  // Email
  RESEND_API_KEY: z.string().min(1).optional(),

  // Social Media APIs
  FACEBOOK_APP_ID: z.string().min(1).optional(),
  FACEBOOK_APP_SECRET: z.string().min(1).optional(),
});

// Parse and validate environment variables
function getEnv() {
  // In server components/api routes, we can access process.env directly
  if (typeof process !== "undefined" && process.env) {
    return envSchema.parse(process.env);
  }

  // In client components, we can only access NEXT_PUBLIC_* variables
  const clientEnv = {
    NODE_ENV: process.env?.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env?.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env?.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_APP_URL: process.env?.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MIDTRANS_CLIENT_KEY:
      process.env?.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    NEXT_PUBLIC_MIDTRANS_SNAP_URL: process.env?.NEXT_PUBLIC_MIDTRANS_SNAP_URL,
  };

  return envSchema.partial().parse(clientEnv);
}

// Lazy load environment variables to avoid build-time execution
let _env: ReturnType<typeof getEnv> | null = null;

export function getEnvironment() {
  if (!_env) {
    _env = getEnv();
  }
  return _env;
}

// Export validated environment variables (deprecated - use getEnvironment() instead)
export const env = typeof process !== 'undefined' && process.env.NODE_ENV !== 'test' ? getEnv() : {} as any;
