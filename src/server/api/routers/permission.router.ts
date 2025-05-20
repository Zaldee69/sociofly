import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  grantPermissionToMember,
  denyPermissionToMember,
  revokePermissionOverride,
  getUserPermissionOverrides,
} from "../../permissions/permission.service";
import { PERMISSIONS } from "../../permissions/seed/permissions";

export const permissionRouter = createTRPCRouter({
  /**
   * Grant a permission to a user
   */
  grant: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        membershipId: z.string(),
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
      const userMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!userMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      // Check if the membership belongs to the specified organization
      const targetMembership = await prisma.membership.findUnique({
        where: {
          id: input.membershipId,
        },
      });

      if (
        !targetMembership ||
        targetMembership.organizationId !== input.organizationId
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found in this organization",
        });
      }

      try {
        const result = await grantPermissionToMember(
          input.membershipId,
          input.permissionCode
        );
        return { success: true, result };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Deny a permission to a user
   */
  deny: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        membershipId: z.string(),
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
      const userMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!userMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      // Check if the membership belongs to the specified organization
      const targetMembership = await prisma.membership.findUnique({
        where: {
          id: input.membershipId,
        },
      });

      if (
        !targetMembership ||
        targetMembership.organizationId !== input.organizationId
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found in this organization",
        });
      }

      try {
        const result = await denyPermissionToMember(
          input.membershipId,
          input.permissionCode
        );
        return { success: true, result };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Revoke a permission override (both grant and deny) from a user
   */
  revoke: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        membershipId: z.string(),
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
      const userMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!userMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      // Check if the membership belongs to the specified organization
      const targetMembership = await prisma.membership.findUnique({
        where: {
          id: input.membershipId,
        },
      });

      if (
        !targetMembership ||
        targetMembership.organizationId !== input.organizationId
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found in this organization",
        });
      }

      try {
        const result = await revokePermissionOverride(
          input.membershipId,
          input.permissionCode
        );
        return { success: true, result };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get user permission overrides
   */
  getUserOverrides: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        membershipId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      // Check if the current user is a member of this organization
      const userMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!userMembership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this organization",
        });
      }

      // Check if the membership belongs to the specified organization
      const targetMembership = await prisma.membership.findUnique({
        where: {
          id: input.membershipId,
        },
      });

      if (
        !targetMembership ||
        targetMembership.organizationId !== input.organizationId
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership not found in this organization",
        });
      }

      return getUserPermissionOverrides(input.membershipId);
    }),

  /**
   * Get all available permission codes
   */
  getAllPermissionCodes: protectedProcedure.query(() => {
    return Object.values(PERMISSIONS);
  }),
});
