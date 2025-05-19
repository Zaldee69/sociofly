import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { can, getEffectivePermissions } from "../../permissions/helpers";
import { PERMISSIONS } from "../../permissions/seed/permissions";

export const permissionsRouter = createTRPCRouter({
  /**
   * Get all permissions for current user in specified organization
   */
  getAll: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      const permissions = await getEffectivePermissions(
        userId,
        input.organizationId
      );
      return Array.from(permissions);
    }),

  /**
   * Check if current user has a specific permission in organization
   */
  can: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        permission: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      return can(userId, input.organizationId, input.permission);
    }),

  /**
   * Get all available permission codes
   */
  getAllPermissionCodes: protectedProcedure.query(() => {
    return Object.values(PERMISSIONS);
  }),

  /**
   * Get permissions for a specific role
   */
  getRolePermissions: protectedProcedure
    .input(
      z.object({
        role: z.enum([
          "TEAM_OWNER",
          "CAMPAIGN_MANAGER",
          "CONTENT_PRODUCER",
          "CONTENT_REVIEWER",
          "CLIENT_REVIEWER",
          "ANALYTICS_OBSERVER",
          "INBOX_AGENT",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          role: input.role,
        },
        include: {
          permission: true,
        },
      });

      return rolePermissions.map((rp) => rp.permission.code);
    }),

  /**
   * Grant a permission to a user
   */
  grantPermission: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        permissionCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      // First check if current user has permission to manage permissions
      const hasPermission = await can(
        userId,
        input.organizationId,
        PERMISSIONS.PERMISSIONS_MANAGE
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage permissions",
        });
      }

      // Find the membership
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Find the permission
      const permission = await prisma.permission.findUnique({
        where: {
          code: input.permissionCode,
        },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Permission ${input.permissionCode} not found`,
        });
      }

      // Create the grant
      return prisma.membershipGrant.upsert({
        where: {
          membershipId_permissionId: {
            membershipId: membership.id,
            permissionId: permission.id,
          },
        },
        create: {
          membershipId: membership.id,
          permissionId: permission.id,
        },
        update: {}, // No need to update anything
      });
    }),

  /**
   * Revoke a granted permission from a user
   */
  revokeGrantedPermission: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        permissionCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      // First check if current user has permission to manage permissions
      const hasPermission = await can(
        userId,
        input.organizationId,
        PERMISSIONS.PERMISSIONS_MANAGE
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage permissions",
        });
      }

      // Find the membership
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Find the permission
      const permission = await prisma.permission.findUnique({
        where: {
          code: input.permissionCode,
        },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Permission ${input.permissionCode} not found`,
        });
      }

      // Delete the grant if it exists
      return prisma.membershipGrant.deleteMany({
        where: {
          membershipId: membership.id,
          permissionId: permission.id,
        },
      });
    }),

  /**
   * Deny a permission to a user
   */
  denyPermission: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        permissionCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      // First check if current user has permission to manage permissions
      const hasPermission = await can(
        userId,
        input.organizationId,
        PERMISSIONS.PERMISSIONS_MANAGE
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage permissions",
        });
      }

      // Find the membership
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Find the permission
      const permission = await prisma.permission.findUnique({
        where: {
          code: input.permissionCode,
        },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Permission ${input.permissionCode} not found`,
        });
      }

      // Create the denial
      return prisma.membershipDeny.upsert({
        where: {
          membershipId_permissionId: {
            membershipId: membership.id,
            permissionId: permission.id,
          },
        },
        create: {
          membershipId: membership.id,
          permissionId: permission.id,
        },
        update: {}, // No need to update anything
      });
    }),

  /**
   * Remove a permission denial for a user
   */
  removeDeniedPermission: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        permissionCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      // First check if current user has permission to manage permissions
      const hasPermission = await can(
        userId,
        input.organizationId,
        PERMISSIONS.PERMISSIONS_MANAGE
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage permissions",
        });
      }

      // Find the membership
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this organization",
        });
      }

      // Find the permission
      const permission = await prisma.permission.findUnique({
        where: {
          code: input.permissionCode,
        },
      });

      if (!permission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Permission ${input.permissionCode} not found`,
        });
      }

      // Delete the denial if it exists
      return prisma.membershipDeny.deleteMany({
        where: {
          membershipId: membership.id,
          permissionId: permission.id,
        },
      });
    }),
});
