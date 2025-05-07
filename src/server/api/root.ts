import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { inviteRouter } from "./routers/invite";
import { mediaRouter } from "./routers/media";
import { organizationRouter } from "./routers/organization";

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  invite: inviteRouter,
  media: mediaRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
