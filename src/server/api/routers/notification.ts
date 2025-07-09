import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const getNotificationsSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  unreadOnly: z.boolean().optional().default(false),
});

export const notificationRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, offset, unreadOnly } = input;
      const userId = ctx.auth.userId;

      const where = {
        userId,
        ...(unreadOnly && { isRead: false }),
      };

      const [notifications, total] = await Promise.all([
        ctx.prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            title: true,
            body: true,
            type: true,
            isRead: true,
            link: true,
            metadata: true,
            createdAt: true,
            readAt: true,
            expiresAt: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        ctx.prisma.notification.count({ where }),
      ]);

      return {
        notifications,
        pagination: {
          total,
        },
      };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.userId;

    const count = await ctx.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { notificationId } = input;
      const userId = ctx.auth.userId;

      const notification = await ctx.prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to mark this notification as read",
        });
      }

      await ctx.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return { success: true };
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.userId;

    await ctx.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }),
});
