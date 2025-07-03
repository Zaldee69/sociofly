import { z } from "zod";
import { createTRPCRouter, protectedProcedure, hasFeature } from "@/server/api/trpc";
import { Feature } from "@/config/feature-flags";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  /**
   * Get current user's subscription details
   */
  getSubscriptionDetails: protectedProcedure
    .use(hasFeature(Feature.EMAIL_SUPPORT))
    .query(async ({ ctx }) => {
    const { userId } = ctx;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    // Get user data with subscription details
    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Return user with lastTransaction field for easier access
    return {
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionUpdatedAt: user.subscriptionUpdatedAt,
      subscriptionActive: user.subscriptionActive,
      lastTransaction: user.transactions[0] || null,
    };
  }),
});
