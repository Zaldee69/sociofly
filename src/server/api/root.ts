import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;
