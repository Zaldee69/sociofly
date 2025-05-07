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
        filter: z.enum(["all", "used", "unused"]).default("all"),
        search: z.string().optional(),
        organizationId: z.string(),
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

      const { filter, search, organizationId } = input;

      const baseWhere: Prisma.MediaWhereInput = {
        organizationId,
      };

      if (search) {
        baseWhere.OR = [
          {
            url: {
              contains: search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          },
          {
            tags: {
              has: search,
            },
          },
        ];
      }

      // First get all media
      const media = await ctx.prisma.media.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Then get all posts to check media usage
      const posts = await ctx.prisma.post.findMany({
        where: {
          organizationId,
        },
        select: {
          mediaUrls: true,
        },
      });

      // Count how many times each media URL is used
      const mediaUsageCount = posts.reduce(
        (acc, post) => {
          post.mediaUrls.forEach((url) => {
            acc[url] = (acc[url] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>
      );

      const enrichedMedia = media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type,
        size: item.size,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        tags: item.tags,
        userId: item.userId,
        organizationId: item.organizationId,
        uploader: item.user,
        usageCount: item.usageCount,
        lastUsedAt: item.lastUsedAt,
        usedIn: mediaUsageCount[item.url] || 0,
      }));

      // Apply used/unused filter
      if (filter === "used") {
        return enrichedMedia.filter((item) => item.usedIn > 0);
      } else if (filter === "unused") {
        return enrichedMedia.filter((item) => item.usedIn === 0);
      }

      return enrichedMedia;
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
          userId: ctx.userId,
          organizationId: input.targetOrgId,
          usageCount: 0,
        },
      });

      return newMedia;
    }),
});
