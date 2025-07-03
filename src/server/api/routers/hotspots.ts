import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  hasFeature,
  hasTeamFeature,
} from "@/server/api/trpc";
import { Feature } from "@/config/feature-flags";

export const hotspotsRouter = createTRPCRouter({
  getHotspots: protectedProcedure
    .use(hasTeamFeature(Feature.ADVANCED_ANALYTICS))
    .input(
      z.object({
        teamId: z.string(),
        socialAccountId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify team membership
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.auth.userId,
            teamId: input.teamId,
          },
        },
      });

      if (!membership) {
        throw new Error("Forbidden: Not a team member");
      }

      // Get hotspots for the social account
      const hotspots = await ctx.prisma.engagementHotspot.findMany({
        where: {
          teamId: input.teamId,
          socialAccountId: input.socialAccountId,
        },
        orderBy: [{ dayOfWeek: "asc" }, { hourOfDay: "asc" }],
      });

      // Return empty array if no data yet
      // Frontend can show appropriate UI for no data state
      return hotspots;
    }),

  // Add new procedure to get last analysis time
  getLastAnalysis: protectedProcedure
    .use(hasFeature(Feature.ADVANCED_ANALYTICS))
    .input(
      z.object({
        socialAccountId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const lastLog = await ctx.prisma.taskLog.findFirst({
        where: {
          name: "analyze_hotspots",
          message: {
            contains: input.socialAccountId,
          },
          status: "SUCCESS",
        },
        orderBy: {
          executedAt: "desc",
        },
        select: {
          executedAt: true,
        },
      });

      return {
        lastAnalyzed: lastLog?.executedAt || null,
      };
    }),
});
