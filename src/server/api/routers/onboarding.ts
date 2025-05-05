import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { OnboardingStatus } from "@prisma/client";

const onboardingSchema = z.object({
  userType: z.enum(["solo", "team"]),
  organizationName: z.string().optional(),
  teamEmails: z.array(z.string().email()).optional(),
  socialAccounts: z
    .object({
      instagram: z.boolean(),
      facebook: z.boolean(),
      twitter: z.boolean(),
      youtube: z.boolean(),
    })
    .optional(),
});

export const onboardingRouter = createTRPCRouter({
  completeOnboarding: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const { userType, organizationName, teamEmails } = input;
      const userId = ctx.userId;

      try {
        let createdOrganization = null;
        if (userType === "team" && organizationName) {
          createdOrganization = await ctx.prisma.organization.create({
            data: {
              name: organizationName,
              slug: organizationName.toLowerCase().replace(/\s+/g, "-"),
              memberships: {
                create: {
                  userId: userId!,
                  role: "ADMIN",
                },
              },
            },
          });

          // Create memberships for team members if provided
          if (teamEmails && teamEmails.length > 0) {
            // Here you would typically:
            // 1. Create users for each email if they don't exist
            // 2. Create memberships for each user
            // 3. Send invitation emails
            // For now, we'll just log the emails
            console.log("Team emails to invite:", teamEmails);
          }
        }

        return {
          success: true,
          message: "Onboarding completed successfully",
        };
      } catch (error) {
        console.error("Error completing onboarding:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete onboarding",
        });
      } finally {
        await ctx.prisma.user.update({
          where: { id: userId! },
          data: { onboardingStatus: OnboardingStatus.COMPLETED },
        });
      }
    }),

  // Get onboarding status
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Check if user has completed onboarding
    const user = await ctx.prisma.user.findUnique({
      where: { id: userId! },
    });

    return {
      onboardingStatus: user?.onboardingStatus,
    };
  }),

  getSocialAccounts: protectedProcedure.query(async ({ ctx }) => {
    const socialAccounts = await ctx.prisma.socialAccount.findMany({
      where: {
        userId: ctx.userId!,
      },
      select: {
        id: true,
        platform: true,
      },
    });

    return socialAccounts;
  }),

  updateOnboardingStatus: protectedProcedure
    .input(
      z.object({
        status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.update({
        where: {
          id: ctx.auth.userId,
        },
        data: {
          onboardingStatus: input.status as OnboardingStatus,
        },
      });

      return user;
    }),
});
