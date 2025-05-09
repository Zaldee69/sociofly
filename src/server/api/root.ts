import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { inviteRouter } from "./routers/invite";
import { mediaRouter } from "./routers/media";
import { organizationRouter } from "./routers/organization";
import { teamRouter } from "./routers/team";

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  invite: inviteRouter,
  media: mediaRouter,
  organization: organizationRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
