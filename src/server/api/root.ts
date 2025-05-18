import { createTRPCRouter } from "@/server/api/trpc";
import { onboardingRouter } from "./routers/onboarding";
import { mediaRouter } from "./routers/media";
import { organizationRouter } from "./routers/organization";
import { teamRouter } from "./routers/team";
import { hashtagRouter } from "./routers/hashtag";

export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  media: mediaRouter,
  organization: organizationRouter,
  team: teamRouter,
  hashtag: hashtagRouter,
});

export type AppRouter = typeof appRouter;
