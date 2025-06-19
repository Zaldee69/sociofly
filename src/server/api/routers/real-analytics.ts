import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { RealSocialAnalyticsService } from "../../../lib/services/social-analytics/real-analytics-service";

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
   * Get account analytics insights - Main endpoint for dashboard
   */
  getAccountInsights: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        days: z.number().default(30),
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

        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - input.days * 24 * 60 * 60 * 1000
        );

        // Get account analytics
        const accountAnalytics = await ctx.prisma.accountAnalytics.findMany({
          where: {
            socialAccountId: input.socialAccountId,
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // Calculate insights
        const latest = accountAnalytics[0];
        const previous = accountAnalytics[accountAnalytics.length - 1];

        const followersGrowth =
          latest && previous
            ? ((latest.followersCount - previous.followersCount) /
                previous.followersCount) *
              100
            : 0;

        const engagementGrowth =
          latest && previous
            ? ((latest.engagementRate - previous.engagementRate) /
                previous.engagementRate) *
              100
            : 0;

        return {
          // Basic metrics
          followersCount: latest?.followersCount || 0,
          mediaCount: latest?.mediaCount || 0,
          engagementRate: latest?.engagementRate || 0,
          avgReachPerPost: latest?.avgReachPerPost || 0,

          // Additional metrics for UI compatibility
          totalFollowers: latest?.totalFollowers || latest?.followersCount || 0,
          totalPosts: latest?.totalPosts || latest?.mediaCount || 0,
          totalReach: latest?.totalReach || 0,
          totalImpressions: latest?.totalImpressions || 0,
          totalLikes: latest?.totalLikes || 0,
          totalComments: latest?.totalComments || 0,
          totalShares: latest?.totalShares || 0,
          totalSaves: latest?.totalSaves || 0,
          totalClicks: latest?.totalClicks || 0,
          avgEngagementPerPost: latest?.avgEngagementPerPost || 0,
          avgClickThroughRate: latest?.avgClickThroughRate || 0,

          // Growth metrics
          followersGrowthPercent:
            latest?.followersGrowthPercent || followersGrowth,
          engagementGrowthPercent:
            latest?.engagementGrowthPercent || engagementGrowth,
          mediaGrowthPercent: latest?.mediaGrowthPercent || 0,
          reachGrowthPercent: latest?.reachGrowthPercent || 0,

          // Platform-specific metrics
          bioLinkClicks: latest?.bioLinkClicks || 0,
          storyViews: latest?.storyViews || 0,
          profileVisits: latest?.profileVisits || 0,

          // Growth data array
          followerGrowth: accountAnalytics.map((a) => ({
            date: a.recordedAt,
            value: a.followersCount,
          })),
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get account insights",
          cause: error,
        });
      }
    }),

  /**
   * Get collection stats for metrics overview
   */
  getCollectionStats: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        days: z.number().default(30),
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

        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - input.days * 24 * 60 * 60 * 1000
        );

        // Get basic collection stats
        const totalPosts = await ctx.prisma.post.count({
          where: {
            teamId: input.teamId,
            publishedAt: {
              gte: startDate,
              lte: endDate,
            },
            status: "PUBLISHED",
          },
        });

        const totalAnalytics = await ctx.prisma.postAnalytics.count({
          where: {
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
            postSocialAccount: {
              post: {
                teamId: input.teamId,
              },
            },
          },
        });

        // Calculate coverage percentage
        const coveragePercentage =
          totalPosts > 0 ? (totalAnalytics / totalPosts) * 100 : 0;

        return {
          totalPosts,
          totalAnalytics,
          coveragePercentage,
          lastUpdated: new Date(),
          period: `${input.days} days`,
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
   * Trigger analytics collection for all accounts in a team
   */
  triggerAccountAnalyticsCollection: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

        const realAnalyticsService = new RealSocialAnalyticsService(ctx.prisma);

        // Get all social accounts for the team
        const socialAccounts = await ctx.prisma.socialAccount.findMany({
          where: { teamId: input.teamId },
          select: { id: true, platform: true, name: true },
        });

        if (socialAccounts.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No social accounts found for this team",
          });
        }

        // Use enhanced Instagram client directly for better analytics
        const { EnhancedInstagramClient } = await import(
          "@/lib/services/social-analytics/enhanced-instagram-client"
        );
        const { getStandardParams, logCollectionParams } = await import(
          "@/config/analytics-config"
        );

        let successCount = 0;
        let failedCount = 0;

        for (const account of socialAccounts) {
          try {
            console.log(
              `🔄 Collecting analytics for ${account.name} (${account.platform})`
            );

            if (account.platform === "INSTAGRAM") {
              // Use enhanced Instagram client for comprehensive analytics
              const instagramAccount =
                await ctx.prisma.socialAccount.findUnique({
                  where: { id: account.id },
                  select: { profileId: true, accessToken: true },
                });

              if (
                instagramAccount?.profileId &&
                instagramAccount?.accessToken
              ) {
                const enhancedClient = new EnhancedInstagramClient();
                const standardParams = getStandardParams(
                  "COMPREHENSIVE_INSIGHTS"
                );

                // Log parameters for debugging
                logCollectionParams(
                  "UPDATE_DATA_BUTTON",
                  standardParams,
                  account.name || undefined
                );

                const insights = await enhancedClient.getComprehensiveInsights(
                  instagramAccount.profileId,
                  instagramAccount.accessToken,
                  standardParams
                );

                // Store the comprehensive insights in AccountAnalytics
                await ctx.prisma.accountAnalytics.create({
                  data: {
                    socialAccountId: account.id,
                    followersCount: insights.followersCount,
                    mediaCount: insights.mediaCount,
                    engagementRate: insights.engagementRate,
                    avgReachPerPost: insights.averageReachPerPost,
                    totalReach: insights.totalReach,
                    totalImpressions: insights.totalImpressions,
                    totalLikes: insights.totalLikes,
                    totalComments: insights.totalComments,
                    totalShares: insights.totalShares,
                    totalSaves: insights.totalSaves,
                    avgEngagementPerPost: insights.averageEngagementPerPost,
                    storyViews: insights.storyViews,
                    followerGrowth: [],
                  },
                });

                console.log(
                  `✅ Enhanced Instagram analytics for ${account.name}: ${insights.engagementRate}% engagement`
                );
              } else {
                throw new Error("Missing Instagram credentials");
              }
            } else {
              // For other platforms, use scheduler service
              const { SchedulerService } = await import(
                "@/lib/services/scheduler.service"
              );
              await SchedulerService.fetchInitialAccountInsights(account.id);
              console.log(`✅ Standard analytics for ${account.name}`);
            }

            successCount++;
          } catch (error: any) {
            failedCount++;
            console.error(`❌ Failed for ${account.name}:`, error.message);
          }
        }

        const result = {
          total: socialAccounts.length,
          success: successCount,
          failed: failedCount,
        };

        return {
          success: true,
          message: `Analytics collection completed for ${result.success} of ${result.total} accounts`,
          results: {
            success: result.success,
            failed: result.failed,
            total: result.total,
          },
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger analytics collection",
          cause: error,
        });
      }
    }),

  /**
   * Get post performance analytics for a social account
   */
  getPostPerformance: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        teamId: z.string(),
        platform: z.enum(["INSTAGRAM", "FACEBOOK", "TWITTER"]).optional(),
        contentFormat: z
          .enum(["IMAGE", "VIDEO", "CAROUSEL", "REELS", "STORY"])
          .optional(),
        sortBy: z
          .enum(["engagementRate", "reach", "impressions", "publishedAt"])
          .default("engagementRate"),
        limit: z.number().min(1).max(100).default(20),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has access to this social account
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

        if (socialAccount.teamId !== input.teamId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Social account doesn't belong to the specified team",
          });
        }

        // Build query filters
        const whereClause: any = {
          socialAccountId: input.socialAccountId,
          post: {
            status: "PUBLISHED",
            publishedAt: {
              not: null,
            },
            ...(input.dateFrom &&
              input.dateTo && {
                publishedAt: {
                  gte: input.dateFrom,
                  lte: input.dateTo,
                },
              }),
          },
          analytics: {
            some: {}, // Only include posts that have analytics data
          },
        };

        // Add platform filter if specified
        if (input.platform) {
          whereClause.socialAccount = {
            platform: input.platform,
          };
        }

        // Get posts with their latest analytics
        const postSocialAccounts = await ctx.prisma.postSocialAccount.findMany({
          where: whereClause,
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
              },
            },
            analytics: {
              orderBy: { recordedAt: "desc" },
              take: 1, // Get the latest analytics record
              ...(input.contentFormat && {
                where: {
                  contentFormat: input.contentFormat,
                },
              }),
            },
          },
          take: input.limit,
        });

        // Transform data to match the expected format
        const postMetrics = postSocialAccounts
          .filter((psa) => psa.analytics.length > 0) // Only include posts with analytics
          .map((psa) => {
            const latestAnalytics = psa.analytics[0];
            const totalEngagement =
              latestAnalytics.likes +
              latestAnalytics.reactions +
              latestAnalytics.comments +
              latestAnalytics.shares +
              latestAnalytics.saves;

            // Calculate engagement rate
            const engagementRate =
              latestAnalytics.reach > 0
                ? (totalEngagement / latestAnalytics.reach) * 100
                : 0;

            // Calculate performance score (0-100)
            const performanceScore = Math.min(
              100,
              Math.round(
                engagementRate * 0.4 +
                  latestAnalytics.ctr * 20 +
                  (latestAnalytics.reach > 1000
                    ? 30
                    : (latestAnalytics.reach / 1000) * 30)
              )
            );

            // Determine content format from media URLs if not in analytics
            let contentFormat = latestAnalytics.contentFormat;
            if (!contentFormat && psa.post.mediaUrls.length > 0) {
              const firstMedia = psa.post.mediaUrls[0];
              if (firstMedia.includes(".mp4") || firstMedia.includes(".mov")) {
                contentFormat = "VIDEO";
              } else if (psa.post.mediaUrls.length > 1) {
                contentFormat = "CAROUSEL";
              } else {
                contentFormat = "IMAGE";
              }
            }

            return {
              id: psa.id,
              platform: psa.socialAccount.platform,
              contentFormat: contentFormat || "IMAGE",
              content: psa.post.content,
              publishedAt: psa.post.publishedAt?.toISOString() || "",

              // Engagement metrics
              likes: latestAnalytics.likes,
              reactions: latestAnalytics.reactions,
              comments: latestAnalytics.comments,
              shares: latestAnalytics.shares,
              saves: latestAnalytics.saves,
              clicks: latestAnalytics.clicks,

              // Reach & Impressions
              reach: latestAnalytics.reach,
              impressions: latestAnalytics.impressions,

              // Calculated metrics
              engagementRate: Number(engagementRate.toFixed(2)),
              ctr: Number(latestAnalytics.ctr.toFixed(2)),
              timeToEngagement: latestAnalytics.timeToEngagement,

              // Performance indicators
              isTopPerformer: performanceScore >= 80,
              performanceScore,
            };
          });

        // Sort the results
        const sortedMetrics = postMetrics.sort((a, b) => {
          switch (input.sortBy) {
            case "engagementRate":
              return b.engagementRate - a.engagementRate;
            case "reach":
              return b.reach - a.reach;
            case "impressions":
              return b.impressions - a.impressions;
            case "publishedAt":
              return (
                new Date(b.publishedAt).getTime() -
                new Date(a.publishedAt).getTime()
              );
            default:
              return b.engagementRate - a.engagementRate;
          }
        });

        return sortedMetrics;
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get post performance",
          cause: error,
        });
      }
    }),

  /**
   * Get analytics collection status for a social account
   */
  getCollectionStatus: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if user has access to this social account
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

        // Check for recent analytics data (within last 24 hours)
        const recentAnalytics = await ctx.prisma.accountAnalytics.findFirst({
          where: {
            socialAccountId: input.socialAccountId,
            recordedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // Check for any analytics data
        const hasAnyAnalytics = await ctx.prisma.accountAnalytics.findFirst({
          where: { socialAccountId: input.socialAccountId },
          orderBy: { recordedAt: "desc" },
        });

        // Check for running jobs (simplified check)
        const isCollecting = false; // We'll implement proper job status checking later

        return {
          hasRecentData: !!recentAnalytics,
          hasAnyData: !!hasAnyAnalytics,
          isCollecting,
          lastCollected: hasAnyAnalytics?.recordedAt || null,
          accountCreated: socialAccount.createdAt,
          status: recentAnalytics
            ? "ready"
            : hasAnyAnalytics
              ? "stale"
              : isCollecting
                ? "collecting"
                : "pending",
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
