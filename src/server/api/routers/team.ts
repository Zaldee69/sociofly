import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Role, SocialPlatform } from "@prisma/client";

// Zod schemas for validation
const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
});

const TeamMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: z.enum(["Admin", "Editor", "Viewer"]),
  email: z.string().email(),
  team: z.string(),
  lastActive: z.string(),
  status: z.enum(["active", "inactive"]),
});

const InvitationSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  team: z.string(),
  role: z.enum(["Admin", "Editor", "Viewer"]),
  sentAt: z.string(),
  expiresAt: z.string(),
});

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
        canManage: userMembership.role === Role.ADMIN && m.role !== Role.ADMIN,
      }));
    }),

  // Create a new team
  createTeam: protectedProcedure
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
          memberships: {
            create: {
              userId: ctx.userId,
              role: Role.ADMIN,
            },
          },
        },
      });

      return organization;
    }),

  // Invite member
  inviteMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        teamId: z.string(),
        role: z.enum([Role.ADMIN, Role.EDITOR, Role.VIEWER]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is admin
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
          role: Role.ADMIN,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can invite members",
        });
      }

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
    }),

  // Get pending invites for a team
  getTeamInvites: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is admin
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
          role: Role.ADMIN,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can view invites",
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
  getAvailableSocialAccounts: protectedProcedure
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
          role: "ADMIN",
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
  addSocialAccount: protectedProcedure
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
          role: "ADMIN",
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
  removeSocialAccount: protectedProcedure
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
          role: "ADMIN",
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
});
