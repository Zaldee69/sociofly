import { z } from "zod";
import { createTRPCRouter, requirePermission } from "../trpc";
import { MediaType, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const mediaRouter = createTRPCRouter({
  getAll: requirePermission("media.view")
    .input(
      z.object({
        filter: z.enum(["all", "images", "videos"]).default("all"),
        search: z.string().optional(),
        organizationId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filter, search, organizationId, page, limit } = input;
      const skip = (page - 1) * limit;

      // Validate organization access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      const where: Prisma.MediaWhereInput = {
        organizationId,
        ...(filter === "images" && { type: MediaType.IMAGE }),
        ...(filter === "videos" && { type: MediaType.VIDEO }),
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
            { tags: { has: search } },
          ],
        }),
      };

      // Use Promise.all to run queries in parallel
      const [total, media, mediaUsage] = await Promise.all([
        // Get total count
        ctx.prisma.media.count({ where }),

        // Get paginated media
        ctx.prisma.media.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),

        // Get media usage counts directly from database
        ctx.prisma.post.groupBy({
          by: ["mediaUrls"],
          where: {
            organizationId,
            mediaUrls: {
              hasSome: [], // Will be filled after media query
            },
          },
          _count: true,
        }),
      ]);

      // Create a map of media URL to usage count
      const mediaUsageCount = mediaUsage.reduce(
        (acc, { mediaUrls, _count }) => {
          mediaUrls.forEach((url) => {
            acc[url] = _count;
          });
          return acc;
        },
        {} as Record<string, number>
      );

      const enrichedMedia = media.map((item) => ({
        ...item,
        uploader: item.user,
        usedIn: mediaUsageCount[item.url] || 0,
      }));

      return {
        items: enrichedMedia,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  delete: requirePermission("media.delete")
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate organization access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: input.organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      const media = await ctx.prisma.media.delete({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });
      return media;
    }),

  updateTags: requirePermission("media.edit")
    .input(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate organization access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: input.organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      const media = await ctx.prisma.media.update({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        data: {
          tags: input.tags,
        },
      });
      return media;
    }),

  // New procedure to copy media to another organization
  copyToOrganization: requirePermission("media.copy")
    .input(
      z.object({
        mediaId: z.string(),
        sourceOrgId: z.string(),
        targetOrgId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission in both organizations
      const userId = ctx.userId as string;
      const sourceMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: input.sourceOrgId,
        },
      });

      const targetMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: input.targetOrgId,
        },
      });

      if (!sourceMembership || !targetMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to one or both organizations",
        });
      }

      // Get the source media
      const sourceMedia = await ctx.prisma.media.findUnique({
        where: {
          id: input.mediaId,
          organizationId: input.sourceOrgId,
        },
      });

      if (!sourceMedia) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source media not found",
        });
      }

      // Create new media in target organization
      const newMedia = await ctx.prisma.media.create({
        data: {
          url: sourceMedia.url,
          type: sourceMedia.type,
          size: sourceMedia.size,
          tags: sourceMedia.tags,
          name: sourceMedia.name,
          userId,
          organizationId: input.targetOrgId,
          usageCount: 0,
        },
      });

      return newMedia;
    }),

  upload: requirePermission("media.upload")
    .input(
      z.object({
        url: z.string(),
        name: z.string(),
        type: z.nativeEnum(MediaType),
        size: z.number(),
        tags: z.array(z.string()).default([]),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate organization access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: input.organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this organization",
        });
      }

      const media = await ctx.prisma.media.create({
        data: {
          url: input.url,
          name: input.name,
          type: input.type,
          size: input.size,
          tags: input.tags,
          userId,
          organizationId: input.organizationId,
        },
      });

      return media;
    }),
});
