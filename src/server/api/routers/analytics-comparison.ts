import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AnalyticsComparisonService } from "@/lib/services/analytics-comparison.service";

export const analyticsComparisonRouter = createTRPCRouter({
  /**
   * Get comparison data for a specific social account
   */
  getAccountComparison: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        comparisonType: z.enum(["week", "month", "quarter"]).default("week"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access to this social account
        const socialAccount = await ctx.prisma.socialAccount.findFirst({
          where: {
            id: input.socialAccountId,
            team: {
              memberships: {
                some: { userId: ctx.auth.userId },
              },
            },
          },
        });

        if (!socialAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Social account not found or access denied",
          });
        }

        const comparisonService = new AnalyticsComparisonService(ctx.prisma);
        const comparison = await comparisonService.getAccountComparison(
          input.socialAccountId,
          input.comparisonType
        );

        if (!comparison) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No analytics data available for comparison",
          });
        }

        return comparison;
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get account comparison",
          cause: error,
        });
      }
    }),

  /**
   * Get comparison data for all accounts in a team
   */
  getTeamComparison: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        comparisonType: z.enum(["week", "month", "quarter"]).default("week"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access to this team
        const membership = await ctx.prisma.membership.findFirst({
          where: {
            teamId: input.teamId,
            userId: ctx.auth.userId,
          },
        });

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this team",
          });
        }

        const comparisonService = new AnalyticsComparisonService(ctx.prisma);
        const comparisons = await comparisonService.getTeamComparison(
          input.teamId,
          input.comparisonType
        );

        return {
          teamId: input.teamId,
          comparisonType: input.comparisonType,
          accounts: comparisons,
          summary: {
            totalAccounts: comparisons.length,
            improvingAccounts: comparisons.filter(
              (c) => c.insights.overallTrend === "improving"
            ).length,
            decliningAccounts: comparisons.filter(
              (c) => c.insights.overallTrend === "declining"
            ).length,
            stableAccounts: comparisons.filter(
              (c) => c.insights.overallTrend === "stable"
            ).length,
          },
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get team comparison",
          cause: error,
        });
      }
    }),

  /**
   * Get historical trends for charts
   */
  getHistoricalTrends: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access to this social account
        const socialAccount = await ctx.prisma.socialAccount.findFirst({
          where: {
            id: input.socialAccountId,
            team: {
              memberships: {
                some: { userId: ctx.auth.userId },
              },
            },
          },
        });

        if (!socialAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Social account not found or access denied",
          });
        }

        const comparisonService = new AnalyticsComparisonService(ctx.prisma);
        const trends = await comparisonService.getHistoricalTrends(
          input.socialAccountId,
          input.days
        );

        return {
          socialAccountId: input.socialAccountId,
          period: `${input.days} days`,
          trends,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get historical trends",
          cause: error,
        });
      }
    }),

  /**
   * Get benchmark data for industry comparison
   */
  getBenchmarkData: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["INSTAGRAM", "FACEBOOK", "TWITTER", "LINKEDIN"]),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const comparisonService = new AnalyticsComparisonService(ctx.prisma);
        const benchmark = await comparisonService.getBenchmarkData(
          input.platform
        );

        return {
          platform: input.platform,
          benchmark,
          note: "Benchmark data is calculated from all accounts on the platform in the last 30 days",
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get benchmark data",
          cause: error,
        });
      }
    }),

  /**
   * Get growth summary for dashboard cards
   */
  getGrowthSummary: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access to this social account
        const socialAccount = await ctx.prisma.socialAccount.findFirst({
          where: {
            id: input.socialAccountId,
            team: {
              memberships: {
                some: { userId: ctx.auth.userId },
              },
            },
          },
        });

        if (!socialAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Social account not found or access denied",
          });
        }

        // Get the latest analytics record with comparison data
        const latest = await ctx.prisma.accountAnalytics.findFirst({
          where: { socialAccountId: input.socialAccountId },
          orderBy: { recordedAt: "desc" },
        });

        if (!latest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No analytics data available",
          });
        }

        return {
          socialAccountId: input.socialAccountId,
          accountName: socialAccount.name,
          platform: socialAccount.platform,
          lastUpdated: latest.recordedAt,
          growth: {
            followers: {
              current: latest.followersCount,
              previous: latest.previousFollowersCount || 0,
              percentage: latest.followersGrowthPercent || 0,
              trend:
                (latest.followersGrowthPercent || 0) > 0
                  ? "up"
                  : (latest.followersGrowthPercent || 0) < 0
                    ? "down"
                    : "stable",
            },
            engagement: {
              current: latest.engagementRate,
              previous: latest.previousEngagementRate || 0,
              percentage: latest.engagementGrowthPercent || 0,
              trend:
                (latest.engagementGrowthPercent || 0) > 0
                  ? "up"
                  : (latest.engagementGrowthPercent || 0) < 0
                    ? "down"
                    : "stable",
            },
            reach: {
              current: latest.totalReach || 0,
              previous: 0, // Would need previous totalReach field
              percentage: latest.reachGrowthPercent || 0,
              trend:
                (latest.reachGrowthPercent || 0) > 0
                  ? "up"
                  : (latest.reachGrowthPercent || 0) < 0
                    ? "down"
                    : "stable",
            },
            posts: {
              current: latest.mediaCount,
              previous: latest.previousMediaCount || 0,
              percentage: latest.mediaGrowthPercent || 0,
              trend:
                (latest.mediaGrowthPercent || 0) > 0
                  ? "up"
                  : (latest.mediaGrowthPercent || 0) < 0
                    ? "down"
                    : "stable",
            },
          },
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get growth summary",
          cause: error,
        });
      }
    }),
});
