import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { RealSocialAnalyticsService } from "../../../lib/services/analytics/clients/real-analytics-service";
import { InsightsCollector } from "../../../lib/services/analytics/core/insights-collector";

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
   * Get account analytics insights - Main endpoint for dashboard (Enhanced with Phase 4)
   */
  getAccountInsights: protectedProcedure
    .input(
      z.object({
        socialAccountId: z.string(),
        days: z.number().default(30),
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

        // Use Phase 4 Enhanced Analytics if enabled
        if (input.useEnhanced) {
          console.log(
            `🚀 Using Enhanced Analytics (Phase 4) for ${socialAccount.name}`
          );

          try {
            const { createEnhancedAnalyticsManager } = await import(
              "@/lib/services/analytics/advanced/enhanced-analytics-manager"
            );

            const manager = createEnhancedAnalyticsManager(ctx.prisma);

            // Prepare credentials
            const credentials = {
              accessToken: socialAccount.accessToken,
              userId: ctx.auth.userId,
              accountId: socialAccount.profileId || socialAccount.id,
            };

            // Enhanced collection with all Phase 4 features
            const result = await manager.collectEnhancedAnalytics(
              input.socialAccountId,
              credentials,
              {
                platform: socialAccount.platform.toLowerCase() as
                  | "instagram"
                  | "facebook",
                days_back: Math.min(input.days, 30), // Limit to 30 days for performance
                include_posts: true,
                include_stories: false,
                limit: 20,

                // Phase 4 features
                storeInDatabase: true,
                useCache: true,
                generateInsights: true,
                compareWithPrevious: true,
              }
            );

            await manager.disconnect();

            if (result.success && result.data) {
              console.log(
                `✅ Enhanced analytics successful for ${socialAccount.name}`
              );

              // Transform Phase 4 data to existing interface
              const enhancedData = {
                // Core metrics (compatible with existing UI)
                followersCount: result.data.account.followers,
                followingCount: result.data.account.following || 0,
                mediaCount: result.data.account.posts,
                engagementRate: result.data.account.engagement_rate,
                avgReachPerPost: result.data.account.avg_reach || 0,
                profileVisits: result.data.account.profile_visits || 0,

                // Growth metrics from comparison
                followerGrowth: result.data.comparison
                  ? {
                      current: result.data.comparison.changes.followers.current,
                      previous:
                        result.data.comparison.changes.followers.previous,
                      change: result.data.comparison.changes.followers.change,
                      changePercent:
                        result.data.comparison.changes.followers.change_percent,
                    }
                  : null,

                engagementGrowth: result.data.comparison
                  ? {
                      current:
                        result.data.comparison.changes.engagement_rate.current,
                      previous:
                        result.data.comparison.changes.engagement_rate.previous,
                      change:
                        result.data.comparison.changes.engagement_rate.change,
                      changePercent:
                        result.data.comparison.changes.engagement_rate
                          .change_percent,
                    }
                  : null,

                reachGrowth: result.data.comparison
                  ? {
                      current: result.data.comparison.changes.avg_reach.current,
                      previous:
                        result.data.comparison.changes.avg_reach.previous,
                      change: result.data.comparison.changes.avg_reach.change,
                      changePercent:
                        result.data.comparison.changes.avg_reach.change_percent,
                    }
                  : null,

                // Enhanced insights (Phase 4 exclusive)
                insights: result.data.insights,

                // Performance summary
                performanceSummary: result.data.comparison?.performance_summary,

                // Recent posts performance (transformed)
                recentPosts: result.data.posts
                  .slice(0, 10)
                  .map((post, index) => ({
                    id: `post_${index}`,
                    likes: post.likes,
                    comments: post.comments,
                    shares: post.shares,
                    saves: post.saves,
                    reach: post.reach,
                    impressions: post.impressions,
                    engagement:
                      ((post.likes + post.comments + post.shares + post.saves) /
                        post.reach) *
                        100 || 0,
                  })),

                // Performance metrics
                performance: result.performance,
                cacheInfo: result.cache,

                // Metadata
                source: "enhanced_analytics_v4",
                collectedAt: new Date(),

                // Follower growth data (for charts)
                followerGrowthData: [
                  {
                    date: new Date(),
                    value: result.data.account.followers,
                  },
                ],
              };

              return enhancedData;
            } else {
              console.warn(
                `⚠️ Enhanced analytics failed for ${socialAccount.name}, falling back to legacy`
              );
              // Fall through to legacy system
            }
          } catch (enhancedError) {
            console.error(
              `❌ Enhanced analytics error for ${socialAccount.name}:`,
              enhancedError
            );
            // Fall through to legacy system
          }
        }

        // Legacy system (fallback or when enhanced is disabled)
        console.log(`📊 Using legacy analytics for ${socialAccount.name}`);

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
   * Trigger analytics collection for all accounts in a team (Enhanced with Phase 4)
   */
  triggerAccountAnalyticsCollection: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        useEnhanced: z.boolean().default(true), // Enable Phase 4 by default
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

        // Get all social accounts for the team
        const socialAccounts = await ctx.prisma.socialAccount.findMany({
          where: { teamId: input.teamId },
          select: {
            id: true,
            platform: true,
            name: true,
            accessToken: true,
            profileId: true,
          },
        });

        if (socialAccounts.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No social accounts found for this team",
          });
        }

        // Use Phase 4 Enhanced Analytics if enabled
        if (input.useEnhanced) {
          console.log(
            `🚀 Using Enhanced Analytics (Phase 4) for batch collection`
          );

          try {
            const { createEnhancedAnalyticsManager } = await import(
              "@/lib/services/analytics/advanced/enhanced-analytics-manager"
            );

            const manager = createEnhancedAnalyticsManager(ctx.prisma);

            // Prepare accounts for batch processing
            const batchAccounts = socialAccounts.map((account) => ({
              accountId: account.id,
              credentials: {
                accessToken: account.accessToken,
                userId: ctx.auth.userId,
                accountId: account.profileId || account.id,
              },
              options: {
                platform: account.platform.toLowerCase() as
                  | "instagram"
                  | "facebook",
                days_back: 7,
                include_posts: true,
                include_stories: false,
                limit: 20,

                // Phase 4 features
                storeInDatabase: true,
                useCache: false, // Force fresh data for manual trigger
                generateInsights: true,
                compareWithPrevious: true,
              },
            }));

            // Batch collection with Enhanced Analytics
            const results =
              await manager.collectBatchEnhancedAnalytics(batchAccounts);
            await manager.disconnect();

            const successCount = results.filter((r) => r.success).length;
            const failedCount = results.filter((r) => !r.success).length;
            const partialCount = results.filter(
              (r) => r.success && (r.fallback_used || r.api_errors?.length)
            ).length;

            // Collect all errors and warnings for detailed feedback
            const allApiErrors = results.flatMap((r) => r.api_errors || []);
            const allWarnings = results.flatMap((r) => r.warnings || []);
            const fallbackUsedCount = results.filter(
              (r) => r.fallback_used
            ).length;

            // Determine overall status
            let statusMessage;
            let overallSuccess = true;

            if (failedCount > 0) {
              overallSuccess = false;
              statusMessage = `Analytics collection completed with ${failedCount} failures and ${successCount} successes out of ${socialAccounts.length} accounts`;
            } else if (partialCount > 0 || fallbackUsedCount > 0) {
              statusMessage = `Analytics collection completed with ${partialCount} warnings (using fallback data) out of ${socialAccounts.length} accounts`;
            } else {
              statusMessage = `Enhanced analytics collection completed successfully for all ${socialAccounts.length} accounts`;
            }

            console.log(
              `${overallSuccess ? "✅" : "⚠️"} Enhanced batch collection: ${successCount}/${socialAccounts.length} successful, ${partialCount} with issues`
            );

            return {
              success: overallSuccess,
              message: statusMessage,
              results: {
                success: successCount,
                failed: failedCount,
                partial: partialCount,
                total: socialAccounts.length,
                source: "enhanced_analytics_v4",
                performance: results.map((r) => r.performance).filter(Boolean),
                api_errors: allApiErrors.length > 0 ? allApiErrors : undefined,
                warnings: allWarnings.length > 0 ? allWarnings : undefined,
                fallback_used: fallbackUsedCount > 0,
              },
            };
          } catch (enhancedError) {
            console.error(
              `❌ Enhanced batch collection failed:`,
              enhancedError
            );
            // Fall through to legacy system
          }
        }

        // Legacy system (fallback or when enhanced is disabled)
        console.log(`📊 Using legacy analytics for batch collection`);

        const realAnalyticsService = new RealSocialAnalyticsService(ctx.prisma);

        // Use enhanced Instagram client directly for better analytics
        const { EnhancedInstagramClient } = await import(
          "@/lib/services/analytics/clients/enhanced-instagram-client"
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
                "@/lib/services/scheduling/scheduler.service"
              );
              await InsightsCollector.fetchInitialAccountInsights(account.id);
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
    .query(async ({ ctx, input }) => {
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

        console.log(
          `🔍 Fetching post performance for account: ${input.socialAccountId}`
        );
        console.log(`📊 Filters:`, {
          platform: input.platform,
          contentFormat: input.contentFormat,
          sortBy: input.sortBy,
          limit: input.limit,
        });

        // First, get all posts for this social account to debug
        const allPostSocialAccounts =
          await ctx.prisma.postSocialAccount.findMany({
            where: {
              socialAccountId: input.socialAccountId,
              post: {
                status: "PUBLISHED",
                publishedAt: { not: null },
              },
            },
            include: {
              post: {
                select: {
                  id: true,
                  content: true,
                  publishedAt: true,
                  mediaUrls: true,
                  status: true,
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

        console.log(
          `📋 Found ${allPostSocialAccounts.length} total published posts`
        );

        // Debug: Log each post and its analytics
        allPostSocialAccounts.forEach((psa, index) => {
          console.log(`📄 Post ${index + 1}:`, {
            postId: psa.post.id,
            content: psa.post.content.substring(0, 50) + "...",
            publishedAt: psa.post.publishedAt,
            analyticsCount: psa.analytics.length,
            latestAnalytics: psa.analytics[0]
              ? {
                  likes: psa.analytics[0].likes,
                  comments: psa.analytics[0].comments,
                  shares: psa.analytics[0].shares,
                  reach: psa.analytics[0].reach,
                  impressions: psa.analytics[0].impressions,
                  engagement: psa.analytics[0].engagement,
                  contentFormat: psa.analytics[0].contentFormat,
                  recordedAt: psa.analytics[0].recordedAt,
                }
              : "No analytics data",
          });
        });

        // Apply filters
        let filteredPosts = allPostSocialAccounts;

        // Platform filter
        if (input.platform) {
          filteredPosts = filteredPosts.filter(
            (psa) => psa.socialAccount.platform === input.platform
          );
          console.log(
            `📊 After platform filter (${input.platform}): ${filteredPosts.length} posts`
          );
        }

        // Content format filter - FIXED: Apply to posts with analytics
        if (input.contentFormat) {
          filteredPosts = filteredPosts.filter((psa) => {
            // Check if any analytics record has the specified content format
            const hasMatchingFormat = psa.analytics.some(
              (analytics) => analytics.contentFormat === input.contentFormat
            );

            // If no analytics have contentFormat, try to infer from media URLs
            if (!hasMatchingFormat && psa.analytics.length > 0) {
              let inferredFormat = "IMAGE";
              if (psa.post.mediaUrls.length > 0) {
                const firstMedia = psa.post.mediaUrls[0];
                if (
                  firstMedia.includes(".mp4") ||
                  firstMedia.includes(".mov") ||
                  firstMedia.includes("video")
                ) {
                  inferredFormat = "VIDEO";
                } else if (psa.post.mediaUrls.length > 1) {
                  inferredFormat = "CAROUSEL";
                }
              }
              return inferredFormat === input.contentFormat;
            }

            return hasMatchingFormat;
          });
          console.log(
            `📊 After content format filter (${input.contentFormat}): ${filteredPosts.length} posts`
          );
        }

        // Only include posts with meaningful analytics data
        const postsWithAnalytics = filteredPosts.filter((psa) => {
          const hasAnalytics = psa.analytics.length > 0;
          const hasData = psa.analytics.some(
            (analytics) =>
              analytics.reach > 0 ||
              analytics.impressions > 0 ||
              analytics.likes > 0 ||
              analytics.comments > 0 ||
              analytics.shares > 0
          );
          return hasAnalytics && hasData;
        });

        console.log(
          `📊 Posts with meaningful analytics: ${postsWithAnalytics.length}`
        );

        // Transform data to match the expected format
        const postMetrics = postsWithAnalytics
          .map((psa) => {
            const latestAnalytics = psa.analytics[0];

            console.log(`📊 Processing analytics for post ${psa.post.id}:`, {
              likes: latestAnalytics.likes,
              comments: latestAnalytics.comments,
              shares: latestAnalytics.shares,
              saves: latestAnalytics.saves,
              reactions: latestAnalytics.reactions,
              reach: latestAnalytics.reach,
              impressions: latestAnalytics.impressions,
              clicks: latestAnalytics.clicks,
              contentFormat: latestAnalytics.contentFormat,
            });

            const totalEngagement =
              latestAnalytics.likes +
              (latestAnalytics.reactions || 0) +
              latestAnalytics.comments +
              latestAnalytics.shares +
              (latestAnalytics.saves || 0);

            // Calculate engagement rate with proper validation
            const engagementRate =
              latestAnalytics.reach > 0
                ? (totalEngagement / latestAnalytics.reach) * 100
                : latestAnalytics.impressions > 0
                  ? (totalEngagement / latestAnalytics.impressions) * 100
                  : 0;

            // Calculate CTR with proper validation
            const ctr =
              latestAnalytics.impressions > 0
                ? (latestAnalytics.clicks / latestAnalytics.impressions) * 100
                : latestAnalytics.reach > 0
                  ? (latestAnalytics.clicks / latestAnalytics.reach) * 100
                  : 0;

            // Calculate performance score (0-100) with better weighting
            const performanceScore = Math.min(
              100,
              Math.round(
                engagementRate * 0.5 + // 50% weight on engagement
                  ctr * 15 + // 15% weight on CTR (scaled up)
                  (latestAnalytics.reach > 500
                    ? 35
                    : (latestAnalytics.reach / 500) * 35) // 35% weight on reach
              )
            );

            // Determine content format with improved logic
            let contentFormat = latestAnalytics.contentFormat;
            if (!contentFormat && psa.post.mediaUrls.length > 0) {
              const firstMedia = psa.post.mediaUrls[0];
              if (
                firstMedia.includes(".mp4") ||
                firstMedia.includes(".mov") ||
                firstMedia.includes("video")
              ) {
                contentFormat = "VIDEO";
              } else if (psa.post.mediaUrls.length > 1) {
                contentFormat = "CAROUSEL";
              } else {
                contentFormat = "IMAGE";
              }
            }

            const result = {
              id: psa.id,
              platform: psa.socialAccount.platform,
              contentFormat: contentFormat || "IMAGE",
              content: psa.post.content,
              publishedAt: psa.post.publishedAt?.toISOString() || "",

              // Engagement metrics
              likes: latestAnalytics.likes,
              reactions: latestAnalytics.reactions || 0,
              comments: latestAnalytics.comments,
              shares: latestAnalytics.shares,
              saves: latestAnalytics.saves || 0,
              clicks: latestAnalytics.clicks,

              // Reach & Impressions
              reach: latestAnalytics.reach,
              impressions: latestAnalytics.impressions,

              // Calculated metrics
              engagementRate: Number(engagementRate.toFixed(2)),
              ctr: Number(ctr.toFixed(2)),
              timeToEngagement: latestAnalytics.timeToEngagement,

              // Performance indicators
              isTopPerformer: performanceScore >= 80,
              performanceScore,
            };

            console.log(`✅ Processed metrics:`, {
              totalEngagement,
              engagementRate: result.engagementRate,
              ctr: result.ctr,
              performanceScore: result.performanceScore,
            });

            return result;
          })
          .slice(0, input.limit); // Apply limit after processing

        console.log(`📈 Returning ${postMetrics.length} post metrics`);

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
        console.error("❌ Error in getPostPerformance:", error);
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get post performance data",
          cause: error,
        });
      }
    }),

  /**
   * Debug endpoint to see raw post analytics data
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
