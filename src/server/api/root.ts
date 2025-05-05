import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { getSocialAccountsRouter } from "./routers/get-social-accounts";
export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  getSocialAccounts: getSocialAccountsRouter,
});

export type AppRouter = typeof appRouter;
