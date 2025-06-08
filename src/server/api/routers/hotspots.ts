import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { analyzeAndStoreHotspots } from "@/lib/services/analytics/smartSchedulerService";

export const hotspotsRouter = createTRPCRouter({
  getHotspots: protectedProcedure
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

      // If no hotspots exist yet, run the analysis
      if (hotspots.length === 0) {
        // Run the analysis
        await analyzeAndStoreHotspots(input.socialAccountId);

        // Fetch the newly created hotspots
        const newHotspots = await ctx.prisma.engagementHotspot.findMany({
          where: {
            teamId: input.teamId,
            socialAccountId: input.socialAccountId,
          },
          orderBy: [{ dayOfWeek: "asc" }, { hourOfDay: "asc" }],
        });

        return newHotspots;
      }

      return hotspots;
    }),
});
