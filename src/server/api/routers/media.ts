import { z } from "zod";
import {
  createTRPCRouter,
  requirePermission,
  hasFeature,
  hasTeamFeature,
} from "../trpc";
import { Feature } from "@/config/feature-flags";
import { MediaType, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const mediaRouter = createTRPCRouter({
  getAll: requirePermission("media.view")
    .use(hasTeamFeature(Feature.MEDIA_STORAGE_BASIC))
    .input(
      z.object({
        filter: z.enum(["all", "images", "videos"]).default("all"),
        search: z.string().optional(),
        teamId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filter, search, teamId, page, limit } = input;
      const skip = (page - 1) * limit;

      // Validate team access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          teamId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this team",
        });
      }

      const where: Prisma.MediaWhereInput = {
        teamId,
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
            teamId,
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
    .use(hasTeamFeature(Feature.MEDIA_STORAGE_BASIC))
    .input(
      z.object({
        id: z.string(),
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate team access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          teamId: input.teamId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this team",
        });
      }

      const media = await ctx.prisma.media.delete({
        where: {
          id: input.id,
          teamId: input.teamId,
        },
      });
      return media;
    }),

  updateTags: requirePermission("media.edit")
    .use(hasTeamFeature(Feature.MEDIA_STORAGE_BASIC))
    .input(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate team access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          teamId: input.teamId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this team",
        });
      }

      const media = await ctx.prisma.media.update({
        where: {
          id: input.id,
          teamId: input.teamId,
        },
        data: {
          tags: input.tags,
        },
      });
      return media;
    }),

  // New procedure to copy media to another team
  copyToTeam: requirePermission("media.copy")
    .use(hasTeamFeature(Feature.MEDIA_STORAGE_PRO))
    .input(
      z.object({
        mediaId: z.string(),
        sourceTeamId: z.string(),
        targetTeamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission in both teams
      const userId = ctx.userId as string;
      const sourceMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          teamId: input.sourceTeamId,
        },
      });

      const targetMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          teamId: input.targetTeamId,
        },
      });

      if (!sourceMembership || !targetMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to one or both teams",
        });
      }

      // Get the source media
      const sourceMedia = await ctx.prisma.media.findUnique({
        where: {
          id: input.mediaId,
          teamId: input.sourceTeamId,
        },
      });

      if (!sourceMedia) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source media not found",
        });
      }

      // Create new media in target team
      const newMedia = await ctx.prisma.media.create({
        data: {
          url: sourceMedia.url,
          type: sourceMedia.type,
          size: sourceMedia.size,
          tags: sourceMedia.tags,
          name: sourceMedia.name,
          userId,
          teamId: input.targetTeamId,
          usageCount: 0,
        },
      });

      return newMedia;
    }),

  upload: requirePermission("media.upload")
    .use(hasTeamFeature(Feature.MEDIA_STORAGE_BASIC))
    .input(
      z.object({
        url: z.string(),
        name: z.string(),
        type: z.nativeEnum(MediaType),
        size: z.number(),
        tags: z.array(z.string()).default([]),
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate team access
      const userId = ctx.userId as string;
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId,
          teamId: input.teamId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this team",
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
          teamId: input.teamId,
        },
      });

      return media;
    }),
});
