import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { ApprovalStatus, PrismaClient, Role } from "@prisma/client";

async function getUserRoles(
  prisma: PrismaClient,
  userId: string
): Promise<Role[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { role: true },
  });

  return memberships.map((m) => m.role);
}

export const approvalRouter = createTRPCRouter({
  // ... existing procedures ...

  getNextPendingApproval: protectedProcedure.query(async ({ ctx }) => {
    const nextApproval = await ctx.prisma.approvalAssignment.findFirst({
      where: {
        status: ApprovalStatus.PENDING,
        assignedUserId: ctx.auth.userId,
        instance: {
          post: {
            isNot: null, // Ensure post exists
          },
        },
      },
      include: {
        instance: {
          include: {
            workflow: true,
            post: {
              include: {
                user: true,
              },
            },
          },
        },
        step: true,
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return nextApproval;
  }),

  getAssignmentById: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const assignment = await ctx.prisma.approvalAssignment.findFirst({
        where: {
          id: input.assignmentId,
          OR: [
            { assignedUserId: ctx.auth.userId },
            {
              step: {
                role: {
                  in: await getUserRoles(ctx.prisma, ctx.auth.userId),
                },
              },
            },
          ],
          instance: {
            post: {
              isNot: null, // Ensure post exists
            },
          },
        },
        include: {
          instance: {
            include: {
              workflow: true,
              post: {
                include: {
                  user: true,
                  postSocialAccounts: {
                    include: {
                      socialAccount: true,
                    },
                  },
                },
              },
            },
          },
          step: true,
          user: true,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or post has been deleted",
        });
      }

      return assignment;
    }),
});
