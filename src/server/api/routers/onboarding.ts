import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { OnboardingStatus, Role, SocialPlatform } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email/send-invite-email";
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";
import { clerkClient } from "@clerk/nextjs/server";

// Helper function to queue initial analytics collection as background job
export async function queueInitialAnalyticsCollection(
  socialAccount: { id: string; platform: string; name: string },
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `🚀 Queueing initial analytics collection for ${socialAccount.platform} account: ${socialAccount.name}`
    );

    // Get queue manager instance
    const queueManager = QueueManager.getInstance();
    await queueManager.initialize();

    // Queue initial sync job for background processing
    await queueManager.addJob(
      QueueManager.QUEUES.SOCIAL_SYNC,
      JobType.INITIAL_SYNC,
      {
        accountId: socialAccount.id,
        teamId: teamId,
        platform: socialAccount.platform as
          | "INSTAGRAM"
          | "FACEBOOK"
          | "TWITTER"
          | "LINKEDIN"
          | "TIKTOK"
          | "YOUTUBE",
        daysBack: 30,
        priority: "normal",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        delay: 4000, // Start after 4 seconds to allow onboarding to complete
      }
    );

    await queueManager.addJob(
      QueueManager.QUEUES.SOCIAL_SYNC,
      JobType.DAILY_SYNC,
      {
        accountId: socialAccount.id,
        teamId: teamId,
        platform: socialAccount.platform as
          | "INSTAGRAM"
          | "FACEBOOK"
          | "TWITTER"
          | "LINKEDIN"
          | "TIKTOK"
          | "YOUTUBE",
        daysBack: 30,
        priority: "normal",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        delay: 2000, // Start after 2 seconds to allow onboarding to complete
      }
    );

    console.log(
      `✅ Initial analytics collection queued for ${socialAccount.platform} account: ${socialAccount.name}`
    );

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `❌ Failed to queue initial analytics collection for ${socialAccount.platform}:`,
      errorMessage
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

const onboardingSchema = z.object({
  userType: z.enum(["solo", "team"]),
  teamName: z.string().optional(),
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
        profileId: z.string().optional(),
      })
    )
    .optional(),
  sessionId: z.string().optional(),
});

export const onboardingRouter = createTRPCRouter({
  completeOnboarding: protectedProcedure
    .input(onboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const { userType, teamName, teamEmails, pagesData, sessionId } = input;

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

        // Create or get team
        let team;
        if (userType === "team" && teamName) {
          // For team type, create new team with provided name
          team = await ctx.prisma.$transaction(async (tx) => {
            // Create the team
            const newTeam = await tx.team.create({
              data: {
                name: teamName,
                slug: teamName.toLowerCase().replace(/\s+/g, "-"),
                ownerId: userId,
                memberships: {
                  create: {
                    userId,
                    role: Role.OWNER,
                  },
                },
              },
            });

            // Create a default approval workflow
            const workflowRecord = await tx.approvalWorkflow.create({
              data: {
                name: "Default Approval Workflow",
                description: "Team's default content approval workflow",
                teamId: newTeam.id,
              },
            });

            // Create default workflow steps
            await tx.approvalStep.create({
              data: {
                name: "Manager Review",
                order: 1,
                role: Role.MANAGER,
                requireAllUsersInRole: false,
                workflowId: workflowRecord.id,
              },
            });

            await tx.approvalStep.create({
              data: {
                name: "Supervisor Approval",
                order: 2,
                role: Role.SUPERVISOR,
                requireAllUsersInRole: false,
                workflowId: workflowRecord.id,
              },
            });

            await tx.approvalStep.create({
              data: {
                name: "Internal Review",
                order: 3,
                role: Role.INTERNAL_REVIEWER,
                requireAllUsersInRole: true,
                workflowId: workflowRecord.id,
              },
            });

            await tx.approvalStep.create({
              data: {
                name: "Client Approval",
                order: 4,
                role: Role.CLIENT_REVIEWER,
                requireAllUsersInRole: false,
                workflowId: workflowRecord.id,
              },
            });

            return newTeam;
          });
        } else {
          const defaultTeamName =
            existingUser.name || existingUser.email || "My Team";
          // For solo type or if no team name provided, create default team with transaction
          team = await ctx.prisma.$transaction(async (tx) => {
            // Create the team
            const newTeam = await tx.team.create({
              data: {
                name: defaultTeamName,
                slug: `${existingUser.email.split("@")[0]}-team`,
                ownerId: userId,
                memberships: {
                  create: {
                    userId,
                    role: Role.OWNER,
                  },
                },
              },
            });

            // Create a default approval workflow
            const workflowRecord = await tx.approvalWorkflow.create({
              data: {
                name: "Default Approval Workflow",
                description: "Team's default content approval workflow",
                teamId: newTeam.id,
              },
            });

            // Create default workflow steps
            await tx.approvalStep.create({
              data: {
                name: "Manager Review",
                order: 1,
                role: Role.MANAGER,
                requireAllUsersInRole: false,
                workflowId: workflowRecord.id,
              },
            });

            await tx.approvalStep.create({
              data: {
                name: "Supervisor Approval",
                order: 2,
                role: Role.SUPERVISOR,
                requireAllUsersInRole: false,
                workflowId: workflowRecord.id,
              },
            });

            return newTeam;
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
                  teamId: team.id,
                  role: Role.CONTENT_CREATOR,
                  invitedBy: userId,
                },
              });

              // Send invitation email
              await sendInviteEmail({
                email,
                teamName: team.name,
                role: Role.CONTENT_CREATOR,
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
              // After creating the social account, fetch initial insights
              const socialAccount = await ctx.prisma.socialAccount.create({
                data: {
                  platform: page.platform,
                  accessToken: page.accessToken,
                  profileId: page.profileId,
                  name: page.name,
                  userId,
                  teamId: team.id,
                  profilePicture: page.profilePicture || null,
                },
              });
              console.log(
                `Created social account: ${page.platform} - ${page.name}`
              );

              // Queue initial analytics collection for supported platforms
              if (
                page.platform === "INSTAGRAM" ||
                page.platform === "FACEBOOK"
              ) {
                const analyticsResult = await queueInitialAnalyticsCollection(
                  {
                    id: socialAccount.id,
                    platform: page.platform,
                    name: page.name,
                  },
                  team.id
                );

                if (!analyticsResult.success) {
                  console.warn(
                    `⚠️ Failed to queue analytics collection for ${page.name}: ${analyticsResult.error}`
                  );
                  // Don't fail onboarding if analytics queueing fails
                }
              }
            } catch (error) {
              console.error(`Error creating social account:`, error);
              continue;
            }
          }
        }

        if (sessionId) {
          await ctx.prisma.temporaryData.delete({
            where: { id: sessionId },
          });
        }

        // Update user onboarding status in our database
        const updatedUser = await ctx.prisma.user.update({
          where: { id: userId },
          data: { onboardingStatus: OnboardingStatus.COMPLETED },
          select: { clerkId: true },
        });

        // Update Clerk user metadata to reflect completed onboarding
        if (updatedUser.clerkId) {
          try {
            const clerk = await clerkClient();
            await clerk.users.updateUser(updatedUser.clerkId, {
              publicMetadata: {
                onboardingComplete: true,
              },
            });
            console.log(
              `✅ Updated Clerk metadata for user ${updatedUser.clerkId}`
            );
          } catch (clerkError) {
            console.error("Error updating Clerk metadata:", clerkError);
            // Don't fail onboarding if Clerk update fails
          }
        }

        console.log("Onboarding completed successfully");
        return {
          success: true,
          message: "Onboarding completed successfully",
          team,
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
    .input(z.object({ teamId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const socialAccounts = await ctx.prisma.socialAccount.findMany({
        where: {
          ...(input.teamId ? { teamId: input.teamId } : {}),
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

      try {
        // Check if user exists before updating
        const existingUser = await ctx.prisma.user.findUnique({
          where: { id: ctx.userId },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "User record not found in database. This may happen if your account was just created.",
          });
        }

        const user = await ctx.prisma.user.update({
          where: {
            id: ctx.userId,
          },
          data: {
            onboardingStatus: input.status as OnboardingStatus,
          },
          select: {
            clerkId: true,
            onboardingStatus: true,
          },
        });

        // Update Clerk user metadata to reflect onboarding status
        if (user.clerkId) {
          try {
            const clerk = await clerkClient();
            await clerk.users.updateUser(user.clerkId, {
              publicMetadata: {
                onboardingComplete:
                  user.onboardingStatus === OnboardingStatus.COMPLETED,
              },
            });
            console.log(`✅ Updated Clerk metadata for user ${user.clerkId}`);
          } catch (clerkError) {
            console.error("Error updating Clerk metadata:", clerkError);
            // Don't fail the status update if Clerk update fails
          }
        }

        return user;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error updating onboarding status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to update onboarding status. Please try again later.",
        });
      }
    }),

  getTemporaryData: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { sessionId } = input;
      const temporaryData = await ctx.prisma.temporaryData.findUnique({
        where: { id: sessionId },
      });

      return JSON.parse(temporaryData?.data || "[]");
    }),

  // Update or delete temporary data
  deleteTemporaryData: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        data: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, data } = input;

      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Update data with filtered accounts (or empty array if all deleted)
      await ctx.prisma.temporaryData.update({
        where: { id: sessionId },
        data: { data },
      });

      return { success: true };
    }),

  linkSocialAccount: protectedProcedure
    .input(
      z.object({
        platform: z.enum([
          "INSTAGRAM",
          "FACEBOOK",
          "TWITTER",
          "LINKEDIN",
          "TIKTOK",
        ]),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        profileId: z.string(),
        name: z.string(),
        profilePicture: z.string().optional(),
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create social account
      const socialAccount = await ctx.prisma.socialAccount.create({
        data: {
          platform: input.platform,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          profileId: input.profileId,
          name: input.name,
          profilePicture: input.profilePicture,
          userId: ctx.auth.userId,
          teamId: input.teamId,
        },
      });

      // Queue initial analytics collection for supported platforms
      if (input.platform === "INSTAGRAM" || input.platform === "FACEBOOK") {
        const analyticsResult = await queueInitialAnalyticsCollection(
          { id: socialAccount.id, platform: input.platform, name: input.name },
          input.teamId
        );

        if (!analyticsResult.success) {
          console.warn(
            `⚠️ Failed to queue analytics collection for ${input.name}: ${analyticsResult.error}`
          );
          // Don't fail the account linking if analytics queueing fails
        }
      }

      return {
        socialAccount,
        message: `${input.platform} account linked successfully! Historical data collection has been started in the background.`,
      };
    }),

  // Get analytics collection status
  getAnalyticsStatus: protectedProcedure
    .input(z.object({ socialAccountId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get latest analytics data to determine status
      const latestAnalytics = await ctx.prisma.accountAnalytics.findFirst({
        where: { socialAccountId: input.socialAccountId },
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      });

      const latestHotspots = await ctx.prisma.engagementHotspot.findFirst({
        where: { socialAccountId: input.socialAccountId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      });

      return {
        hasAnalytics: !!latestAnalytics,
        hasHotspots: !!latestHotspots,
        lastAnalyticsUpdate: latestAnalytics?.recordedAt,
        lastHotspotsUpdate: latestHotspots?.updatedAt,
      };
    }),
});
