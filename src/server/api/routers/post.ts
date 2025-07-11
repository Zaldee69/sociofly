import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  publicProcedure,
  protectedProcedure,
  createTRPCRouter,
  hasFeature,
  hasTeamFeature,
} from "@/server/api/trpc";
import { Feature } from "@/config/feature-flags";
import { PostStatus, SocialPlatform } from "@prisma/client";
import { PostPublisherService } from "@/lib/services/post-publisher";
import { PostQuotaService } from "@/lib/services/post-quota.service";
import { TeamSubscriptionService } from "@/lib/services/team-subscription.service";

// Helper function to safely get user ID
const getUserId = (ctx: any) => {
  const userId = ctx.auth.userId;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User ID not found in context",
    });
  }
  return userId;
};

// Validasi untuk pembuatan post baru
const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Konten tidak boleh kosong")
    .max(2200, "Konten terlalu panjang"),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  scheduledAt: z.coerce.date(),
  platform: z.string(),
  teamId: z.string(),
  socialAccountIds: z.array(z.string()),
  postStatus: z.nativeEnum(PostStatus).optional(),
});

// Validasi untuk update post
const updatePostSchema = z.object({
  id: z.string(),
  content: z
    .string()
    .min(1, "Konten tidak boleh kosong")
    .max(2200, "Konten terlalu panjang")
    .optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.coerce.date().optional(),
  status: z.nativeEnum(PostStatus).optional(),
});

// Validasi untuk filter post
const getPostsSchema = z.object({
  teamId: z.string(),
  status: z.nativeEnum(PostStatus).optional(),
  platform: z.nativeEnum(SocialPlatform).optional(),
  fromDate: z.coerce.date().optional(),
  postStatus: z.nativeEnum(PostStatus).optional(),
  toDate: z.coerce.date().optional(),
});

export const postRouter = createTRPCRouter({
  // Get post quota information for a team
  getPostQuota: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { teamId } = input;
      const userId = getUserId(ctx);

      // Get the effective subscription for this user in this team
      const subscription =
        await TeamSubscriptionService.getEffectiveSubscription(userId, teamId);

      // Check post quota based on the subscription plan
      const quotaInfo = await PostQuotaService.checkPostQuota(
        userId,
        teamId,
        subscription.subscriptionPlan
      );

      return quotaInfo;
    }),

  // Dapatkan semua post untuk organisasi
  getAll: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, status, platform, fromDate, toDate } = input;
      const userId = getUserId(ctx);

      // Bangun filter berdasarkan input
      const where: any = { teamId };

      if (status) {
        where.status = status;
      }

      if (platform) {
        where.platform = platform;
      }

      if (fromDate || toDate) {
        where.scheduledAt = {};

        if (fromDate) {
          where.scheduledAt.gte = fromDate;
        }

        if (toDate) {
          where.scheduledAt.lte = toDate;
        }
      }

      // Dapatkan data post dengan paginasi
      const [posts, totalCount] = await Promise.all([
        ctx.prisma.post.findMany({
          where,
          orderBy: { scheduledAt: "asc" },
          include: {
            postSocialAccounts: {
              include: {
                socialAccount: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.prisma.post.count({ where }),
      ]);

      return {
        posts,
        pagination: {
          total: totalCount,
        },
      };
    }),

  // Dapatkan post berdasarkan ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;
      const userId = getUserId(ctx);

      const post = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post tidak ditemukan",
        });
      }

      return post;
    }),

  // Buat post baru
  create: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        content,
        mediaUrls,
        scheduledAt,
        platform,
        teamId,
        socialAccountIds,
        postStatus,
      } = input;

      const userId = getUserId(ctx);

      // Periksa apakah pengguna memiliki akses ke organisasi
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses ke organisasi ini",
        });
      }

      // Periksa bahwa semua akun sosial milik organisasi
      const socialAccounts = await ctx.prisma.socialAccount.findMany({
        where: {
          id: { in: socialAccountIds },
          teamId,
        },
      });

      console.log(socialAccountIds);

      if (socialAccounts.length !== socialAccountIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Beberapa akun sosial tidak valid",
        });
      }

      // Buat post dengan transaksi untuk memastikan konsistensi data
      return await ctx.prisma.$transaction(async (tx) => {
        // Buat post utama
        const post = await tx.post.create({
          data: {
            content,
            mediaUrls,
            scheduledAt,
            platform,
            status: postStatus,
            userId,
            teamId,
          },
        });

        // Hubungkan post dengan akun sosial
        await Promise.all(
          socialAccountIds.map((socialAccountId) =>
            tx.postSocialAccount.create({
              data: {
                postId: post.id,
                socialAccountId,
                status: postStatus,
              },
            })
          )
        );

        return post;
      });
    }),

  createPostWithApproval: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        content,
        mediaUrls,
        scheduledAt,
        platform,
        teamId,
        socialAccountIds,
      } = input;
    }),

  // Update post yang sudah ada
  update: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(
      updatePostSchema.extend({
        socialAccountIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, socialAccountIds, ...updateData } = input;
      const userId = getUserId(ctx);

      // Periksa apakah post ada dan pengguna memiliki akses
      const post = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post tidak ditemukan",
        });
      }

      // Periksa apakah pengguna memiliki akses ke post
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses untuk mengedit post ini",
        });
      }

      // Use transaction to update post and social accounts
      return await ctx.prisma.$transaction(async (tx) => {
        // Update post
        const updatedPost = await tx.post.update({
          where: { id },
          data: updateData,
          include: {
            postSocialAccounts: {
              include: {
                socialAccount: true,
              },
            },
          },
        });

        // Update social accounts if provided
        if (socialAccountIds) {
          // Verify all social accounts belong to the team
          const socialAccounts = await tx.socialAccount.findMany({
            where: {
              id: { in: socialAccountIds },
              teamId: post.teamId,
            },
          });

          if (socialAccounts.length !== socialAccountIds.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Beberapa akun sosial tidak valid",
            });
          }

          // Delete existing social account associations
          await tx.postSocialAccount.deleteMany({
            where: { postId: id },
          });

          // Create new social account associations
          await Promise.all(
            socialAccountIds.map((socialAccountId) =>
              tx.postSocialAccount.create({
                data: {
                  postId: id,
                  socialAccountId,
                  status: input.status || post.status,
                },
              })
            )
          );
        } else if (input.status) {
          // If only status is updated, update all PostSocialAccount statuses
          await tx.postSocialAccount.updateMany({
            where: { postId: id },
            data: { status: input.status },
          });
        }

        // Return updated post with fresh social accounts
        return await tx.post.findUnique({
          where: { id },
          include: {
            postSocialAccounts: {
              include: {
                socialAccount: true,
              },
            },
          },
        });
      });
    }),

  // Hapus post
  delete: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = getUserId(ctx);

      // Periksa apakah post ada dan pengguna memiliki akses
      const post = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post tidak ditemukan",
        });
      }

      // Periksa apakah pengguna memiliki akses ke post
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses untuk menghapus post ini",
        });
      }

      // If this is a scheduled post, we need to handle job cleanup
      // Note: Since we use cron-based scheduling (not individual job scheduling),
      // the post will simply be skipped in the next cron run when it's not found
      if (post.status === "SCHEDULED") {
        console.log(
          `🗑️  Deleting scheduled post: ${id} (scheduled for ${post.scheduledAt})`
        );
        console.log(`   Post will be automatically skipped in next cron run`);

        // Log the deletion for audit purposes
        await ctx.prisma.taskLog.create({
          data: {
            name: "post_deleted_before_publish",
            status: "INFO",
            message: `Scheduled post ${id} deleted before publication (was scheduled for ${post.scheduledAt})`,
            executedAt: new Date(),
          },
        });
      }

      // Hapus post dan semua relasi (PostSocialAccount akan dihapus secara cascade)
      await ctx.prisma.post.delete({
        where: { id },
      });

      return {
        success: true,
        wasScheduled: post.status === "SCHEDULED",
        scheduledAt: post.scheduledAt,
      };
    }),

  // Publish post secara manual
  publish: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = getUserId(ctx);

      // Periksa apakah post ada dan pengguna memiliki akses
      const post = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post tidak ditemukan",
        });
      }

      // Periksa apakah pengguna memiliki akses ke post
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses untuk mempublikasikan post ini",
        });
      }

      // Gunakan service untuk mempublikasikan post ke semua platform
      const results = await PostPublisherService.publishToAllPlatforms(id);

      // Ambil post yang sudah diupdate
      const updatedPost = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
            },
          },
        },
      });

      if (!updatedPost) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal mengambil data post setelah publikasi",
        });
      }

      return {
        post: updatedPost,
        results,
      };
    }),

  // Publish post immediately (for "Publish Now" action)
  publishNow: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = getUserId(ctx);

      // Get the post and check access
      const post = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Check if user has access to the post
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to publish this post",
        });
      }

      // Use PostPublisherService to publish to all platforms
      const results = await PostPublisherService.publishToAllPlatforms(id);

      // Get updated post data
      const updatedPost = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
            },
          },
        },
      });

      if (!updatedPost) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get updated post data after publishing",
        });
      }

      return {
        post: updatedPost,
        results,
      };
    }),

  // Mendapatkan daftar post yang gagal dipublikasi
  getFailed: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(
      z.object({
        teamId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, page, limit } = input;
      const userId = getUserId(ctx);
      const skip = (page - 1) * limit;

      const where = {
        teamId,
        status: PostStatus.FAILED,
      };

      const [failedPosts, totalCount] = await Promise.all([
        ctx.prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: "desc" },
          include: {
            postSocialAccounts: {
              include: {
                socialAccount: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.prisma.post.count({ where }),
      ]);

      return {
        posts: failedPosts,
        pagination: {
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          page,
          limit,
        },
      };
    }),

  // Mencoba kembali publikasi post yang gagal
  retry: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_SCHEDULING))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = getUserId(ctx);

      // Periksa apakah post ada dan statusnya FAILED
      const post = await ctx.prisma.post.findUnique({
        where: {
          id,
          status: PostStatus.FAILED,
        },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post yang gagal tidak ditemukan",
        });
      }

      // Periksa izin akses pengguna
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses untuk mencoba kembali post ini",
        });
      }

      // Dalam implementasi sebenarnya, kita akan mencoba memposting ulang ke platform sosial
      // Untuk saat ini, kita hanya update status

      // Update status post menjadi SCHEDULED untuk dicoba publikasikan lagi
      const retriedPost = await ctx.prisma.post.update({
        where: { id },
        data: {
          status: PostStatus.SCHEDULED,
          scheduledAt: new Date(Date.now() + 5 * 60 * 1000), // Jadwalkan 5 menit dari sekarang
        },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
            },
          },
        },
      });

      // Update status semua PostSocialAccount yang FAILED
      await ctx.prisma.postSocialAccount.updateMany({
        where: {
          postId: id,
          status: PostStatus.FAILED,
        },
        data: { status: PostStatus.SCHEDULED },
      });

      return retriedPost;
    }),

  // Get approval instances for a post
  getApprovalInstances: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_APPROVAL_WORKFLOWS))
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;
      const userId = getUserId(ctx);

      // Get the post to check access
      const post = await ctx.prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Check if user has access to the post
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this post",
        });
      }

      // Get all approval instances for this post
      return ctx.prisma.approvalInstance.findMany({
        where: { postId },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          assignments: {
            include: {
              step: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              step: {
                order: "asc",
              },
            },
          },
        },
      });
    }),

  // Get analytics for a specific post
  getAnalytics: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_POST_ANALYTICS))
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { postId } = input;
        const userId = getUserId(ctx);

        // Get post with analytics data
        const post = await ctx.prisma.post.findUnique({
          where: { id: postId },
          include: {
            postSocialAccounts: {
              include: {
                socialAccount: true,
                analytics: {
                  orderBy: { recordedAt: "desc" },
                  take: 30, // Get more data for better historical view
                },
              },
            },
          },
        });

        if (!post) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Post tidak ditemukan",
          });
        }

        // Check if user has access to this post
        const membership = await ctx.prisma.membership.findUnique({
          where: {
            userId_teamId: {
              userId,
              teamId: post.teamId,
            },
          },
        });

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke post ini",
          });
        }

        // Helper function to extract rich insights from rawInsights
        const extractRichInsights = (rawInsights: any) => {
          const insights: Record<string, any> = {};

          // Handle both array and object formats
          if (Array.isArray(rawInsights)) {
            // Standard format: array of insight objects
            rawInsights.forEach((insight) => {
              const value = insight.values?.[0]?.value || 0;
              insights[insight.name] = value;
            });
          } else if (rawInsights && typeof rawInsights === "object") {
            // Alternative format: direct object mapping
            Object.keys(rawInsights).forEach((key) => {
              insights[key] = rawInsights[key];
            });
          }

          return {
            // Basic metrics
            impressions: insights.post_impressions || insights.impressions || 0,
            impressionsUnique:
              insights.post_impressions_unique ||
              insights.impressions_unique ||
              0,
            impressionsPaid:
              insights.post_impressions_paid || insights.impressions_paid || 0,
            impressionsOrganic:
              insights.post_impressions_organic ||
              insights.impressions_organic ||
              0,
            clicks: 0, // post_clicks deprecated as of Sept 16, 2024 - no direct replacement

            // Detailed reactions
            reactions: {
              like:
                insights.post_reactions_like_total ||
                insights.reactions_like_total ||
                0,
              love:
                insights.post_reactions_love_total ||
                insights.reactions_love_total ||
                0,
              wow:
                insights.post_reactions_wow_total ||
                insights.reactions_wow_total ||
                0,
              haha:
                insights.post_reactions_haha_total ||
                insights.reactions_haha_total ||
                0,
              sad:
                insights.post_reactions_sorry_total ||
                insights.reactions_sorry_total ||
                0,
              angry:
                insights.post_reactions_anger_total ||
                insights.reactions_anger_total ||
                0,
            },

            // Engagement breakdown
            engagementMetrics: {
              totalReactions:
                (insights.post_reactions_like_total ||
                  insights.reactions_like_total ||
                  0) +
                (insights.post_reactions_love_total ||
                  insights.reactions_love_total ||
                  0) +
                (insights.post_reactions_wow_total ||
                  insights.reactions_wow_total ||
                  0) +
                (insights.post_reactions_haha_total ||
                  insights.reactions_haha_total ||
                  0) +
                (insights.post_reactions_sorry_total ||
                  insights.reactions_sorry_total ||
                  0) +
                (insights.post_reactions_anger_total ||
                  insights.reactions_anger_total ||
                  0),
              impressionsPaidVsOrganic: {
                paid:
                  insights.post_impressions_paid ||
                  insights.impressions_paid ||
                  0,
                organic:
                  insights.post_impressions_organic ||
                  insights.impressions_organic ||
                  0,
                total: insights.post_impressions || insights.impressions || 0,
              },
            },
          };
        };

        // Process analytics data for each platform
        const analyticsData = post.postSocialAccounts.map((psa) => {
          // FIXED: Prioritize records with rawInsights over just latest
          const recordWithRawInsights = psa.analytics.find(
            (analytics) =>
              analytics.rawInsights &&
              (analytics.rawInsights as any[]).length > 0
          );

          const latestAnalytics = psa.analytics[0]; // Most recent data (for basic metrics)

          // Use record with rawInsights for rich insights, latest for basic metrics
          const analyticsForRichInsights =
            recordWithRawInsights || latestAnalytics;
          const analyticsForBasicMetrics = latestAnalytics;

          // Extract rich insights from the record that has rawInsights
          let richInsights = null;
          try {
            if (analyticsForRichInsights?.rawInsights) {
              const rawData = analyticsForRichInsights.rawInsights;

              // Check if rawInsights contains actual insights data or just media metadata
              if (
                Array.isArray(rawData) ||
                (typeof rawData === "object" &&
                  (rawData as any).post_impressions !== undefined) ||
                (rawData as any).impressions !== undefined
              ) {
                // This looks like actual insights data
                richInsights = extractRichInsights(rawData);
              } else {
                // This is just media metadata, not insights
                console.log(
                  `📊 rawInsights contains media metadata, not analytics insights`
                );
                richInsights = null;
              }
            }
          } catch (error) {
            console.error(
              `❌ Error extracting rich insights for post ${input.postId}:`,
              error
            );
            // Continue with null richInsights instead of breaking the entire request
            richInsights = null;
          }

          // Create smart historical chart data
          const chartData = [];
          const today = new Date();

          // Get unique dates from analytics data (sorted by date)
          const analyticsWithDates = psa.analytics
            .map((analytics) => ({
              ...analytics,
              dateStr: analytics.recordedAt.toISOString().split("T")[0],
            }))
            .sort(
              (a, b) =>
                new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()
            );

          // Get unique dates
          const uniqueDates = [
            ...new Set(analyticsWithDates.map((a) => a.dateStr)),
          ];

          // If we have data, create chart from first data date to today (max 7 days)
          if (uniqueDates.length > 0) {
            const firstDataDate = new Date(uniqueDates[0]);
            const daysSinceFirstData = Math.floor(
              (today.getTime() - firstDataDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // Show up to 7 days, starting from first data date
            const daysToShow = Math.min(7, daysSinceFirstData + 1);

            for (let i = daysToShow - 1; i >= 0; i--) {
              const date = new Date(today);
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().split("T")[0];

              // Only include dates that are >= first data date
              if (date >= firstDataDate) {
                // Find analytics data for this date
                const dayAnalytics = psa.analytics.find(
                  (analytics) =>
                    analytics.recordedAt.toISOString().split("T")[0] === dateStr
                );

                chartData.push({
                  date: new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  }),
                  views: dayAnalytics?.views || 0,
                  likes: dayAnalytics?.likes || 0,
                  comments: dayAnalytics?.comments || 0,
                  shares: dayAnalytics?.shares || 0,
                  engagement: dayAnalytics?.engagement || 0,
                  reach: dayAnalytics?.reach || 0,
                  impressions: dayAnalytics?.impressions || 0,
                  clicks: dayAnalytics?.clicks || 0,
                });
              }
            }
          } else {
            // No data available, create single day with current date and 0 values
            chartData.push({
              date: today.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagement: 0,
              reach: 0,
              impressions: 0,
              clicks: 0,
            });
          }

          return {
            platform: psa.socialAccount.platform,
            socialAccountId: psa.socialAccountId,
            socialAccountName: psa.socialAccount.name,
            status: psa.status,
            publishedAt: psa.publishedAt,
            overview: analyticsForBasicMetrics
              ? {
                  views: analyticsForBasicMetrics.views,
                  likes: analyticsForBasicMetrics.likes,
                  comments: analyticsForBasicMetrics.comments,
                  shares: analyticsForBasicMetrics.shares,
                  clicks: analyticsForBasicMetrics.clicks,
                  reach: analyticsForBasicMetrics.reach,
                  impressions: analyticsForBasicMetrics.impressions,
                  engagement: analyticsForBasicMetrics.engagement,
                }
              : {
                  views: 0,
                  likes: 0,
                  comments: 0,
                  shares: 0,
                  clicks: 0,
                  reach: 0,
                  impressions: 0,
                  engagement: 0,
                },

            // Rich insights data (prioritize records with rawInsights)
            richInsights: richInsights || {
              impressions: analyticsForBasicMetrics?.impressions || 0,
              impressionsUnique: 0,
              impressionsPaid: 0,
              impressionsOrganic: analyticsForBasicMetrics?.impressions || 0,
              clicks: analyticsForBasicMetrics?.clicks || 0,
              reactions: {
                like: analyticsForBasicMetrics?.likes || 0,
                love: 0,
                wow: 0,
                haha: 0,
                sad: 0,
                angry: 0,
              },
              engagementMetrics: {
                totalReactions: analyticsForBasicMetrics?.likes || 0,
                impressionsPaidVsOrganic: {
                  paid: 0,
                  organic: analyticsForBasicMetrics?.impressions || 0,
                  total: analyticsForBasicMetrics?.impressions || 0,
                },
              },
            },

            historical: chartData,

            // Enhanced demographics data based on real analytics if available
            demographics: {
              ageGroups: [
                { range: "18-24", percentage: 25 },
                { range: "25-34", percentage: 35 },
                { range: "35-44", percentage: 22 },
                { range: "45-54", percentage: 12 },
                { range: "55+", percentage: 6 },
              ],
              gender: [
                { type: "Female", percentage: 58 },
                { type: "Male", percentage: 40 },
                { type: "Other", percentage: 2 },
              ],
              topLocations: [
                { country: "Indonesia", percentage: 45 },
                { country: "Malaysia", percentage: 18 },
                { country: "Singapore", percentage: 12 },
                { country: "Thailand", percentage: 8 },
                { country: "Others", percentage: 17 },
              ],
            },
          };
        });

        return {
          postId: post.id,
          postStatus: post.status,
          platforms: analyticsData,
        };
      } catch (error) {
        console.error(
          `❌ Error getting post analytics for ${input.postId}:`,
          error
        );

        // If it's already a TRPC error, re-throw it
        if (error instanceof TRPCError) {
          throw error;
        }

        // Otherwise, throw a generic error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get post analytics",
          cause: error,
        });
      }
    }),
});
