import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  hasFeature,
  hasTeamFeature,
} from "@/server/api/trpc";
import { Feature } from "@/config/feature-flags";
import { TRPCError } from "@trpc/server";
import { AnalyticsComparisonService } from "@/lib/services/analytics/core/analytics-comparison.service";

export const analyticsComparisonRouter = createTRPCRouter({
  /**
   * Get comparison data for a specific social account (Enhanced with Phase 4)
   */
  getAccountComparison: protectedProcedure
    .use(hasFeature(Feature.ADVANCED_ANALYTICS))
    .input(
      z.object({
        socialAccountId: z.string(),
        comparisonType: z.enum(["week", "month", "quarter"]).default("week"),
        useEnhanced: z.boolean().default(true), // Enable Phase 4 by default
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

        // Use comparison service for analytics comparison
        console.log(`📊 Using comparison service for ${socialAccount.name}`);

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
    .use(hasTeamFeature(Feature.ADVANCED_ANALYTICS))
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
    .use(hasFeature(Feature.ADVANCED_ANALYTICS))
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
    .use(hasFeature(Feature.ADVANCED_ANALYTICS))
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
    .use(hasFeature(Feature.ADVANCED_ANALYTICS))
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

  /**
   * DEBUG: Get raw analytics data for troubleshooting
   */
  getDebugData: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        limit: z.number().min(1).max(50).default(10),
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

        // Get recent analytics records
        const records = await ctx.prisma.accountAnalytics.findMany({
          where: { socialAccountId: input.socialAccountId },
          orderBy: { recordedAt: "desc" },
          take: input.limit,
        });

        return {
          socialAccountId: input.socialAccountId,
          accountName: socialAccount.name,
          platform: socialAccount.platform,
          totalRecords: records.length,
          records: records.map((record) => ({
            id: record.id,
            recordedAt: record.recordedAt,
            followersCount: record.followersCount,
            mediaCount: record.mediaCount,
            engagementRate: record.engagementRate,
            avgReachPerPost: record.avgReachPerPost,
            totalReach: record.totalReach,

            // Growth fields
            followersGrowthPercent: record.followersGrowthPercent,
            engagementGrowthPercent: record.engagementGrowthPercent,
            mediaGrowthPercent: record.mediaGrowthPercent,
            reachGrowthPercent: record.reachGrowthPercent,

            // Previous values
            previousFollowersCount: record.previousFollowersCount,
            previousMediaCount: record.previousMediaCount,
            previousEngagementRate: record.previousEngagementRate,
            previousAvgReachPerPost: record.previousAvgReachPerPost,

            // Raw follower growth data
            followerGrowth: record.followerGrowth,
          })),
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get debug data",
          cause: error,
        });
      }
    }),

  /**
   * UTILITY: Generate sample data for testing (development only)
   */
  generateSampleData: publicProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        days: z.number().min(1).max(365).default(30),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const service = new AnalyticsComparisonService(ctx.prisma);
      return await service.generateSampleGrowthData(
        input.socialAccountId,
        input.days
      );
    }),

  /**
   * UTILITY: Clean duplicate records
   */
  cleanDuplicates: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
        const deletedCount = await comparisonService.cleanDuplicateRecords(
          input.socialAccountId
        );

        return {
          success: true,
          message: `Cleaned ${deletedCount} duplicate records`,
          socialAccountId: input.socialAccountId,
          deletedCount,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clean duplicates",
          cause: error,
        });
      }
    }),

  // === PRODUCTION ENDPOINTS ===

  // Upsert analytics data (prevents duplicates)
  upsertAnalyticsData: publicProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        analyticsData: z.object({
          followersCount: z.number().optional(),
          followingCount: z.number().optional(),
          mediaCount: z.number().optional(),
          engagementRate: z.number().optional(),
          avgReachPerPost: z.number().optional(),
          avgLikesPerPost: z.number().optional(),
          avgCommentsPerPost: z.number().optional(),
          avgSharesPerPost: z.number().optional(),
          impressionsGrowth: z.number().optional(),
          reachGrowth: z.number().optional(),
          profileViewsGrowth: z.number().optional(),
          // Add other fields as needed
        }),
        targetDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const service = new AnalyticsComparisonService(ctx.prisma);
      return await service.upsertAnalyticsData(
        input.socialAccountId,
        input.analyticsData,
        input.targetDate
      );
    }),

  // Auto-cleanup duplicates (production safe)
  autoCleanupDuplicates: publicProcedure
    .input(
      z.object({
        socialAccountId: z.string().optional(),
        daysToCheck: z.number().min(1).max(30).default(7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const service = new AnalyticsComparisonService(ctx.prisma);
      return await service.autoCleanupDuplicates(
        input.socialAccountId,
        input.daysToCheck
      );
    }),

  // Get duplicate health report
  getDuplicateHealthReport: publicProcedure
    .input(
      z.object({
        daysToCheck: z.number().min(1).max(30).default(7),
      })
    )
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsComparisonService(ctx.prisma);
      return await service.getDuplicateHealthReport(input.daysToCheck);
    }),

  // Safe data collection
  collectAnalyticsDataSafely: publicProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        analyticsData: z.object({
          followersCount: z.number().optional(),
          followingCount: z.number().optional(),
          mediaCount: z.number().optional(),
          engagementRate: z.number().optional(),
          avgReachPerPost: z.number().optional(),
          avgLikesPerPost: z.number().optional(),
          avgCommentsPerPost: z.number().optional(),
          avgSharesPerPost: z.number().optional(),
          impressionsGrowth: z.number().optional(),
          reachGrowth: z.number().optional(),
          profileViewsGrowth: z.number().optional(),
          // Add other fields as needed
        }),
        options: z
          .object({
            allowSameDayUpdate: z.boolean().default(true),
            mergeWithExisting: z.boolean().default(true),
            targetDate: z.date().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const service = new AnalyticsComparisonService(ctx.prisma);
      return await service.collectAnalyticsDataSafely(
        input.socialAccountId,
        input.analyticsData,
        input.options
      );
    }),
});
