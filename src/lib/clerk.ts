import { NextResponse } from "next/server";

/**
 * Clerk configuration for the application
 * This file centralizes Clerk-related configuration and utilities
 */

/**
 * Helper function to check if a user has completed onboarding
 * based on their session claims
 */
export function hasCompletedOnboarding(sessionClaims?: any): boolean {
  return !!sessionClaims?.metadata.onboardingComplete === true;
}

/**
 * Helper function to create a redirect response to the onboarding page
 */
export function createOnboardingRedirect(req: Request): NextResponse {
  const onboardingUrl = new URL("/onboarding", req.url);
  return NextResponse.redirect(onboardingUrl);
}

/**
 * Helper function to create a redirect response to the sign-in page
 */
export function createSignInRedirect(req: Request): NextResponse {
  const signInUrl = new URL("/sign-in", req.url);
  signInUrl.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(signInUrl);
}
