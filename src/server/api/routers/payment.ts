import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import midtransClient from "midtrans-client";
import { SUBSCRIPTION_PRICES } from "@/config/constants";

const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
});

type Plan = "FREE" | "PRO" | "ENTERPRISE";
type BillingCycle = "MONTHLY" | "YEARLY";

export const paymentRouter = createTRPCRouter({
  createTransaction: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["FREE", "PRO", "ENTERPRISE"]),
        billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
      })
    )
    .mutation(
      async ({
        ctx,
        input,
      }: {
        ctx: any;
        input: { plan: Plan; billingCycle: BillingCycle };
      }) => {
        const { plan, billingCycle } = input;

        const userId = ctx.userId;

        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || !user.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User email is required for payment processing",
          });
        }

        // Calculate amount based on plan and billing cycle
        const baseAmount = SUBSCRIPTION_PRICES[plan];
        let amount: number = baseAmount;

        if (billingCycle === "YEARLY") {
          // Apply 20% discount for yearly billing
          amount = Math.round(baseAmount * 12 * 0.8);
        }

        if (plan === "FREE") {
          // Handle free plan logic if necessary
          await ctx.prisma.user.update({
            where: { id: userId },
            data: { subscriptionPlan: "FREE" },
          });
          return { message: "Successfully subscribed to the free plan." };
        }

        const transaction = await ctx.prisma.transaction.create({
          data: {
            userId,
            amount,
            plan,
            billingCycle,
            status: "PENDING",
            midtransOrderId: `order-${userId}-${Date.now()}`,
          },
        });

        const parameters = {
          transaction_details: {
            order_id: transaction.midtransOrderId,
            gross_amount: amount,
          },
          customer_details: {
            first_name: user.name || "Guest",
            email: user.email, // We've validated this exists above
          },
          item_details: [
            {
              id: plan,
              price: amount,
              quantity: 1,
              name: `${plan} Plan (${billingCycle.toLowerCase()})`,
            },
          ],
          callbacks: {
            finish: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=success&order_id=${transaction.midtransOrderId}`,
            error: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=error&order_id=${transaction.midtransOrderId}`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=pending&order_id=${transaction.midtransOrderId}`,
          },
        };

        const midtransResponse = await snap.createTransaction(parameters);
        const { token, redirect_url } = midtransResponse;

        await ctx.prisma.transaction.update({
          where: { id: transaction.id },
          data: { midtransToken: token },
        });

        return { token, redirect_url };
      }
    ),

  // Get payment history for the current user
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        page: z.number().min(1).optional().default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { limit, page } = input;
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalCount = await ctx.prisma.transaction.count({
        where: { userId: ctx.userId },
      });

      const transactions = await ctx.prisma.transaction.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: limit,
        skip,
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        transactions,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }),
});
