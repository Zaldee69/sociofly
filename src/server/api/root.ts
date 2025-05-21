/**
 * Router utama aplikasi yang mengelompokkan semua sub-router
 *
 * Setiap router menangani operasi terkait domain/entitas spesifik
 */

import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { mediaRouter } from "./routers/media";
import { organizationRouter } from "./routers/organization";
import { teamRouter } from "./routers/team";
import { hashtagRouter } from "./routers/hashtag";
import { postRouter } from "./routers/post";
import { permissionRouter } from "./routers/permission.router";

/**
 * Mengekspor objek appRouter yang berisi semua router tRPC
 * Struktur ini memisahkan endpoint berdasarkan domain logis
 */
export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  media: mediaRouter,
  organization: organizationRouter,
  team: teamRouter,
  hashtag: hashtagRouter,
  post: postRouter,
  permission: permissionRouter,
});

// Tipe untuk seluruh API
export type AppRouter = typeof appRouter;
