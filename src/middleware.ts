import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Tentukan rute publik yang tidak memerlukan autentikasi
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/api/webhooks/clerk",
  "/api/uploadthing",
  "/api/cron/update-hashtags",
  "/error(.*)",
  "/legal/(.*)",
  "/about",
  "/contact",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    // Cek apakah rute memerlukan autentikasi
    if (!isPublicRoute(req)) {
      // Protect the route and redirect unauth users to sign-in
      await auth.protect();
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

    // Handle auth errors by redirecting to sign-in
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);

    return NextResponse.redirect(signInUrl);
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
