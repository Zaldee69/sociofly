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

      // Cek apakah ada undangan yang masih pending (belum diaccept/reject)
      const pendingInvitation = await ctx.prisma.invitation.findFirst({
        where: {
          email: input.email,
          organizationId: input.teamId,
          acceptedAt: null,
          rejectedAt: null,
        },
      });

      if (pendingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invitation already exists",
        });
      }

      // Cek apakah user sudah menjadi anggota tim
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

      // Check if there's any previous invitation (accepted or rejected)
      const existingInvitation = await ctx.prisma.invitation.findFirst({
        where: {
          email: input.email,
          organizationId: input.teamId,
        },
      });

      // If there's an existing invitation, update it while preserving its history
      if (existingInvitation) {
        // If the invitation was previously accepted or rejected, store the history in metadata
        // before resetting it for a new invitation cycle
        const historyUpdate =
          existingInvitation.acceptedAt || existingInvitation.rejectedAt
            ? {
                // We'll use database transactions to implement history tracking instead
              }
            : {};

        // Create a new invitation record with a transaction
        return ctx.prisma.$transaction(async (tx) => {
          // First create an invitation history entry for the existing invitation if needed
          if (existingInvitation.acceptedAt || existingInvitation.rejectedAt) {
            await tx.temporaryData.create({
              data: {
                data: JSON.stringify({
                  type: "invitation_history",
                  email: existingInvitation.email,
                  role: existingInvitation.role,
                  organizationId: existingInvitation.organizationId,
                  createdAt: existingInvitation.createdAt,
                  acceptedAt: existingInvitation.acceptedAt,
                  rejectedAt: existingInvitation.rejectedAt,
                }),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year expiry
              },
            });
          }

          // Then update the invitation
          return tx.invitation.update({
            where: {
              id: existingInvitation.id,
            },
            data: {
              role: input.role,
              acceptedAt: null,
              rejectedAt: null,
              createdAt: new Date(), // Refresh creation date
            },
            include: {
              organization: true,
            },
          });
        });
      }

      // If no previous invitation exists, create a new one
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
  getTeamInvites: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        includeProcessed: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Create a base query
      const baseQuery = {
        organizationId: input.teamId,
      };

      // If we don't want processed invites, add the filter for only pending ones
      const query = input.includeProcessed
        ? baseQuery
        : {
            ...baseQuery,
            acceptedAt: null,
            rejectedAt: null,
          };

      return ctx.prisma.invitation.findMany({
        where: query,
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Get pending invites for current user
  getMyInvites: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    // Get user with email
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.userId,
      },
    });

    if (!user || !user.email) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found or email not available",
      });
    }

    // Get all pending invitations (not accepted, not rejected)
    return ctx.prisma.invitation.findMany({
      where: {
        email: user.email,
        acceptedAt: null,
        rejectedAt: null,
      },
      include: {
        organization: true,
      },
    });
  }),

  // Accept an invitation
  acceptInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get user
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.userId,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (!user || !user.email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Find the invitation
      const invitation = await ctx.prisma.invitation.findUnique({
        where: {
          id: input.inviteId,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if this invitation is for this user
      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      // Check if invitation was already accepted or rejected
      if (invitation.acceptedAt || invitation.rejectedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been processed",
        });
      }

      // Check if user is already a member of this team
      const existingMembership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: invitation.organizationId,
        },
      });

      if (existingMembership) {
        // If already a member, just mark invitation as accepted
        await ctx.prisma.invitation.update({
          where: {
            id: input.inviteId,
          },
          data: {
            acceptedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "You are already a member of this team",
        };
      }

      // Transaction to ensure all operations succeed or fail together
      return ctx.prisma.$transaction(async (tx) => {
        // Mark invitation as accepted
        await tx.invitation.update({
          where: {
            id: input.inviteId,
          },
          data: {
            acceptedAt: new Date(),
          },
        });

        if (!ctx.userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
          });
        }
        // Create membership
        const membership = await tx.membership.create({
          data: {
            userId: ctx.userId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });

        return {
          success: true,
          membership,
        };
      });
    }),

  // Reject an invitation
  rejectInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get user
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.userId,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (!user || !user.email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Find the invitation
      const invitation = await ctx.prisma.invitation.findUnique({
        where: {
          id: input.inviteId,
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if this invitation is for this user
      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation is not for you",
        });
      }

      // Check if invitation was already accepted or rejected
      if (invitation.acceptedAt || invitation.rejectedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been processed",
        });
      }

      // Mark invitation as rejected
      await ctx.prisma.invitation.update({
        where: {
          id: input.inviteId,
        },
        data: {
          rejectedAt: new Date(),
        },
      });

      return {
        success: true,
      };
    }),

  // Cancel an invitation
  cancelInvite: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        inviteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const invite = await ctx.prisma.invitation.findFirst({
        where: {
          id: input.inviteId,
          organizationId: input.teamId,
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      return ctx.prisma.invitation.delete({
        where: {
          id: input.inviteId,
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

      // Return platforms that aren't connected yet
      return Object.values(SocialPlatform);
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
        profileId: z.string().optional(),
        profilePicture: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Cek apakah akun dengan profileId yang sama sudah terhubung
      if (input.profileId) {
        const existingAccount = await ctx.prisma.socialAccount.findFirst({
          where: {
            organizationId: input.teamId,
            profileId: input.profileId,
          },
        });

        if (existingAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This account is already connected to this team",
          });
        }
      }

      return ctx.prisma.socialAccount.create({
        data: {
          platform: input.platform,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken || null,
          expiresAt: input.expiresAt || null,
          name: input.name || null,
          profileId: input.profileId || null,
          profilePicture: input.profilePicture || undefined,
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

      // Use transaction to ensure all related records are deleted
      return ctx.prisma.$transaction(async (tx) => {
        // 1. Delete all membership grants and denies
        await tx.membershipGrant.deleteMany({
          where: {
            membership: {
              organizationId: input.teamId,
            },
          },
        });

        await tx.membershipDeny.deleteMany({
          where: {
            membership: {
              organizationId: input.teamId,
            },
          },
        });

        // 2. Delete all social account related things
        // First delete post-social account connections
        await tx.postSocialAccount.deleteMany({
          where: {
            socialAccount: {
              organizationId: input.teamId,
            },
          },
        });

        // 3. Delete all social accounts
        await tx.socialAccount.deleteMany({
          where: {
            organizationId: input.teamId,
          },
        });

        // 4. Delete all posts
        await tx.post.deleteMany({
          where: {
            organizationId: input.teamId,
          },
        });

        // 5. Delete all media
        await tx.media.deleteMany({
          where: {
            organizationId: input.teamId,
          },
        });

        // 6. Delete all custom role permissions
        await tx.customRolePermission.deleteMany({
          where: {
            customRole: {
              organizationId: input.teamId,
            },
          },
        });

        // 7. Delete all custom roles
        await tx.customRole.deleteMany({
          where: {
            organizationId: input.teamId,
          },
        });

        // 8. Delete all invitations
        await tx.invitation.deleteMany({
          where: {
            organizationId: input.teamId,
          },
        });

        // 9. Delete all memberships
        await tx.membership.deleteMany({
          where: {
            organizationId: input.teamId,
          },
        });

        // 10. Finally, delete the organization itself
        return tx.organization.delete({
          where: {
            id: input.teamId,
          },
        });
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
        fallbackRole: z.nativeEnum(Role).optional(),
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

      // Get all members using this role
      const membersUsingRole = await ctx.prisma.membership.findMany({
        where: {
          customRoleId: input.roleId,
        },
        select: {
          id: true,
          userId: true,
          organizationId: true,
        },
      });

      // If there are members using this role, reassign them to the fallback role
      if (membersUsingRole.length > 0) {
        const fallbackRole = input.fallbackRole || Role.CONTENT_CREATOR;

        // Reassign all members to the fallback role
        await ctx.prisma.membership.updateMany({
          where: {
            customRoleId: input.roleId,
          },
          data: {
            role: fallbackRole,
            customRoleId: null,
          },
        });

        console.log(
          `Reassigned ${membersUsingRole.length} members from custom role ${existingRole.name} to ${fallbackRole}`
        );
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

      return {
        success: true,
        membersReassigned: membersUsingRole.length,
        reassignedRole:
          membersUsingRole.length > 0
            ? input.fallbackRole || Role.CONTENT_CREATOR
            : null,
      };
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

  // Get permissions for all roles in one call
  getAllRolePermissions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    // Get all role permissions
    const rolePermissions = await ctx.prisma.rolePermission.findMany({
      include: {
        permission: true,
      },
    });

    // Group by role
    const permissionsByRole: Record<string, string[]> = {};

    rolePermissions.forEach((rp) => {
      const role = rp.role;
      if (!permissionsByRole[role]) {
        permissionsByRole[role] = [];
      }
      permissionsByRole[role].push(rp.permission.code);
    });

    return permissionsByRole;
  }),

  // Get current user's membership for a team
  getTeamMembership: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Find user's membership for this team
      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: ctx.userId,
          organizationId: input.teamId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a team member",
        });
      }

      return membership;
    }),

  // Count members using a custom role
  countMembersWithCustomRole: requirePermission("team.manage")
    .input(
      z.object({
        teamId: z.string(),
        roleId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
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

      // Count members using this role
      const count = await ctx.prisma.membership.count({
        where: {
          customRoleId: input.roleId,
        },
      });

      return { count };
    }),

  // Get invitation history for a team
  getTeamInvitesHistory: requirePermission("team.manage")
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get historical invitation data
      const historyRecords = await ctx.prisma.temporaryData.findMany({
        where: {
          data: {
            contains: "invitation_history",
          },
          // Only include records that haven't expired
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      // Filter and parse records for this team
      const teamInviteHistory = historyRecords
        .map((record) => {
          try {
            const data = JSON.parse(record.data);
            // Only return records for this team
            if (
              data.type === "invitation_history" &&
              data.organizationId === input.teamId
            ) {
              return {
                id: record.id, // Use TemporaryData id
                email: data.email,
                role: data.role,
                organizationId: data.organizationId,
                createdAt: new Date(data.createdAt),
                acceptedAt: data.acceptedAt ? new Date(data.acceptedAt) : null,
                rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : null,
              };
            }
            return null;
          } catch (e) {
            console.error("Failed to parse history record:", e);
            return null;
          }
        })
        .filter(Boolean); // Remove nulls

      return teamInviteHistory;
    }),
});
