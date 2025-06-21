import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

/**
 * Analytics Database Router
 *
 * Provides analytics data from database only (no real-time API calls).
 * Data should be populated by scheduled jobs.
 */
export const analyticsDatabaseRouter = createTRPCRouter({
  /**
   * Get account analytics from database
   */
  getAccountAnalytics: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access to this social account
        const socialAccount = await ctx.prisma.socialAccount.findUnique({
          where: { id: input.socialAccountId },
          include: {
            team: {
              include: {
                memberships: {
                  where: { userId: ctx.auth.userId },
                },
              },
            },
          },
        });

        if (!socialAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Social account not found",
          });
        }

        if (socialAccount.team.memberships.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this social account",
          });
        }

        // Get latest account analytics from database
        const latestAnalytics = await ctx.prisma.accountAnalytics.findFirst({
          where: { socialAccountId: input.socialAccountId },
          orderBy: { recordedAt: "desc" },
        });

        if (!latestAnalytics) {
          // Return empty data if no analytics collected yet
          return {
            followersCount: 0,
            followingCount: 0,
            mediaCount: 0,
            engagementRate: 0,
            avgReachPerPost: 0,
            profileVisits: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            totalReach: 0,
            avgLikesPerPost: 0,
            avgCommentsPerPost: 0,
            source: "database",
            lastUpdated: null,
            status: "no_data",
            message:
              "No analytics data collected yet. Please wait for scheduled collection.",
          };
        }

        // Get comparison data (previous period)
        const previousPeriodStart = new Date();
        previousPeriodStart.setDate(
          previousPeriodStart.getDate() - input.days * 2
        );
        const previousPeriodEnd = new Date();
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - input.days);

        const previousAnalytics = await ctx.prisma.accountAnalytics.findFirst({
          where: {
            socialAccountId: input.socialAccountId,
            recordedAt: {
              gte: previousPeriodStart,
              lte: previousPeriodEnd,
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // Calculate growth metrics
        const followerGrowth = previousAnalytics
          ? {
              current: latestAnalytics.followersCount,
              previous: previousAnalytics.followersCount,
              change:
                latestAnalytics.followersCount -
                previousAnalytics.followersCount,
              changePercent:
                previousAnalytics.followersCount > 0
                  ? ((latestAnalytics.followersCount -
                      previousAnalytics.followersCount) /
                      previousAnalytics.followersCount) *
                    100
                  : 0,
            }
          : null;

        const engagementGrowth = previousAnalytics
          ? {
              current: latestAnalytics.engagementRate,
              previous: previousAnalytics.engagementRate,
              change:
                latestAnalytics.engagementRate -
                previousAnalytics.engagementRate,
              changePercent:
                previousAnalytics.engagementRate > 0
                  ? ((latestAnalytics.engagementRate -
                      previousAnalytics.engagementRate) /
                      previousAnalytics.engagementRate) *
                    100
                  : 0,
            }
          : null;

        const reachGrowth = previousAnalytics
          ? {
              current: latestAnalytics.avgReachPerPost,
              previous: previousAnalytics.avgReachPerPost,
              change:
                latestAnalytics.avgReachPerPost -
                previousAnalytics.avgReachPerPost,
              changePercent:
                previousAnalytics.avgReachPerPost > 0
                  ? ((latestAnalytics.avgReachPerPost -
                      previousAnalytics.avgReachPerPost) /
                      previousAnalytics.avgReachPerPost) *
                    100
                  : 0,
            }
          : null;

        return {
          // Core metrics
          followersCount: latestAnalytics.followersCount,
          followingCount: latestAnalytics.followingCount || 0,
          mediaCount: latestAnalytics.mediaCount,
          engagementRate: latestAnalytics.engagementRate,
          avgReachPerPost: latestAnalytics.avgReachPerPost,
          profileVisits: latestAnalytics.profileVisits || 0,

          // Totals
          totalLikes: latestAnalytics.totalLikes,
          totalComments: latestAnalytics.totalComments,
          totalShares: latestAnalytics.totalShares,
          totalReach: latestAnalytics.totalReach,
          avgLikesPerPost: latestAnalytics.avgLikesPerPost,
          avgCommentsPerPost: latestAnalytics.avgCommentsPerPost,

          // Growth metrics
          followerGrowth,
          engagementGrowth,
          reachGrowth,

          // Metadata
          source: "database",
          lastUpdated: latestAnalytics.recordedAt,
          status: "ready",
          message: "Data from scheduled collection",
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get account analytics from database",
          cause: error,
        });
      }
    }),

  /**
   * Get post analytics from database
   */
  getPostAnalytics: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        teamId: z.string(),
        limit: z.number().default(20),
        platform: z.enum(["INSTAGRAM", "FACEBOOK", "TWITTER"]).optional(),
        contentFormat: z
          .enum(["IMAGE", "VIDEO", "CAROUSEL", "REELS", "STORY"])
          .optional(),
        sortBy: z
          .enum(["engagementRate", "reach", "impressions", "publishedAt"])
          .default("publishedAt"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has access
        const socialAccount = await ctx.prisma.socialAccount.findUnique({
          where: { id: input.socialAccountId },
          include: {
            team: {
              include: {
                memberships: {
                  where: { userId: ctx.auth.userId },
                },
              },
            },
          },
        });

        if (!socialAccount || socialAccount.team.memberships.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        // Get post analytics from database
        const postAnalytics = await ctx.prisma.postAnalytics.findMany({
          where: {
            postSocialAccount: {
              socialAccountId: input.socialAccountId,
              ...(input.platform && {
                socialAccount: {
                  platform: input.platform,
                },
              }),
            },
            ...(input.contentFormat && {
              contentFormat: input.contentFormat,
            }),
          },
          include: {
            postSocialAccount: {
              include: {
                post: {
                  select: {
                    id: true,
                    content: true,
                    publishedAt: true,
                    mediaUrls: true,
                  },
                },
                socialAccount: {
                  select: {
                    platform: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy:
            input.sortBy === "publishedAt"
              ? { postSocialAccount: { post: { publishedAt: "desc" } } }
              : input.sortBy === "engagementRate"
                ? { engagement: "desc" }
                : input.sortBy === "reach"
                  ? { reach: "desc" }
                  : { impressions: "desc" },
          take: input.limit,
        });

        // Transform data
        const transformedData = postAnalytics.map((analytics) => {
          const totalEngagement =
            analytics.likes +
            analytics.comments +
            (analytics.shares || 0) +
            (analytics.saves || 0);
          const engagementRate =
            analytics.reach > 0 ? (totalEngagement / analytics.reach) * 100 : 0;

          // Calculate CTR
          const ctr =
            analytics.clicks > 0 && analytics.impressions > 0
              ? Number(
                  ((analytics.clicks / analytics.impressions) * 100).toFixed(2)
                )
              : 0;

          // Calculate performance score (0-100)
          const performanceScore = Math.min(
            100,
            Math.round(
              engagementRate * 0.4 +
                ctr * 0.3 +
                (analytics.reach / Math.max(analytics.impressions, 1)) *
                  100 *
                  0.3
            )
          );

          return {
            id: analytics.id,
            platform: analytics.postSocialAccount.socialAccount.platform,
            contentFormat: analytics.contentFormat || "IMAGE",
            content: analytics.postSocialAccount.post.content,
            publishedAt:
              analytics.postSocialAccount.post.publishedAt?.toISOString() || "",

            // Engagement metrics
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares || 0,
            saves: analytics.saves || 0,
            clicks: analytics.clicks || 0,

            // Reach & Impressions
            reach: analytics.reach,
            impressions: analytics.impressions,

            // Calculated metrics
            engagementRate: Number(engagementRate.toFixed(2)),
            ctr,

            // Performance indicators (matching frontend expectations)
            isTopPerformer: performanceScore >= 80,
            performanceScore,
            timeToEngagement: analytics.timeToEngagement || null,

            // Metadata
            recordedAt: analytics.recordedAt,
          };
        });

        return {
          data: transformedData,
          total: transformedData.length,
          source: "database",
          lastUpdated: postAnalytics[0]?.recordedAt || null,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get post analytics from database",
          cause: error,
        });
      }
    }),

  /**
   * Get analytics collection status
   */
  getCollectionStatus: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check access
        const socialAccount = await ctx.prisma.socialAccount.findUnique({
          where: { id: input.socialAccountId },
          include: {
            team: {
              include: {
                memberships: {
                  where: { userId: ctx.auth.userId },
                },
              },
            },
          },
        });

        if (!socialAccount || socialAccount.team.memberships.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        // Check for recent data (last 24 hours)
        const recent = await ctx.prisma.accountAnalytics.findFirst({
          where: {
            socialAccountId: input.socialAccountId,
            recordedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // Check for any data
        const hasAnyData = await ctx.prisma.accountAnalytics.findFirst({
          where: { socialAccountId: input.socialAccountId },
          orderBy: { recordedAt: "desc" },
        });

        return {
          hasRecentData: !!recent,
          hasAnyData: !!hasAnyData,
          lastCollected: hasAnyData?.recordedAt || null,
          status: recent ? "ready" : hasAnyData ? "stale" : "pending",
          message: recent
            ? "Data is up to date"
            : hasAnyData
              ? "Data is available but may be outdated"
              : "No data collected yet",
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get collection status",
          cause: error,
        });
      }
    }),
});
