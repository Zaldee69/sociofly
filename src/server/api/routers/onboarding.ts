import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { OnboardingStatus, SocialPlatform } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

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
  pagesData: z
    .array(
      z.object({
        platform: z.nativeEnum(SocialPlatform),
        accessToken: z.string(),
        name: z.string(),
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

      console.log("Starting onboarding process:", {
        userType,
        organizationName,
        teamEmailsCount: teamEmails?.length,
        hasPagesData: !!pagesData,
      });

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
              memberships: {
                create: {
                  userId,
                  role: "ADMIN",
                },
              },
            },
          });
          console.log("Created team organization:", organization.name);
        } else {
          const defaultOrgName =
            existingUser.name || existingUser.email || "My Organization";
          // For solo type or if no org name provided, create default organization
          organization = await ctx.prisma.organization.create({
            data: {
              name: defaultOrgName,
              slug: `${existingUser.email.split("@")[0]}-org`,
              memberships: {
                create: {
                  userId,
                  role: "ADMIN",
                },
              },
            },
          });
          console.log("Created solo organization:", organization.name);
        }

        // Process team invitations if it's a team
        if (userType === "team" && teamEmails && teamEmails.length > 0) {
          console.log(`Processing ${teamEmails.length} team invitations`);
          for (const email of teamEmails) {
            try {
              console.log(`Processing invitation for: ${email}`);
              const invitedUser = await ctx.prisma.user.findUnique({
                where: { email },
              });

              // if (invitedUser) {
              //   // User exists, create membership
              //   const existingMembership =
              //     await ctx.prisma.membership.findFirst({
              //       where: {
              //         userId: invitedUser.id,
              //         organizationId: organization.id,
              //       },
              //     });

              //   if (!existingMembership) {
              //     await ctx.prisma.membership.create({
              //       data: {
              //         userId: invitedUser.id,
              //         organizationId: organization.id,
              //         role: "EDITOR",
              //       },
              //     });
              //     console.log(`Created membership for existing user: ${email}`);
              //   }
              // } else {
              // Create invitation for new user
              await ctx.prisma.invitation.create({
                data: {
                  email,
                  organizationId: organization.id,
                  role: "EDITOR",
                },
              });
              console.log(`Created invitation for new user: ${email}`);
              // }

              // Send invitation email
              await sendInviteEmail({
                email,
                organizationName: organization.name,
                role: "EDITOR",
              });
              console.log(`Sent invitation email to: ${email}`);
            } catch (error) {
              console.error(`Error processing team member ${email}:`, error);
              // Continue with next email instead of failing the whole process
              continue;
            }
          }
        }

        // Process social accounts if provided
        if (pagesData && pagesData.length > 0) {
          console.log(`Processing ${pagesData.length} social accounts`);
          for (const page of pagesData) {
            try {
              await ctx.prisma.socialAccount.create({
                data: {
                  platform: page.platform,
                  accessToken: page.accessToken,
                  name: page.name,
                  userId,
                  organizationId: organization.id,
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

  getSocialAccounts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const socialAccounts = await ctx.prisma.socialAccount.findMany({
      where: {
        userId: ctx.userId,
      },
      select: {
        id: true,
        platform: true,
        name: true,
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
