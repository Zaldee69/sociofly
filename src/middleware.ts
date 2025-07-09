import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  hasCompletedOnboarding,
  createOnboardingRedirect,
  createSignInRedirect,
} from "@/lib/clerk";

// Tentukan rute publik yang tidak memerlukan autentikasi
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/api/webhooks/clerk",
  "/api/webhooks/midtrans",
  "/api/uploadthing",
  "/api/reports/generate", // Temporary for testing
  "/error(.*)",
  "/legal/(.*)",
  "/about",
  "/contact",
]);

// Tentukan rute onboarding yang tidak memerlukan onboarding selesai
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  try {
    // Skip authentication entirely for cron API routes and init
    if (
      req.nextUrl.pathname.startsWith("/api/cron-manager") ||
      req.nextUrl.pathname.startsWith("/api/cron/") ||
      req.nextUrl.pathname.startsWith("/api/init")
    ) {
      console.log(`🔓 Bypassing Clerk auth for: ${req.nextUrl.pathname}`);
      return NextResponse.next();
    }

    // Cek apakah rute memerlukan autentikasi
    if (!isPublicRoute(req)) {
      // Check if user is authenticated
      const { userId, sessionClaims } = await auth();

      if (!userId) {
        // Handle unauthenticated users
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Redirect to sign-in for non-API routes
        return createSignInRedirect(req);
      }

      // Check if user has completed onboarding
      const onboardingComplete = hasCompletedOnboarding(sessionClaims);

      // If user is authenticated but hasn't completed onboarding and isn't on the onboarding route
      if (userId && !onboardingComplete && !isOnboardingRoute(req)) {
        // Don't redirect API routes to onboarding
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return NextResponse.next();
        }

        // Redirect to onboarding for non-API routes
        return createOnboardingRedirect(req);
      }
    }

    // Add security headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-content-type-options", "nosniff");
    requestHeaders.set("x-frame-options", "DENY");
    requestHeaders.set("x-xss-protection", "1; mode=block");

    // Continue with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Middleware error:", error);

    // Don't redirect API routes to sign-in, return 401 instead
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle auth errors by redirecting to sign-in for non-API routes
    return createSignInRedirect(req);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
