import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { inviteRouter } from "./routers/invite";

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  invite: inviteRouter,
});

export type AppRouter = typeof appRouter;
