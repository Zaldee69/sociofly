/**
 * Router utama aplikasi yang mengelompokkan semua sub-router
 *
 * Setiap router menangani operasi terkait domain/entitas spesifik
 */

import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { mediaRouter } from "./routers/media";
import { teamRouter } from "./routers/team";
import { hashtagRouter } from "./routers/hashtag";
import { postRouter } from "./routers/post";
import { permissionRouter } from "./routers/permission";
import { approvalWorkflowRouter } from "./routers/approval-workflow";
import { approvalRequestRouter } from "./routers/approval-request";
import { analyticsRouter } from "./routers/analytics";
import { paymentRouter } from "./routers/payment";
import { userRouter } from "./routers/user";

/**
 * Mengekspor objek appRouter yang berisi semua router tRPC
 * Struktur ini memisahkan endpoint berdasarkan domain logis
 */
export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  media: mediaRouter,
  team: teamRouter,
  hashtag: hashtagRouter,
  post: postRouter,
  permission: permissionRouter,
  approvalWorkflow: approvalWorkflowRouter,
  approvalRequest: approvalRequestRouter,
  analytics: analyticsRouter,
  payment: paymentRouter,
  user: userRouter,
});

/**
 * Tipe untuk router aplikasi secara keseluruhan
 * Digunakan untuk membuat klien tRPC yang tepat
 */
export type AppRouter = typeof appRouter;
