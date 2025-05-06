import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Role } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

const inviteUserSchema = z.object({
  email: z.string().email(),
  organizationId: z.string(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const inviteRouter = createTRPCRouter({
  inviteUser: protectedProcedure
    .input(inviteUserSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, organizationId, role } = input;
      const userId = ctx.userId;

      try {
        // Check if the inviter is a member of the organization
        const inviterMembership = await ctx.prisma.membership.findFirst({
          where: {
            userId: userId!,
            organizationId,
          },
        });

        if (!inviterMembership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a member of this organization",
          });
        }

        // Check if the inviter has permission to invite users
        if (inviterMembership.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can invite users",
          });
        }

        // Get organization details for the email
        const organization = await ctx.prisma.organization.findUnique({
          where: { id: organizationId },
        });

        if (!organization) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organization not found",
          });
        }

        // Check if user already exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // Check if user is already a member
          const existingMembership = await ctx.prisma.membership.findFirst({
            where: {
              userId: existingUser.id,
              organizationId,
            },
          });

          if (existingMembership) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "User is already a member of this organization",
            });
          }

          // Create membership for existing user
          await ctx.prisma.membership.create({
            data: {
              userId: existingUser.id,
              organizationId,
              role: role as Role,
            },
          });

          // Send invitation email to existing user
          await sendInviteEmail({
            email,
            organizationName: organization.name,
            role,
          });

          return {
            success: true,
            message: "User added to organization",
          };
        }

        // Create invitation for new user
        await ctx.prisma.invitation.create({
          data: {
            email,
            organizationId,
            role: role as Role,
          },
        });

        // Send invitation email
        await sendInviteEmail({
          email,
          organizationName: organization.name,
          role,
        });

        return {
          success: true,
          message: "Invitation sent successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error inviting user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite user",
        });
      }
    }),
});
