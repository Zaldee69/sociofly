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
  organizationId: z.string(),
  socialAccountIds: z.array(z.string()),
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
  organizationId: z.string(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  status: z.nativeEnum(PostStatus).optional(),
  platform: z.nativeEnum(SocialPlatform).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const postRouter = createTRPCRouter({
  // Dapatkan semua post untuk organisasi
  getAll: protectedProcedure
    .input(getPostsSchema)
    .query(async ({ ctx, input }) => {
      const {
        organizationId,
        page,
        limit,
        status,
        platform,
        fromDate,
        toDate,
      } = input;
      const skip = (page - 1) * limit;

      // Bangun filter berdasarkan input
      const where: any = { organizationId };

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
          skip,
          take: limit,
          orderBy: { scheduledAt: "asc" },
          include: {
            socialAccounts: {
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
          pages: Math.ceil(totalCount / limit),
          page,
          limit,
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
          socialAccounts: {
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
        organizationId,
        socialAccountIds,
      } = input;

      // Periksa apakah pengguna memiliki akses ke organisasi
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.auth.userId,
            organizationId,
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
          organizationId,
        },
      });

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
            status: PostStatus.SCHEDULED,
            userId: ctx.auth.userId,
            organizationId,
          },
        });

        // Hubungkan post dengan akun sosial
        await Promise.all(
          socialAccountIds.map((socialAccountId) =>
            tx.postSocialAccount.create({
              data: {
                postId: post.id,
                socialAccountId,
                status: PostStatus.SCHEDULED,
              },
            })
          )
        );

        return post;
      });
    }),

  // Update post yang sudah ada
  update: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Periksa apakah post ada dan pengguna memiliki akses
      const post = await ctx.prisma.post.findUnique({
        where: { id },
        include: {
          socialAccounts: true,
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
          userId_organizationId: {
            userId: ctx.auth.userId,
            organizationId: post.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses untuk mengedit post ini",
        });
      }

      // Update post
      const updatedPost = await ctx.prisma.post.update({
        where: { id },
        data: updateData,
        include: {
          socialAccounts: {
            include: {
              socialAccount: true,
            },
          },
        },
      });

      // Jika status diperbarui, update status semua PostSocialAccount
      if (input.status) {
        await ctx.prisma.postSocialAccount.updateMany({
          where: { postId: id },
          data: { status: input.status },
        });
      }

      return updatedPost;
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
          userId_organizationId: {
            userId: ctx.auth.userId,
            organizationId: post.organizationId,
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
          socialAccounts: true,
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
          userId_organizationId: {
            userId: ctx.auth.userId,
            organizationId: post.organizationId,
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
          socialAccounts: {
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

  // Mendapatkan daftar post yang gagal dipublikasi
  getFailed: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, page, limit } = input;
      const skip = (page - 1) * limit;

      const where = {
        organizationId,
        status: PostStatus.FAILED,
      };

      const [failedPosts, totalCount] = await Promise.all([
        ctx.prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: "desc" },
          include: {
            socialAccounts: {
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
          socialAccounts: {
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
          userId_organizationId: {
            userId: ctx.auth.userId,
            organizationId: post.organizationId,
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
          socialAccounts: {
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
});
