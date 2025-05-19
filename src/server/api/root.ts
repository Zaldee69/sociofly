import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { mediaRouter } from "./routers/media";
import { organizationRouter } from "./routers/organization";
import { teamRouter } from "./routers/team";
import { hashtagRouter } from "./routers/hashtag";
import { permissionsRouter } from "./routers/permissions";

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  media: mediaRouter,
  organization: organizationRouter,
  team: teamRouter,
  hashtag: hashtagRouter,
  permissions: permissionsRouter,
});

export type AppRouter = typeof appRouter;
