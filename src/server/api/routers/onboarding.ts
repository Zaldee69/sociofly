import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { OnboardingStatus, SocialPlatform } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

const onboardingSchema = z.object({
  userType: z.enum(["solo", "team"]),
  organizationName: z.string().optional(),
  teamEmails: z
    .array(
      z
        .string()
        .email("Email tidak valid")
        .transform((email) => email.toLowerCase().trim())
    )
    .optional()
    .nullable()
    .default([]),
  socialAccounts: z
    .object({
      instagram: z.boolean(),
      facebook: z.boolean(),
      twitter: z.boolean(),
      youtube: z.boolean(),
    })
    .optional(),
  pagesData: z
    .array(
      z.object({
        platform: z.nativeEnum(SocialPlatform),
        accessToken: z.string(),
        name: z.string(),
        profilePicture: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export const onboardingRouter = createTRPCRouter({
  completeOnboarding: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const { userType, organizationName, teamEmails, pagesData } = input;

      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.userId;

      try {
        // Get existing user
        const existingUser = await ctx.prisma.user.findUnique({
          where: { id: userId },
          include: {
            memberships: {
              take: 1,
            },
          },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Create or get organization
        let organization;
        if (userType === "team" && organizationName) {
          // For team type, create new organization with provided name
          organization = await ctx.prisma.organization.create({
            data: {
              name: organizationName,
              slug: organizationName.toLowerCase().replace(/\s+/g, "-"),
              ownerId: userId,
              memberships: {
                create: {
                  userId,
                  role: "ADMIN",
                },
              },
            },
          });
        } else {
          const defaultOrgName =
            existingUser.name || existingUser.email || "My Organization";
          // For solo type or if no org name provided, create default organization
          organization = await ctx.prisma.organization.create({
            data: {
              name: defaultOrgName,
              slug: `${existingUser.email.split("@")[0]}-org`,
              ownerId: userId,
              memberships: {
                create: {
                  userId,
                  role: "ADMIN",
                },
              },
            },
          });
        }

        // Process team invitations if it's a team and has emails
        if (
          userType === "team" &&
          teamEmails &&
          Array.isArray(teamEmails) &&
          teamEmails.length > 0
        ) {
          for (const email of teamEmails) {
            try {
              await ctx.prisma.invitation.create({
                data: {
                  email,
                  organizationId: organization.id,
                  role: "EDITOR",
                },
              });

              // Send invitation email
              await sendInviteEmail({
                email,
                organizationName: organization.name,
                role: "EDITOR",
              });
            } catch (error) {
              console.error(`Error processing team member ${email}:`, error);
              // Continue with next email instead of failing the whole process
              continue;
            }
          }
        }

        // Process social accounts if provided
        if (pagesData && pagesData.length > 0) {
          for (const page of pagesData) {
            try {
              await ctx.prisma.socialAccount.create({
                data: {
                  platform: page.platform,
                  accessToken: page.accessToken,
                  name: page.name,
                  userId,
                  organizationId: organization.id,
                  profilePicture: page.profilePicture || null,
                },
              });
              console.log(
                `Created social account: ${page.platform} - ${page.name}`
              );
            } catch (error) {
              console.error(`Error creating social account:`, error);
              continue;
            }
          }
        }

        // Update user onboarding status
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { onboardingStatus: OnboardingStatus.COMPLETED },
        });

        console.log("Onboarding completed successfully");
        return {
          success: true,
          message: "Onboarding completed successfully",
          organization,
        };
      } catch (error) {
        console.error("Error in onboarding process:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to complete onboarding",
        });
      }
    }),

  // Get onboarding status
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    });

    return {
      onboardingStatus: user?.onboardingStatus,
    };
  }),

  getSocialAccounts: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const socialAccounts = await ctx.prisma.socialAccount.findMany({
        where: {
          userId: ctx.userId,
          ...(input.organizationId
            ? { organizationId: input.organizationId }
            : {}),
        },
        select: {
          id: true,
          platform: true,
          name: true,
          profilePicture: true,
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
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.prisma.user.update({
        where: {
          id: ctx.userId,
        },
        data: {
          onboardingStatus: input.status as OnboardingStatus,
        },
      });

      return user;
    }),
});
