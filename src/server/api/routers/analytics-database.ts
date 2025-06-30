import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

/**
 * Analytics Database Router - ENHANCED VERSION
 *
 * Provides analytics data from database only (no real-time API calls).
 * Data should be populated by scheduled jobs.
 *
 * ADDED: Endpoints moved from real-analytics for better organization
 */
export const analyticsDatabaseRouter = createTRPCRouter({
  /**
   * Get account analytics from database (MAIN ENDPOINT - replaces getAccountInsights)
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

        // Calculate date range for filtering
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        // Get analytics data within the specified date range
        const analyticsInRange = await ctx.prisma.accountAnalytics.findMany({
          where: {
            socialAccountId: input.socialAccountId,
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { recordedAt: "desc" },
          take: 50, // Limit to prevent excessive data
        });

        if (analyticsInRange.length === 0) {
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
            avgSharesPerPost: 0,
            avgSavesPerPost: 0,
            // Analytics metadata
            postsAnalyzed: 0,
            totalPostsOnPlatform: 0,
            source: "database",
            lastUpdated: null,
            status: "no_data",
            message: `No analytics data collected for the last ${input.days} days.`,
          };
        }

        // Use the latest record in the date range
        const latestAnalytics = analyticsInRange[0];

        // Get comparison data (previous period of same length)
        const previousPeriodStart = new Date(startDate);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        const previousPeriodEnd = new Date(startDate);

        const previousAnalytics = await ctx.prisma.accountAnalytics.findFirst({
          where: {
            socialAccountId: input.socialAccountId,
            recordedAt: {
              gte: previousPeriodStart,
              lt: startDate,
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // If no previous analytics found, try to get the last record before the current period
        const fallbackPreviousAnalytics = !previousAnalytics
          ? await ctx.prisma.accountAnalytics.findFirst({
              where: {
                socialAccountId: input.socialAccountId,
                recordedAt: {
                  lt: startDate,
                },
              },
              orderBy: { recordedAt: "desc" },
            })
          : null;

        const effectivePreviousAnalytics =
          previousAnalytics || fallbackPreviousAnalytics;

        // Calculate aggregated metrics for the period (if multiple records)
        let aggregatedMetrics = latestAnalytics;
        if (analyticsInRange.length > 1) {
          // Calculate averages and totals from all records in range
          const totalRecords = analyticsInRange.length;
          const totals = analyticsInRange.reduce(
            (acc, record) => ({
              followers: acc.followers + record.followersCount,
              following: acc.following + (record.followingCount || 0),
              posts: acc.posts + record.mediaCount,
              engagement: acc.engagement + record.engagementRate,
              reach: acc.reach + (record.avgReachPerPost || 0),
              visits: acc.visits + (record.profileVisits || 0),
              likes: acc.likes + (record.totalLikes || 0),
              comments: acc.comments + (record.totalComments || 0),
              shares: acc.shares + (record.totalShares || 0),
              totalReach: acc.totalReach + (record.totalReach || 0),
            }),
            {
              followers: 0,
              following: 0,
              posts: 0,
              engagement: 0,
              reach: 0,
              visits: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              totalReach: 0,
            }
          );

          // Use latest values for counts, averages for rates, totals for cumulative metrics
          aggregatedMetrics = {
            ...latestAnalytics,
            engagementRate: totals.engagement / totalRecords,
            avgReachPerPost: totals.reach / totalRecords,
            profileVisits: totals.visits / totalRecords,
            // These should be totals, not averages - cumulative metrics
            totalLikes: totals.likes,
            totalComments: totals.comments,
            totalShares: totals.shares,
            totalReach: totals.reach, // Use sum for total reach from all posts
          };
        }

        // Calculate growth metrics
        const followerGrowth = effectivePreviousAnalytics
          ? {
              current: aggregatedMetrics.followersCount,
              previous: effectivePreviousAnalytics.followersCount,
              change:
                aggregatedMetrics.followersCount -
                effectivePreviousAnalytics.followersCount,
              changePercent:
                effectivePreviousAnalytics.followersCount > 0
                  ? ((aggregatedMetrics.followersCount -
                      effectivePreviousAnalytics.followersCount) /
                      effectivePreviousAnalytics.followersCount) *
                    100
                  : 0,
            }
          : null;

        const mediaGrowth = effectivePreviousAnalytics
          ? {
              current: aggregatedMetrics.mediaCount,
              previous: effectivePreviousAnalytics.mediaCount,
              change:
                aggregatedMetrics.mediaCount -
                effectivePreviousAnalytics.mediaCount,
              changePercent:
                effectivePreviousAnalytics.mediaCount > 0
                  ? ((aggregatedMetrics.mediaCount -
                      effectivePreviousAnalytics.mediaCount) /
                      effectivePreviousAnalytics.mediaCount) *
                    100
                  : 0,
            }
          : null;

        const engagementGrowth = effectivePreviousAnalytics
          ? {
              current: aggregatedMetrics.engagementRate,
              previous: effectivePreviousAnalytics.engagementRate,
              change:
                aggregatedMetrics.engagementRate -
                effectivePreviousAnalytics.engagementRate,
              changePercent:
                effectivePreviousAnalytics.engagementRate > 0
                  ? ((aggregatedMetrics.engagementRate -
                      effectivePreviousAnalytics.engagementRate) /
                      effectivePreviousAnalytics.engagementRate) *
                    100
                  : 0,
            }
          : null;

        const reachGrowth = effectivePreviousAnalytics
          ? {
              current: aggregatedMetrics.avgReachPerPost || 0,
              previous: effectivePreviousAnalytics.avgReachPerPost || 0,
              change:
                (aggregatedMetrics.avgReachPerPost || 0) -
                (effectivePreviousAnalytics.avgReachPerPost || 0),
              changePercent:
                (effectivePreviousAnalytics.avgReachPerPost || 0) > 0
                  ? (((aggregatedMetrics.avgReachPerPost || 0) -
                      (effectivePreviousAnalytics.avgReachPerPost || 0)) /
                      (effectivePreviousAnalytics.avgReachPerPost || 0)) *
                    100
                  : 0,
            }
          : null;

        return {
          // Core metrics
          followersCount: aggregatedMetrics.followersCount,
          followingCount: aggregatedMetrics.followingCount || 0,
          mediaCount: aggregatedMetrics.mediaCount,
          engagementRate: Number(aggregatedMetrics.engagementRate.toFixed(2)),
          avgReachPerPost: Math.round(aggregatedMetrics.avgReachPerPost || 0),
          profileVisits: Math.round(aggregatedMetrics.profileVisits || 0),

          // Additional metrics for UI compatibility (matching real-analytics interface)
          totalFollowers:
            aggregatedMetrics.totalFollowers ||
            aggregatedMetrics.followersCount,
          totalPosts:
            aggregatedMetrics.totalPosts || aggregatedMetrics.mediaCount,
          totalReach: Math.round(aggregatedMetrics.totalReach || 0),
          totalImpressions: Math.round(aggregatedMetrics.totalImpressions || 0),
          totalLikes: Math.round(aggregatedMetrics.totalLikes || 0),
          totalComments: Math.round(aggregatedMetrics.totalComments || 0),
          totalShares: Math.round(aggregatedMetrics.totalShares || 0),
          totalSaves: Math.round(aggregatedMetrics.totalSaves || 0),
          totalClicks: Math.round(aggregatedMetrics.totalClicks || 0),
          avgEngagementPerPost: Number(
            (aggregatedMetrics.avgEngagementPerPost || 0).toFixed(1)
          ),
          avgClickThroughRate: Number(
            (aggregatedMetrics.avgClickThroughRate || 0).toFixed(2)
          ),

          // Pre-calculated averages from database
          avgLikesPerPost: Number(
            (aggregatedMetrics.avgLikesPerPost || 0).toFixed(1)
          ),
          avgCommentsPerPost: Number(
            (aggregatedMetrics.avgCommentsPerPost || 0).toFixed(1)
          ),
          avgSharesPerPost: Number(
            (aggregatedMetrics.avgSharesPerPost || 0).toFixed(1)
          ),
          avgSavesPerPost: Number(
            (aggregatedMetrics.avgSavesPerPost || 0).toFixed(1)
          ),

          // Analytics metadata
          postsAnalyzed: aggregatedMetrics.postsAnalyzed || 0,
          totalPostsOnPlatform:
            aggregatedMetrics.totalPostsOnPlatform ||
            aggregatedMetrics.mediaCount ||
            0,

          // Platform-specific metrics
          bioLinkClicks: aggregatedMetrics.bioLinkClicks || 0,
          storyViews: aggregatedMetrics.storyViews || 0,

          // Growth metrics
          followerGrowth,
          mediaGrowth,
          engagementGrowth,
          reachGrowth,

          // Growth percentages (for backward compatibility)
          followersGrowthPercent: followerGrowth?.changePercent || 0,
          engagementGrowthPercent: engagementGrowth?.changePercent || 0,
          mediaGrowthPercent: mediaGrowth?.changePercent || 0,
          reachGrowthPercent: reachGrowth?.changePercent || 0,

          // Follower growth data array (for charts)
          followerGrowthData: analyticsInRange.map((a) => ({
            date: a.recordedAt,
            value: a.followersCount,
          })),

          // Metadata
          source: "database",
          lastUpdated: latestAnalytics.recordedAt,
          status: "ready",
          message: `Data from ${analyticsInRange.length} records in last ${input.days} days`,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            days: input.days,
            recordsFound: analyticsInRange.length,
          },
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
   * Get post analytics from database (ENHANCED - replaces getPostPerformance)
   */
  getPostAnalytics: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        teamId: z.string(),
        limit: z.number().default(50),
        platform: z.enum(["INSTAGRAM", "FACEBOOK", "TWITTER"]).optional(),
        contentFormat: z
          .enum(["IMAGE", "VIDEO", "CAROUSEL", "REELS", "STORY"])
          .optional(),
        sortBy: z
          .enum(["engagementRate", "reach", "impressions", "publishedAt"])
          .default("publishedAt"),
        days: z.number().default(30),
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

        // Calculate date range for filtering
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        // Get post analytics from database with date range filter
        // FIXED: Only filter by analytics recording date, not post publication date
        // This allows older posts with recent analytics to be included
        const postAnalytics = await ctx.prisma.postAnalytics.findMany({
          where: {
            postSocialAccount: {
              socialAccountId: input.socialAccountId,
              ...(input.platform && {
                socialAccount: {
                  platform: input.platform,
                },
              }),
              // Only require posts to be published, no date restriction
              post: {
                status: "PUBLISHED", // Only include published posts
              },
            },
            ...(input.contentFormat && {
              contentFormat: input.contentFormat,
            }),
            // Filter by analytics recording date (when analytics were collected)
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
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

          // Calculate CTR (Click-Through Rate)
          // For Instagram, clicks might be 0, so we'll calculate based on available data
          const ctr = (() => {
            if (analytics.clicks > 0 && analytics.impressions > 0) {
              return Number(
                ((analytics.clicks / analytics.impressions) * 100).toFixed(2)
              );
            }

            // Fallback: Use profile visits or saves as proxy for "clicks"
            const proxyClicks =
              (analytics.saves || 0) + (analytics.reactions || 0);
            if (proxyClicks > 0 && analytics.impressions > 0) {
              return Number(
                ((proxyClicks / analytics.impressions) * 100).toFixed(2)
              );
            }

            return 0;
          })();

          // Calculate performance score (0-100) - IMPROVED FORMULA
          // Higher weight on engagement rate, more realistic scoring
          const performanceScore = Math.min(
            100,
            Math.round(
              engagementRate * 0.6 + // Higher weight on engagement (main metric)
                ctr * 0.2 + // Lower weight on CTR (often 0 for Instagram)
                (analytics.reach / Math.max(analytics.impressions, 1)) *
                  100 *
                  0.2 // Lower weight on reach/impression ratio
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
            reactions: analytics.reactions || 0,
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

            // Performance indicators - IMPROVED THRESHOLD
            // Top 30% of posts (more realistic than top 5%)
            isTopPerformer: performanceScore >= 40,
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
   * Get collection stats for metrics overview (MOVED from real-analytics)
   */
  getCollectionStats: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        days: z.number().default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        console.log(
          `📊 Getting collection stats for team ${input.teamId} (last ${input.days} days)`
        );

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        // Get recent analytics collection stats using the days parameter
        const recentAnalytics = await ctx.prisma.accountAnalytics.findMany({
          where: {
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
            socialAccount: {
              teamId: input.teamId,
            },
          },
          include: {
            socialAccount: {
              select: {
                id: true,
                name: true,
                platform: true,
              },
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // Get recent post analytics for the same period
        const recentPostAnalytics = await ctx.prisma.postAnalytics.findMany({
          where: {
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
            postSocialAccount: {
              socialAccount: {
                teamId: input.teamId,
              },
            },
          },
          include: {
            postSocialAccount: {
              include: {
                socialAccount: {
                  select: {
                    id: true,
                    name: true,
                    platform: true,
                  },
                },
                post: {
                  select: {
                    id: true,
                    content: true,
                    publishedAt: true,
                  },
                },
              },
            },
          },
          orderBy: { recordedAt: "desc" },
        });

        // Group account analytics by social account
        const accountStats = recentAnalytics.reduce(
          (acc, analytics) => {
            const accountId = analytics.socialAccountId;
            if (!acc[accountId]) {
              acc[accountId] = {
                accountId,
                accountName: analytics.socialAccount.name,
                platform: analytics.socialAccount.platform,
                lastCollection: analytics.recordedAt,
                collectionsCount: 0,
                latestMetrics: {
                  followers: analytics.followersCount,
                  engagement: analytics.engagementRate,
                  reach: analytics.avgReachPerPost,
                },
              };
            }
            acc[accountId].collectionsCount++;
            // Keep the most recent metrics
            if (analytics.recordedAt > acc[accountId].lastCollection) {
              acc[accountId].lastCollection = analytics.recordedAt;
              acc[accountId].latestMetrics = {
                followers: analytics.followersCount,
                engagement: analytics.engagementRate,
                reach: analytics.avgReachPerPost,
              };
            }
            return acc;
          },
          {} as Record<string, any>
        );

        // Group post analytics by social account
        const postStats = recentPostAnalytics.reduce(
          (acc, analytics) => {
            const accountId = analytics.postSocialAccount.socialAccountId;
            if (!acc[accountId]) {
              acc[accountId] = {
                accountId,
                accountName: analytics.postSocialAccount.socialAccount.name,
                platform: analytics.postSocialAccount.socialAccount.platform,
                postsAnalyzed: 0,
                totalEngagement: 0,
                totalReach: 0,
                totalImpressions: 0,
              };
            }
            acc[accountId].postsAnalyzed++;
            acc[accountId].totalEngagement += analytics.engagement || 0;
            acc[accountId].totalReach += analytics.reach || 0;
            acc[accountId].totalImpressions += analytics.impressions || 0;
            return acc;
          },
          {} as Record<string, any>
        );

        return {
          success: true,
          data: {
            teamId: input.teamId,
            period: `${input.days} days`,
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
            accountAnalytics: {
              totalCollections: recentAnalytics.length,
              accountsWithData: Object.keys(accountStats).length,
              accounts: Object.values(accountStats),
            },
            postAnalytics: {
              totalAnalytics: recentPostAnalytics.length,
              accountsWithPostData: Object.keys(postStats).length,
              accounts: Object.values(postStats),
            },
            summary: {
              totalAccountCollections: recentAnalytics.length,
              totalPostAnalytics: recentPostAnalytics.length,
              uniqueAccountsTracked: new Set([
                ...Object.keys(accountStats),
                ...Object.keys(postStats),
              ]).size,
            },
          },
        };
      } catch (error: any) {
        console.error("Collection stats error:", error);
        return {
          success: false,
          error: "Failed to get collection stats",
          details: error.message,
        };
      }
    }),

  /**
   * Get analytics collection status (MOVED from real-analytics)
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
          accountCreated: socialAccount.createdAt,
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

  /**
   * Debug endpoint to see raw post analytics data (MOVED from real-analytics)
   */
  debugPostAnalytics: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        teamId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
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

        // Get all posts and their analytics
        const posts = await ctx.prisma.postSocialAccount.findMany({
          where: {
            socialAccountId: input.socialAccountId,
          },
          include: {
            post: {
              select: {
                id: true,
                content: true,
                publishedAt: true,
                status: true,
                mediaUrls: true,
              },
            },
            socialAccount: {
              select: {
                platform: true,
                name: true,
              },
            },
            analytics: {
              orderBy: { recordedAt: "desc" },
            },
          },
        });

        return {
          totalPosts: posts.length,
          publishedPosts: posts.filter((p) => p.post.status === "PUBLISHED")
            .length,
          postsWithAnalytics: posts.filter((p) => p.analytics.length > 0)
            .length,
          posts: posts.map((psa) => ({
            postId: psa.post.id,
            content: psa.post.content.substring(0, 100) + "...",
            status: psa.post.status,
            publishedAt: psa.post.publishedAt,
            mediaUrls: psa.post.mediaUrls,
            analyticsCount: psa.analytics.length,
            latestAnalytics: psa.analytics[0] || null,
            allAnalytics: psa.analytics,
          })),
        };
      } catch (error: any) {
        console.error("❌ Error in debugPostAnalytics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get debug data",
          cause: error,
        });
      }
    }),
});
