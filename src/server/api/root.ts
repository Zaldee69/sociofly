import { createTRPCRouter } from "@/server/api/trpc";
import { postRouter } from "@/lib/trpc/routers/post";

export const appRouter = createTRPCRouter({
  post: postRouter,
});

export type AppRouter = typeof appRouter;
