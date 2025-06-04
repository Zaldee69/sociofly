import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  publicProcedure,
  protectedProcedure,
  createTRPCRouter,
} from "@/server/api/trpc";
import { PostStatus, SocialPlatform } from "@prisma/client";
import { PostPublisherService } from "@/lib/services/post-publisher";

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
  // Dapatkan semua post untuk organisasi
  getAll: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, status, platform, fromDate, toDate } = input;

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

      // Periksa apakah pengguna memiliki akses ke organisasi
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.auth.userId,
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
            userId: ctx.auth.userId,
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
    .input(
      updatePostSchema.extend({
        socialAccountIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, socialAccountIds, ...updateData } = input;

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
            userId: ctx.auth.userId,
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
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Periksa apakah post ada dan pengguna memiliki akses
      const post = await ctx.prisma.post.findUnique({
        where: { id },
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
            userId: ctx.auth.userId,
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

      // Hapus post dan semua relasi (PostSocialAccount akan dihapus secara cascade)
      await ctx.prisma.post.delete({
        where: { id },
      });

      return { success: true };
    }),

  // Publish post secara manual
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

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
            userId: ctx.auth.userId,
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
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

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
            userId: ctx.auth.userId,
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
    .input(
      z.object({
        teamId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, page, limit } = input;
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
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

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
            userId: ctx.auth.userId,
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
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { postId } = input;

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
            userId: ctx.auth.userId,
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
});
