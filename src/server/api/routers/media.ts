import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { MediaType, Prisma, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// Helper function to check if user has required role in organization
const checkPermission = async (
  ctx: any,
  organizationId: string,
  requiredRoles: Role[]
) => {
  const membership = await ctx.prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: ctx.userId,
        organizationId,
      },
    },
  });

  if (!membership || !requiredRoles.includes(membership.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to perform this action",
    });
  }

  return membership;
};

export const mediaRouter = createTRPCRouter({
  getAll: protectedProcedure
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
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is member of the organization
      await checkPermission(ctx, input.organizationId, [
        Role.ADMIN,
        Role.EDITOR,
        Role.VIEWER,
      ]);

      const { filter, search, organizationId, page, limit } = input;
      const skip = (page - 1) * limit;

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

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user has permission to delete media
      await checkPermission(ctx, input.organizationId, [
        Role.ADMIN,
        Role.EDITOR,
      ]);

      const media = await ctx.prisma.media.delete({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });
      return media;
    }),

  updateTags: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user has permission to update media
      await checkPermission(ctx, input.organizationId, [
        Role.ADMIN,
        Role.EDITOR,
      ]);

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
  copyToOrganization: protectedProcedure
    .input(
      z.object({
        mediaId: z.string(),
        sourceOrgId: z.string(),
        targetOrgId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user has permission in both organizations
      await checkPermission(ctx, input.sourceOrgId, [
        Role.ADMIN,
        Role.EDITOR,
        Role.VIEWER,
      ]);
      await checkPermission(ctx, input.targetOrgId, [Role.ADMIN, Role.EDITOR]);

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
          userId: ctx.userId,
          organizationId: input.targetOrgId,
          usageCount: 0,
        },
      });

      return newMedia;
    }),
});
