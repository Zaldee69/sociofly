import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  requirePermission,
} from "../trpc";
import { TRPCError } from "@trpc/server";
import { Role, SocialPlatform } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

export const teamRouter = createTRPCRouter({
  // Get all teams user is a member of
  getAllTeams: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    const memberships = await ctx.prisma.membership.findMany({
      where: { userId: ctx.userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { memberships: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      description: m.organization.slug,
      role: m.role,
      memberCount: m.organization._count.memberships,
    }));
  }),

  // Get single team details
  getTeamById: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is a member of this team
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
        },
        include: { organization: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a team member",
        });
      }

      return {
        id: membership.organization.id,
        name: membership.organization.name,
        description: membership.organization.slug,
        role: membership.role,
      };
    }),

  // Get team members
  getTeamMembers: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        searchQuery: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is a member of this team
      const userMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
        },
      });

      if (!userMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a team member",
        });
      }

      const members = await ctx.prisma.membership.findMany({
        where: {
          organizationId: input.teamId,
          userId: { not: ctx.userId }, // Exclude the current user
          user: input.searchQuery
            ? {
                OR: [
                  {
                    name: { contains: input.searchQuery, mode: "insensitive" },
                  },
                  {
                    email: { contains: input.searchQuery, mode: "insensitive" },
                  },
                ],
              }
            : undefined,
        },
        include: {
          user: true,
          organization: true,
        },
      });

      return members.map((m) => ({
        id: m.id,
        name: m.user.name || "Unnamed User",
        role: m.role,
        email: m.user.email,
        lastActive: m.createdAt.toISOString(),
        status: "active",
        canManage:
          userMembership.role === Role.TEAM_OWNER && m.role !== Role.TEAM_OWNER,
      }));
    }),

  // Create a new team
  createTeam: requirePermission("team.create")
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const organization = await ctx.prisma.organization.create({
        data: {
          name: input.name,
          slug: input.description,
          ownerId: ctx.userId,
          memberships: {
            create: {
              userId: ctx.userId,
              role: Role.TEAM_OWNER,
            },
          },
        },
      });

      return organization;
    }),

  // Invite member
  inviteMember: requirePermission("team.invite")
    .input(
      z.object({
        email: z.string().email(),
        teamId: z.string(),
        role: z.enum([
          Role.CAMPAIGN_MANAGER,
          Role.CONTENT_PRODUCER,
          Role.CONTENT_REVIEWER,
          Role.CLIENT_REVIEWER,
          Role.ANALYTICS_OBSERVER,
          Role.INBOX_AGENT,
        ]),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is admin
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
          role: Role.TEAM_OWNER,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Team Owner can invite members",
        });
      }

      const invitationAlreadExist = await ctx.prisma.invitation.findFirst({
        where: {
          email: input.email,
          organizationId: input.teamId,
        },
      });

      if (invitationAlreadExist) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invitation already exists",
        });
      }

      const user = await ctx.prisma.user.findFirst({
        where: {
          email: input.email,
        },
      });

      if (user) {
        const userAlreadyMember = await ctx.prisma.membership.findFirst({
          where: {
            userId: user.id,
            organizationId: input.teamId,
          },
        });

        if (userAlreadyMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User already a member of this team",
          });
        }
      }

      await sendInviteEmail({
        email: input.email,
        organizationName: input.name,
        role: input.role,
      });

      if (user) {
        return ctx.prisma.membership.create({
          data: {
            userId: user.id,
            organizationId: input.teamId,
            role: input.role,
          },
        });
      } else {
        return ctx.prisma.invitation.create({
          data: {
            email: input.email,
            role: input.role,
            organizationId: input.teamId,
          },
          include: {
            organization: true,
          },
        });
      }
    }),

  // Get pending invites for a team
  getTeamInvites: requirePermission("team.viewInvites")
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is admin
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
          role: Role.TEAM_OWNER,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Team Owner can view invites",
        });
      }

      return ctx.prisma.invitation.findMany({
        where: {
          organizationId: input.teamId,
          acceptedAt: null,
        },
        include: {
          organization: true,
        },
      });
    }),

  // Get team's social accounts
  getSocialAccounts: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const membership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not a member of this team",
        });
      }

      return ctx.prisma.socialAccount.findMany({
        where: {
          organizationId: input.teamId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Get available social platforms for connecting
  getAvailableSocialAccounts: requirePermission("social.connect")
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const membership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be an admin to view available platforms",
        });
      }

      // Get currently connected platforms
      const connectedPlatforms = await ctx.prisma.socialAccount
        .findMany({
          where: {
            organizationId: input.teamId,
          },
          select: {
            platform: true,
          },
        })
        .then((accounts) => accounts.map((a) => a.platform));

      // Return platforms that aren't connected yet
      const allPlatforms = Object.values(SocialPlatform);
      return allPlatforms.filter(
        (platform) => !connectedPlatforms.includes(platform)
      );
    }),

  // Add a social account
  addSocialAccount: requirePermission("social.connect")
    .input(
      z.object({
        teamId: z.string(),
        platform: z.nativeEnum(SocialPlatform),
        accessToken: z.string(),
        name: z.string().optional(),
        refreshToken: z.string().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const membership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be an admin to add social accounts",
        });
      }

      // Check if platform is already connected
      const existingAccount = await ctx.prisma.socialAccount.findFirst({
        where: {
          organizationId: input.teamId,
          platform: input.platform,
        },
      });

      if (existingAccount) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This platform is already connected",
        });
      }

      return ctx.prisma.socialAccount.create({
        data: {
          platform: input.platform,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken || null,
          expiresAt: input.expiresAt || null,
          name: input.name || null,
          organization: {
            connect: {
              id: input.teamId,
            },
          },
          user: {
            connect: {
              id: ctx.userId,
            },
          },
        },
      });
    }),

  // Remove a social account
  removeSocialAccount: requirePermission("social.connect")
    .input(
      z.object({
        teamId: z.string(),
        accountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const membership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be an admin to remove social accounts",
        });
      }

      const account = await ctx.prisma.socialAccount.findFirst({
        where: {
          id: input.accountId,
          organizationId: input.teamId,
        },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Social account not found",
        });
      }

      return ctx.prisma.socialAccount.delete({
        where: {
          id: input.accountId,
        },
      });
    }),

  // Update a team member's role
  updateMemberRole: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        memberId: z.string(),
        role: z.enum([
          Role.CAMPAIGN_MANAGER,
          Role.CONTENT_PRODUCER,
          Role.CONTENT_REVIEWER,
          Role.CLIENT_REVIEWER,
          Role.ANALYTICS_OBSERVER,
          Role.INBOX_AGENT,
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify current user is a team owner
      const currentUserMembership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
      });

      if (!currentUserMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Team Owner can update member roles",
        });
      }

      // Find the target membership record
      const targetMembership = await ctx.prisma.membership.findFirst({
        where: {
          id: input.memberId,
          organizationId: input.teamId,
        },
        include: {
          user: true,
        },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Prevent changes to TEAM_OWNER role
      if (targetMembership.role === Role.TEAM_OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change role of a Team Owner",
        });
      }

      // Update the role
      return ctx.prisma.membership.update({
        where: {
          id: input.memberId,
        },
        data: {
          role: input.role,
        },
        include: {
          user: true,
        },
      });
    }),

  // Remove a team member
  removeMember: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify current user is a team owner
      const currentUserMembership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
      });

      if (!currentUserMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Team Owner can remove members",
        });
      }

      // Find the target membership
      const targetMembership = await ctx.prisma.membership.findFirst({
        where: {
          id: input.memberId,
          organizationId: input.teamId,
        },
      });

      if (!targetMembership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      // Prevent removing a TEAM_OWNER
      if (targetMembership.role === Role.TEAM_OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove a Team Owner",
        });
      }

      // Delete the membership
      return ctx.prisma.membership.delete({
        where: {
          id: input.memberId,
        },
      });
    }),

  // Update team settings
  updateTeam: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(2),
        description: z.string(),
        color: z.string().optional(),
        notificationSettings: z
          .object({
            memberJoined: z.boolean(),
            memberLeft: z.boolean(),
            contentCreated: z.boolean(),
            contentReviewed: z.boolean(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify current user is a team owner
      const currentUserMembership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
      });

      if (!currentUserMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Team Owner can update team settings",
        });
      }

      const organization = await ctx.prisma.organization.findUnique({
        where: {
          id: input.teamId,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      // Update the organization
      return ctx.prisma.organization.update({
        where: {
          id: input.teamId,
        },
        data: {
          name: input.name,
          slug: input.description,
          // Store color in metadata if needed
          // Other fields can go here
        },
      });
    }),

  // Delete a team
  deleteTeam: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify current user is a team owner
      const currentUserMembership = await ctx.prisma.membership.findFirst({
        where: {
          organizationId: input.teamId,
          userId: ctx.userId,
          role: Role.TEAM_OWNER,
        },
      });

      if (!currentUserMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Team Owner can delete a team",
        });
      }

      const organization = await ctx.prisma.organization.findUnique({
        where: {
          id: input.teamId,
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      if (organization.ownerId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the team creator can delete a team",
        });
      }

      // Delete the team and all related records
      return ctx.prisma.organization.delete({
        where: {
          id: input.teamId,
        },
      });
    }),
});
