import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { RealSocialAnalyticsService } from "../../../lib/services/social-analytics/real-analytics-service";
import axios from "axios";

export const realAnalyticsRouter = createTRPCRouter({
  /**
   * Collect real analytics for a specific post
   */
  collectPostAnalytics: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const realAnalyticsService = new RealSocialAnalyticsService(ctx.prisma);

        // Check if user has access to this post
        const post = await ctx.prisma.post.findUnique({
          where: { id: input.postId },
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

        if (!post) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Post not found",
          });
        }

        if (post.team.memberships.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this post",
          });
        }

        if (post.status !== "PUBLISHED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only collect analytics for published posts",
          });
        }

        const result = await realAnalyticsService.collectPostAnalytics(
          input.postId
        );

        return {
          success: result.success,
          results: result.results,
          errors: result.errors,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to collect analytics",
          cause: error,
        });
      }
    }),

  /**
   * Collect analytics for multiple posts in batch
   */
  collectBatchAnalytics: protectedProcedure
    .input(
      z.object({
        postIds: z.array(z.string()),
        teamId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const realAnalyticsService = new RealSocialAnalyticsService(ctx.prisma);

        // Verify user has access to all posts
        const posts = await ctx.prisma.post.findMany({
          where: {
            id: { in: input.postIds },
            team: {
              memberships: {
                some: { userId: ctx.auth.userId },
              },
            },
            ...(input.teamId && { teamId: input.teamId }),
          },
          select: { id: true, status: true },
        });

        if (posts.length !== input.postIds.length) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to some of the requested posts",
          });
        }

        const publishedPostIds = posts
          .filter((post) => post.status === "PUBLISHED")
          .map((post) => post.id);

        if (publishedPostIds.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No published posts found to collect analytics for",
          });
        }

        const result =
          await realAnalyticsService.collectBatchAnalytics(publishedPostIds);

        return result;
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to collect batch analytics",
          cause: error,
        });
      }
    }),

  /**
   * Get stored analytics data from database
   */
  getStoredAnalytics: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const realAnalyticsService = new RealSocialAnalyticsService(ctx.prisma);

        // Check if user has access to this post
        const post = await ctx.prisma.post.findUnique({
          where: { id: input.postId },
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

        if (!post) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Post not found",
          });
        }

        if (post.team.memberships.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this post",
          });
        }

        const result = await realAnalyticsService.getStoredAnalytics(
          input.postId
        );

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error || "Failed to get stored analytics",
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get stored analytics",
          cause: error,
        });
      }
    }),

  /**
   * Get platform connection status
   */
  getPlatformStatus: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if user is member of the team
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

        // Get social accounts for the team
        const socialAccounts = await ctx.prisma.socialAccount.findMany({
          where: { teamId: input.teamId },
          select: {
            id: true,
            name: true,
            platform: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Group by platform - simplified for now
        const platformStatus = socialAccounts.reduce(
          (acc, account) => {
            if (!acc[account.platform]) {
              acc[account.platform] = {
                platform: account.platform,
                connected: true, // Assume connected if exists
                accounts: [],
                lastSync: null,
              };
            }

            acc[account.platform].accounts.push({
              id: account.id,
              name: account.name,
              connected: true,
              lastSync: account.updatedAt,
            });

            if (
              !acc[account.platform].lastSync ||
              account.updatedAt > acc[account.platform].lastSync
            ) {
              acc[account.platform].lastSync = account.updatedAt;
            }

            return acc;
          },
          {} as Record<string, any>
        );

        return {
          platforms: Object.values(platformStatus),
          totalAccounts: socialAccounts.length,
          connectedAccounts: socialAccounts.length, // All are connected if they exist
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get platform status",
          cause: error,
        });
      }
    }),

  /**
   * Trigger scheduled analytics collection (admin only)
   */
  triggerScheduledCollection: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const realAnalyticsService = new RealSocialAnalyticsService(ctx.prisma);

      // Check if user is admin (you might want to add role checking)
      // For now, just check if user exists
      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Trigger the scheduled collection
      await realAnalyticsService.scheduleAnalyticsCollection();

      return {
        success: true,
        message: "Scheduled analytics collection triggered successfully",
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to trigger scheduled collection",
        cause: error,
      });
    }
  }),

  /**
   * Get analytics collection stats
   */
  getCollectionStats: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check team access
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

        const since = new Date();
        since.setDate(since.getDate() - input.days);

        // Get analytics collection stats
        const stats = await ctx.prisma.postAnalytics.groupBy({
          by: ["postSocialAccountId"],
          where: {
            recordedAt: { gte: since },
            postSocialAccount: {
              post: { teamId: input.teamId },
            },
          },
          _count: {
            id: true,
          },
        });

        const totalCollections = stats.reduce(
          (sum, stat) => sum + stat._count.id,
          0
        );
        const uniquePosts = stats.length;

        // Get platform breakdown (simplified query)
        const analyticsData = await ctx.prisma.postAnalytics.findMany({
          where: {
            recordedAt: { gte: since },
            postSocialAccount: {
              post: { teamId: input.teamId },
            },
          },
          include: {
            postSocialAccount: {
              include: {
                socialAccount: {
                  select: { platform: true },
                },
              },
            },
          },
        });

        // Group by platform
        const platformBreakdown = analyticsData.reduce(
          (acc, analytics) => {
            const platform = analytics.postSocialAccount.socialAccount.platform;
            if (!acc[platform]) {
              acc[platform] = {
                platform,
                collections: 0,
                totalViews: 0,
                totalLikes: 0,
                totalEngagement: 0,
              };
            }
            acc[platform].collections++;
            acc[platform].totalViews += analytics.views;
            acc[platform].totalLikes += analytics.likes;
            acc[platform].totalEngagement += analytics.engagement;
            return acc;
          },
          {} as Record<string, any>
        );

        const platforms = Object.values(platformBreakdown).map((p: any) => ({
          platform: p.platform,
          collections: p.collections,
          avgViews: Math.round(p.totalViews / p.collections),
          avgLikes: Math.round(p.totalLikes / p.collections),
          avgEngagement:
            Math.round((p.totalEngagement / p.collections) * 100) / 100,
        }));

        return {
          totalCollections,
          uniquePosts,
          period: input.days,
          platforms,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get collection stats",
          cause: error,
        });
      }
    }),

  /**
   * Get account-level insights for a social account (followers, media count)
   */
  getAccountInsights: protectedProcedure
    .input(z.object({ socialAccountId: z.string() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.socialAccount.findUnique({
        where: { id: input.socialAccountId },
        select: { platform: true },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found",
        });
      }

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
        platform: account.platform,
        followersCount: latest.followersCount,
        mediaCount: latest.mediaCount,
        engagementRate: latest.engagementRate, // Data real
        avgReachPerPost: latest.avgReachPerPost, // Data real
        followerGrowth: latest.followerGrowth, // Data real
      };
    }),
});
