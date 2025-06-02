import { z } from "zod";
import { ApprovalStatus, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const approvalRequestRouter = createTRPCRouter({
  // Get all approval requests assigned to current user for review
  getAssignedRequests: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        status: z.nativeEnum(ApprovalStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, status } = input;

      // Check if user is a member of the team
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.auth.userId,
            teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this team",
        });
      }

      // Get all approval assignments for this user
      return ctx.prisma.approvalAssignment.findMany({
        where: {
          assignedUserId: ctx.auth.userId,
          ...(status ? { status } : {}),
          instance: {
            workflow: {
              teamId,
            },
          },
        },
        include: {
          step: true,
          instance: {
            include: {
              post: {
                include: {
                  postSocialAccounts: {
                    include: {
                      socialAccount: true,
                    },
                  },
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              workflow: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Get all approval requests created by the current user
  getMyRequests: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        status: z.nativeEnum(ApprovalStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, status } = input;

      // Check if user is a member of the team
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.auth.userId,
            teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this team",
        });
      }

      // Get all approval instances for posts created by this user
      return ctx.prisma.approvalInstance.findMany({
        where: {
          workflow: {
            teamId,
          },
          post: {
            userId: ctx.auth.userId,
          },
          ...(status ? { status } : {}),
        },
        include: {
          workflow: true,
          post: {
            include: {
              postSocialAccounts: {
                include: {
                  socialAccount: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          assignments: {
            include: {
              step: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              step: {
                order: "asc",
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Submit a post for approval
  submitForApproval: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        workflowId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, workflowId } = input;

      // Get the post and check ownership
      const post = await ctx.prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Check if user is authorized to submit this post
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.auth.userId,
            teamId: post.teamId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this post",
        });
      }

      // Check if workflow exists and belongs to this team
      const workflow = await ctx.prisma.approvalWorkflow.findUnique({
        where: {
          id: workflowId,
          teamId: post.teamId,
        },
        include: {
          steps: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval workflow not found",
        });
      }

      if (workflow.steps.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Workflow must have at least one step",
        });
      }

      // Check if post already has an approval instance
      const existingInstance = await ctx.prisma.approvalInstance.findFirst({
        where: {
          postId,
        },
      });

      if (existingInstance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post is already in an approval process",
        });
      }

      // Create approval instance with first step
      const firstStep = workflow.steps[0];

      return ctx.prisma.$transaction(async (tx) => {
        // Update post status
        await tx.post.update({
          where: { id: postId },
          data: {
            status: "SCHEDULED", // Keep as SCHEDULED since we're just in approval process
          },
        });

        // Create approval instance
        const instance = await tx.approvalInstance.create({
          data: {
            postId,
            workflowId,
            status: ApprovalStatus.IN_PROGRESS,
            currentStepOrder: firstStep.order,
          },
        });

        // Create assignment(s) for the first step
        if (firstStep.assignedUserId) {
          // If a specific user is assigned
          await tx.approvalAssignment.create({
            data: {
              stepId: firstStep.id,
              instanceId: instance.id,
              assignedUserId: firstStep.assignedUserId,
              status: ApprovalStatus.PENDING,
            },
          });
        } else if (firstStep.requireAllUsersInRole) {
          // If all users with a specific role are required
          const membersWithRole = await tx.membership.findMany({
            where: {
              teamId: post.teamId,
              role: firstStep.role,
              status: "ACTIVE",
            },
          });

          await Promise.all(
            membersWithRole.map((member) =>
              tx.approvalAssignment.create({
                data: {
                  stepId: firstStep.id,
                  instanceId: instance.id,
                  assignedUserId: member.userId,
                  status: ApprovalStatus.PENDING,
                },
              })
            )
          );
        } else {
          // Just role-based, any user with that role can approve
          await tx.approvalAssignment.create({
            data: {
              stepId: firstStep.id,
              instanceId: instance.id,
              status: ApprovalStatus.PENDING,
              // No specific assignedUserId means any user with the role can approve
            },
          });
        }

        return instance;
      });
    }),

  // Approve or reject an assignment
  reviewAssignment: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        approve: z.boolean(),
        feedback: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assignmentId, approve, feedback } = input;

      // Get the assignment
      const assignment = await ctx.prisma.approvalAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          step: true,
          instance: {
            include: {
              workflow: {
                include: {
                  steps: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
              post: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      // Check if user is authorized to review this assignment
      // Either they are specifically assigned, or they have the appropriate role
      if (
        assignment.assignedUserId &&
        assignment.assignedUserId !== ctx.auth.userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not assigned to review this item",
        });
      }

      if (!assignment.assignedUserId) {
        // Check if user has the required role for this step
        const membership = await ctx.prisma.membership.findUnique({
          where: {
            userId_teamId: {
              userId: ctx.auth.userId,
              teamId: assignment.instance.workflow.teamId,
            },
          },
        });

        if (!membership || membership.role !== assignment.step.role) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have the required role to review this item",
          });
        }

        // Assign to this user
        await ctx.prisma.approvalAssignment.update({
          where: { id: assignmentId },
          data: {
            assignedUserId: ctx.auth.userId,
          },
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        // Update the assignment
        await tx.approvalAssignment.update({
          where: { id: assignmentId },
          data: {
            status: approve ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
            feedback,
            completedAt: new Date(),
          },
        });

        if (!approve) {
          // If rejected, update the instance status
          await tx.approvalInstance.update({
            where: { id: assignment.instanceId },
            data: {
              status: ApprovalStatus.REJECTED,
            },
          });

          // Update post status to indicate action required
          if (assignment.instance.postId) {
            await tx.post.update({
              where: { id: assignment.instance.postId },
              data: {
                status: "DRAFT", // Set back to draft if rejected
              },
            });
          }

          return { success: true, status: "REJECTED" };
        }

        // If approved, check if this is the last step or if all assignees have approved
        const currentStep = assignment.step;
        const nextSteps = assignment.instance.workflow.steps.filter(
          (step) => step.order > currentStep.order
        );

        // Check if all assignments for this step are approved
        const stepAssignments = await tx.approvalAssignment.findMany({
          where: {
            instanceId: assignment.instanceId,
            stepId: currentStep.id,
          },
        });

        const allApproved = stepAssignments.every(
          (a) => a.status === ApprovalStatus.APPROVED || a.id === assignmentId
        );

        if (!allApproved) {
          // Still waiting for other approvers in this step
          return { success: true, status: "WAITING_FOR_OTHERS" };
        }

        if (nextSteps.length === 0) {
          // This was the last step, mark the instance as completed
          await tx.approvalInstance.update({
            where: { id: assignment.instanceId },
            data: {
              status: ApprovalStatus.APPROVED,
              currentStepOrder: null,
            },
          });

          // Post is approved for schedule/publishing
          if (assignment.instance.postId) {
            await tx.post.update({
              where: { id: assignment.instance.postId },
              data: {
                status: "SCHEDULED", // Keep as scheduled since it's approved
              },
            });
          }

          return { success: true, status: "APPROVED" };
        }

        // Move to the next step
        const nextStep = nextSteps[0];
        await tx.approvalInstance.update({
          where: { id: assignment.instanceId },
          data: {
            currentStepOrder: nextStep.order,
          },
        });

        // Create assignment(s) for the next step
        if (nextStep.assignedUserId) {
          // If a specific user is assigned
          await tx.approvalAssignment.create({
            data: {
              stepId: nextStep.id,
              instanceId: assignment.instanceId,
              assignedUserId: nextStep.assignedUserId,
              status: ApprovalStatus.PENDING,
            },
          });
        } else if (nextStep.requireAllUsersInRole) {
          // If all users with a specific role are required
          const membersWithRole = await tx.membership.findMany({
            where: {
              teamId: assignment.instance.workflow.teamId,
              role: nextStep.role,
              status: "ACTIVE",
            },
          });

          await Promise.all(
            membersWithRole.map((member) =>
              tx.approvalAssignment.create({
                data: {
                  stepId: nextStep.id,
                  instanceId: assignment.instanceId,
                  assignedUserId: member.userId,
                  status: ApprovalStatus.PENDING,
                },
              })
            )
          );
        } else {
          // Just role-based, any user with that role can approve
          await tx.approvalAssignment.create({
            data: {
              stepId: nextStep.id,
              instanceId: assignment.instanceId,
              status: ApprovalStatus.PENDING,
              // No specific assignedUserId means any user with the role can approve
            },
          });
        }

        return { success: true, status: "MOVED_TO_NEXT_STEP" };
      });
    }),
});
