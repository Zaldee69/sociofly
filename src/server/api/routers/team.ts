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
        canManage: userMembership.role === Role.OWNER && m.role !== Role.OWNER,
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
          ownerId: ctx.userId,
          memberships: {
            create: {
              userId: ctx.userId,
              role: Role.OWNER,
            },
          },
        },
      });

      return organization;
    }),

  // Invite member
  inviteMember: requirePermission("team.manage")
    .input(
      z.object({
        email: z.string().email(),
        teamId: z.string(),
        role: z.enum([
          Role.MANAGER,
          Role.SUPERVISOR,
          Role.CONTENT_CREATOR,
          Role.INTERNAL_REVIEWER,
          Role.CLIENT_REVIEWER,
          Role.ANALYST,
          Role.INBOX_AGENT,
        ]),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

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
  getTeamInvites: requirePermission("team.manage")
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

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
          Role.MANAGER,
          Role.SUPERVISOR,
          Role.CONTENT_CREATOR,
          Role.INTERNAL_REVIEWER,
          Role.CLIENT_REVIEWER,
          Role.ANALYST,
          Role.INBOX_AGENT,
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

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

      // Prevent changes to OWNER role
      if (targetMembership.role === Role.OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change role of an Owner",
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

      // Prevent removing a OWNER
      if (targetMembership.role === Role.OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove an Owner",
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
          role: { in: [Role.OWNER] },
        },
      });

      if (!currentUserMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Owner or Manager can access team deletion",
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

  // Get all custom roles for a team
  getCustomRoles: requirePermission("team.manage")
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if user is a member of this team
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a team member",
        });
      }

      // Get all custom roles for this team
      const customRoles = await ctx.prisma.customRole.findMany({
        where: {
          organizationId: input.teamId,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      // Transform the data to a more convenient format
      return customRoles.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions.map((p) => p.permission.code),
      }));
    }),

  // Get all available permissions
  getAvailablePermissions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    // Get all permissions from the database with description field included
    // Description akan digunakan di UI untuk menampilkan detail permission
    const permissions = await ctx.prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        description: true,
      },
    });

    return permissions;
  }),

  // Create a new custom role
  createCustomRole: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(2),
        displayName: z.string().min(2),
        description: z.string().optional(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if role with the same name already exists for this team
      const existingRole = await ctx.prisma.customRole.findFirst({
        where: {
          name: input.name,
          organizationId: input.teamId,
        },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this name already exists",
        });
      }

      // Get permission IDs for the provided permission codes
      const permissions = await ctx.prisma.permission.findMany({
        where: {
          code: { in: input.permissions },
        },
      });

      // Create the custom role
      const customRole = await ctx.prisma.customRole.create({
        data: {
          name: input.name,
          displayName: input.displayName,
          description: input.description,
          organization: {
            connect: {
              id: input.teamId,
            },
          },
          permissions: {
            create: permissions.map((permission) => ({
              permission: {
                connect: {
                  id: permission.id,
                },
              },
            })),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      return {
        id: customRole.id,
        name: customRole.name,
        displayName: customRole.displayName,
        description: customRole.description,
        permissions: customRole.permissions.map((p) => p.permission.code),
      };
    }),

  // Update an existing custom role
  updateCustomRole: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        roleId: z.string(),
        displayName: z.string().min(2),
        description: z.string().optional(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if role exists
      const existingRole = await ctx.prisma.customRole.findFirst({
        where: {
          id: input.roleId,
          organizationId: input.teamId,
        },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom role not found",
        });
      }

      // Get permission IDs for the provided permission codes
      const permissions = await ctx.prisma.permission.findMany({
        where: {
          code: { in: input.permissions },
        },
      });

      // Delete existing permissions
      await ctx.prisma.customRolePermission.deleteMany({
        where: {
          customRoleId: input.roleId,
        },
      });

      // Update the custom role
      const customRole = await ctx.prisma.customRole.update({
        where: {
          id: input.roleId,
        },
        data: {
          displayName: input.displayName,
          description: input.description,
          permissions: {
            create: permissions.map((permission) => ({
              permission: {
                connect: {
                  id: permission.id,
                },
              },
            })),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      return {
        id: customRole.id,
        name: customRole.name,
        displayName: customRole.displayName,
        description: customRole.description,
        permissions: customRole.permissions.map((p) => p.permission.code),
      };
    }),

  // Delete a custom role
  deleteCustomRole: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if role exists
      const existingRole = await ctx.prisma.customRole.findFirst({
        where: {
          id: input.roleId,
          organizationId: input.teamId,
        },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom role not found",
        });
      }

      // Check if any members are using this role
      const membersUsingRole = await ctx.prisma.membership.findFirst({
        where: {
          customRoleId: input.roleId,
        },
      });

      if (membersUsingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Cannot delete role because it is assigned to one or more members",
        });
      }

      // Delete permissions first (cascade should handle this automatically, but being explicit)
      await ctx.prisma.customRolePermission.deleteMany({
        where: {
          customRoleId: input.roleId,
        },
      });

      // Delete the custom role
      await ctx.prisma.customRole.delete({
        where: {
          id: input.roleId,
        },
      });

      return { success: true };
    }),

  // Assign custom role to member
  assignCustomRole: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        memberId: z.string(),
        customRoleId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Check if target membership exists
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

      // Check if custom role exists and belongs to this team
      const customRole = await ctx.prisma.customRole.findFirst({
        where: {
          id: input.customRoleId,
          organizationId: input.teamId,
        },
      });

      if (!customRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom role not found",
        });
      }

      // Update the membership with the custom role
      return ctx.prisma.membership.update({
        where: {
          id: input.memberId,
        },
        data: {
          // Set role to null or a placeholder value when using custom role
          role: null as any, // This is a workaround for the required enum field
          customRole: {
            connect: {
              id: input.customRoleId,
            },
          },
        },
      });
    }),

  // Update permissions for a built-in role
  updateRolePermissions: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        role: z.nativeEnum(Role),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get permission IDs for the provided permission codes
      const permissions = await ctx.prisma.permission.findMany({
        where: {
          code: { in: input.permissions },
        },
      });

      // Delete existing role permissions
      await ctx.prisma.rolePermission.deleteMany({
        where: {
          role: input.role,
        },
      });

      await Promise.all(
        permissions.map((permission) =>
          ctx.prisma.rolePermission.create({
            data: {
              role: input.role,
              permission: {
                connect: {
                  id: permission.id,
                },
              },
            },
          })
        )
      );

      return {
        role: input.role,
        permissions: permissions.map((p) => p.code),
      };
    }),

  // Get role permissions
  getRolePermissions: requirePermission("team.manage")
    .input(z.object({ role: z.nativeEnum(Role) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const rolePermissions = await ctx.prisma.rolePermission.findMany({
        where: {
          role: input.role,
        },
        include: {
          permission: true,
        },
      });

      return rolePermissions.map((rp) => rp.permission.code);
    }),

  // Set default permissions for a role
  setDefaultRolePermissions: requirePermission("team.manage")
    .input(
      z.object({
        role: z.nativeEnum(Role),
        permissionCodes: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Verify user has admin privileges (is an owner of at least one organization)
      const userOwnedOrganizations = await ctx.prisma.organization.findMany({
        where: { ownerId: ctx.userId },
      });

      if (userOwnedOrganizations.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can set default role permissions",
        });
      }

      // Validate all permission codes exist
      const permissions = await ctx.prisma.permission.findMany({
        where: {
          code: {
            in: input.permissionCodes,
          },
        },
      });

      if (permissions.length !== input.permissionCodes.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some permission codes do not exist",
        });
      }

      // Transaction to update role permissions
      await ctx.prisma.$transaction(async (prisma) => {
        // Delete existing role permissions for this role
        await prisma.rolePermission.deleteMany({
          where: {
            role: input.role,
          },
        });

        // Create new role permissions
        await Promise.all(
          permissions.map((permission) =>
            prisma.rolePermission.create({
              data: {
                role: input.role,
                permissionId: permission.id,
              },
            })
          )
        );
      });

      return { success: true };
    }),

  // Get default permissions for a role from the database
  getDefaultRolePermissions: protectedProcedure
    .input(
      z.object({
        role: z.nativeEnum(Role),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get all permissions for the specified role
      const rolePermissions = await ctx.prisma.rolePermission.findMany({
        where: {
          role: input.role,
        },
        include: {
          permission: true,
        },
      });

      // Return just the permission codes
      return rolePermissions.map((rp) => rp.permission.code);
    }),
});
