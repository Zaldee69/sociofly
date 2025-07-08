import { z } from "zod";
import { ApprovalStatus, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { sendApprovalRequestEmail, sendApprovalStatusEmail } from "@/lib/email";
import { NotificationService } from "@/lib/services/notification.service";
import { randomBytes } from "crypto";

// Helper function to send approval request notifications
async function sendApprovalNotifications(
  ctx: any,
  assignmentIds: string[],
  postId: string,
  teamId: string,
  tx?: any // Add optional transaction client
) {
  try {
    // Use transaction client if provided, otherwise use ctx.prisma
    const prisma = tx || ctx.prisma;

    // Get post and team details
    const postWithDetails = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        team: {
          select: { name: true },
        },
      },
    });

    console.log("postWithDetails", postWithDetails);

    if (!postWithDetails) return;

    // Get assignment details
    const assignments = await prisma.approvalAssignment.findMany({
      where: {
        id: {
          in: assignmentIds,
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    console.log("assignments", assignments);

    // Send email and in-app notification to each assigned user
    for (const assignment of assignments) {
      if (assignment.user) {
        // Send email notification
        await sendApprovalRequestEmail({
          approverEmail: assignment.user.email,
          approverName: assignment.user.name || assignment.user.email,
          postContent: postWithDetails.content,
          teamName: postWithDetails.team.name,
          authorName: postWithDetails.user.name || postWithDetails.user.email,
          assignmentId: assignment.id,
        });

        // Send in-app notification
        await NotificationService.send({
          userId: assignment.assignedUserId!,
          type: 'APPROVAL_REQUEST',
          title: 'New Approval Request',
          body: `Post from ${postWithDetails.user.name || postWithDetails.user.email} in ${postWithDetails.team.name} needs your approval`,
          metadata: {
            assignmentId: assignment.id,
            postId: postWithDetails.id,
            teamId: postWithDetails.teamId,
            authorName: postWithDetails.user.name || postWithDetails.user.email
          }
        });
      }
    }
  } catch (error) {
    console.error("Error sending approval notifications:", error);
    // Don't throw error to avoid breaking the main workflow
  }
}

// Helper function to send approval status notifications
async function sendApprovalStatusNotification(
  ctx: any,
  assignmentId: string,
  approved: boolean,
  feedback?: string
) {
  try {
    const assignment = await ctx.prisma.approvalAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        instance: {
          include: {
            post: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
                team: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment?.instance.post || !assignment.user) return;

    // Send email notification
    await sendApprovalStatusEmail({
      authorEmail: assignment.instance.post.user.email,
      authorName:
        assignment.instance.post.user.name ||
        assignment.instance.post.user.email,
      postContent: assignment.instance.post.content,
      teamName: assignment.instance.post.team.name,
      approverName: assignment.user.name || assignment.user.email,
      status: approved ? "approved" : "rejected",
      feedback,
    });

    // Send in-app notification to post author
    await NotificationService.send({
      userId: assignment.instance.post.userId,
      type: approved ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED',
      title: approved ? 'Post Approved' : 'Post Rejected',
      body: approved 
        ? `Your post in ${assignment.instance.post.team.name} has been approved by ${assignment.user.name || assignment.user.email}`
        : `Your post in ${assignment.instance.post.team.name} has been rejected by ${assignment.user.name || assignment.user.email}${feedback ? `: ${feedback}` : ''}`,
      metadata: {
        assignmentId: assignment.id,
        postId: assignment.instance.post.id,
        teamId: assignment.instance.post.teamId,
        approverName: assignment.user.name || assignment.user.email,
        status: approved ? 'approved' : 'rejected',
        feedback
      }
    });
  } catch (error) {
    console.error("Error sending approval status notification:", error);
    // Don't throw error to avoid breaking the main workflow
  }
}

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

  // Get specific assignment by ID (for direct access)
  getAssignmentById: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { assignmentId } = input;

      const assignment = await ctx.prisma.approvalAssignment.findUnique({
        where: { id: assignmentId },
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
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      // Check if user has access to this assignment
      const hasAccess =
        assignment.assignedUserId === ctx.auth.userId || // Directly assigned
        (!assignment.assignedUserId && // Role-based assignment
          (await ctx.prisma.membership.findFirst({
            where: {
              userId: ctx.auth.userId,
              teamId: assignment.instance.workflow.teamId,
              role: assignment.step.role,
              status: "ACTIVE",
            },
          })));

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this assignment",
        });
      }

      return assignment;
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

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

      // Find the team's default workflow (first active workflow for the team)
      const workflow = await ctx.prisma.approvalWorkflow.findFirst({
        where: {
          teamId: post.teamId,
          isActive: true,
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
          message: "No approval workflow found for this team",
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
        // Update post status to DRAFT during approval process
        await tx.post.update({
          where: { id: postId },
          data: {
            status: "DRAFT", // Keep as DRAFT until approval is complete
          },
        });

        // Create approval instance
        const instance = await tx.approvalInstance.create({
          data: {
            postId,
            workflowId: workflow.id,
            status: ApprovalStatus.IN_PROGRESS,
            currentStepOrder: firstStep.order,
          },
        });

        // Create assignment(s) for the first step
        if (firstStep.assignedUserId) {
          // If a specific user is assigned
          const assignment = await tx.approvalAssignment.create({
            data: {
              stepId: firstStep.id,
              instanceId: instance.id,
              assignedUserId: firstStep.assignedUserId,
              status: ApprovalStatus.PENDING,
            },
          });

          // Send notification email
          await sendApprovalNotifications(
            ctx,
            [assignment.id],
            postId,
            post.teamId,
            tx
          );
        } else if (firstStep.requireAllUsersInRole) {
          // If all users with a specific role are required
          const membersWithRole = await tx.membership.findMany({
            where: {
              teamId: post.teamId,
              role: firstStep.role,
              status: "ACTIVE",
            },
          });

          const assignments = await Promise.all(
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

          // Send notification emails
          const assignmentIds = assignments.map((a) => a.id);
          await sendApprovalNotifications(
            ctx,
            assignmentIds,
            postId,
            post.teamId,
            tx
          );
        } else {
          // Just role-based, any user with that role can approve
          const assignment = await tx.approvalAssignment.create({
            data: {
              stepId: firstStep.id,
              instanceId: instance.id,
              status: ApprovalStatus.PENDING,
              // No specific assignedUserId means any user with the role can approve
            },
          });

          // For role-based assignments, we need to get all users with that role to notify them
          const membersWithRole = await tx.membership.findMany({
            where: {
              teamId: post.teamId,
              role: firstStep.role,
              status: "ACTIVE",
            },
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          });

          // Send notifications to all users with the role
          if (membersWithRole.length > 0) {
            const postWithDetails = await tx.post.findUnique({
              where: { id: postId },
              include: {
                user: { select: { name: true, email: true } },
                team: { select: { name: true } },
              },
            });

            if (postWithDetails) {
              for (const member of membersWithRole) {
                await sendApprovalRequestEmail({
                  approverEmail: member.user.email,
                  approverName: member.user.name || member.user.email,
                  postContent: postWithDetails.content,
                  teamName: postWithDetails.team.name,
                  authorName:
                    postWithDetails.user.name || postWithDetails.user.email,
                  assignmentId: assignment.id,
                });
              }
            }
          }
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

        // Send status notification to the author
        await sendApprovalStatusNotification(
          ctx,
          assignmentId,
          approve,
          feedback
        );

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
          const nextAssignment = await tx.approvalAssignment.create({
            data: {
              stepId: nextStep.id,
              instanceId: assignment.instanceId,
              assignedUserId: nextStep.assignedUserId,
              status: ApprovalStatus.PENDING,
            },
          });

          // Send notification email for next step
          await sendApprovalNotifications(
            ctx,
            [nextAssignment.id],
            assignment.instance.postId || "",
            assignment.instance.workflow.teamId,
            tx
          );
        } else if (nextStep.requireAllUsersInRole) {
          // If all users with a specific role are required
          const membersWithRole = await tx.membership.findMany({
            where: {
              teamId: assignment.instance.workflow.teamId,
              role: nextStep.role,
              status: "ACTIVE",
            },
          });

          const nextAssignments = await Promise.all(
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

          // Send notification emails for next step
          const nextAssignmentIds = nextAssignments.map((a) => a.id);
          await sendApprovalNotifications(
            ctx,
            nextAssignmentIds,
            assignment.instance.postId || "",
            assignment.instance.workflow.teamId,
            tx
          );
        } else {
          // Just role-based, any user with that role can approve
          const nextAssignment = await tx.approvalAssignment.create({
            data: {
              stepId: nextStep.id,
              instanceId: assignment.instanceId,
              status: ApprovalStatus.PENDING,
              // No specific assignedUserId means any user with the role can approve
            },
          });

          // For role-based assignments, notify all users with that role
          const membersWithRole = await tx.membership.findMany({
            where: {
              teamId: assignment.instance.workflow.teamId,
              role: nextStep.role,
              status: "ACTIVE",
            },
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          });

          if (membersWithRole.length > 0 && assignment.instance.postId) {
            const postWithDetails = await tx.post.findUnique({
              where: { id: assignment.instance.postId },
              include: {
                user: { select: { name: true, email: true } },
                team: { select: { name: true } },
              },
            });

            if (postWithDetails) {
              for (const member of membersWithRole) {
                await sendApprovalRequestEmail({
                  approverEmail: member.user.email,
                  approverName: member.user.name || member.user.email,
                  postContent: postWithDetails.content,
                  teamName: postWithDetails.team.name,
                  authorName:
                    postWithDetails.user.name || postWithDetails.user.email,
                  assignmentId: nextAssignment.id,
                });
              }
            }
          }
        }

        return { success: true, status: "MOVED_TO_NEXT_STEP" };
      });
    }),

  // Generate magic link for external reviewer
  generateMagicLink: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        reviewerEmail: z.string().email(),
        expiresInHours: z.number().default(72), // Default 3 days
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { assignmentId, reviewerEmail, expiresInHours } = input;

      // Get the assignment and verify permissions
      const assignment = await ctx.prisma.approvalAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          step: true,
          instance: {
            include: {
              workflow: {
                include: {
                  team: true,
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

      // Check if user has permission to generate magic links for this team
      const membership = await ctx.prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.auth.userId,
            teamId: assignment.instance.workflow.team.id,
          },
        },
      });

      if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to generate magic links",
        });
      }

      // Generate secure token
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // Store the magic link token
      await ctx.prisma.temporaryData.create({
        data: {
          id: token,
          data: JSON.stringify({
            type: "approval_magic_link",
            assignmentId,
            reviewerEmail,
            createdBy: ctx.auth.userId,
          }),
          expiresAt,
        },
      });

      // Generate the magic link URL
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const magicLink = `${baseUrl}/approvals?token=${token}`;

      return {
        magicLink,
        expiresAt,
        token,
      };
    }),

  // Verify magic link and get assignment details
  verifyMagicLink: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { token } = input;

      // Get the magic link data
      const magicLinkData = await ctx.prisma.temporaryData.findUnique({
        where: { id: token },
      });

      if (!magicLinkData || magicLinkData.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired magic link",
        });
      }

      const linkData = JSON.parse(magicLinkData.data);

      if (linkData.type !== "approval_magic_link") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid magic link type",
        });
      }

      // Get assignment details
      const assignment = await ctx.prisma.approvalAssignment.findUnique({
        where: { id: linkData.assignmentId },
        include: {
          step: true,
          instance: {
            include: {
              workflow: {
                include: {
                  team: true,
                },
              },
              post: {
                include: {
                  user: {
                    select: { name: true, email: true },
                  },
                  postSocialAccounts: {
                    include: {
                      socialAccount: true,
                    },
                  },
                },
              },
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

      return {
        assignment,
        reviewerEmail: linkData.reviewerEmail,
        isValid: true,
      };
    }),

  // Submit review via magic link
  submitMagicLinkReview: publicProcedure
    .input(
      z.object({
        token: z.string(),
        approve: z.boolean(),
        feedback: z.string().optional(),
        reviewerName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token, approve, feedback, reviewerName } = input;

      // Verify magic link
      const magicLinkData = await ctx.prisma.temporaryData.findUnique({
        where: { id: token },
      });

      if (!magicLinkData || magicLinkData.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired magic link",
        });
      }

      const linkData = JSON.parse(magicLinkData.data);

      // Get assignment
      const assignment = await ctx.prisma.approvalAssignment.findUnique({
        where: { id: linkData.assignmentId },
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

      if (assignment.status !== ApprovalStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assignment has already been reviewed",
        });
      }

      // Process the review (similar to reviewAssignment but for external reviewers)
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Update the assignment
        await tx.approvalAssignment.update({
          where: { id: linkData.assignmentId },
          data: {
            status: approve ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
            feedback: feedback
              ? `${feedback} (Reviewed by: ${reviewerName || linkData.reviewerEmail})`
              : `Reviewed by: ${reviewerName || linkData.reviewerEmail}`,
            completedAt: new Date(),
          },
        });

        // Send status notification to the author
        await sendApprovalStatusNotification(
          ctx,
          linkData.assignmentId,
          approve,
          feedback
        );

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
                status: "DRAFT",
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
          (a) =>
            a.status === ApprovalStatus.APPROVED ||
            a.id === linkData.assignmentId
        );

        if (!allApproved) {
          return { success: true, status: "WAITING_FOR_OTHERS" };
        }

        if (nextSteps.length === 0) {
          // This was the last step
          await tx.approvalInstance.update({
            where: { id: assignment.instanceId },
            data: {
              status: ApprovalStatus.APPROVED,
              currentStepOrder: null,
            },
          });

          if (assignment.instance.postId) {
            await tx.post.update({
              where: { id: assignment.instance.postId },
              data: {
                status: "SCHEDULED",
              },
            });
          }

          return { success: true, status: "APPROVED" };
        }

        // Move to next step (implementation similar to reviewAssignment)
        const nextStep = nextSteps[0];
        await tx.approvalInstance.update({
          where: { id: assignment.instanceId },
          data: {
            currentStepOrder: nextStep.order,
          },
        });

        // Create assignments for next step
        if (nextStep.assignedUserId) {
          const nextAssignment = await tx.approvalAssignment.create({
            data: {
              stepId: nextStep.id,
              instanceId: assignment.instanceId,
              assignedUserId: nextStep.assignedUserId,
              status: ApprovalStatus.PENDING,
            },
          });

          await sendApprovalNotifications(
            ctx,
            [nextAssignment.id],
            assignment.instance.postId || "",
            assignment.instance.workflow.teamId,
            tx
          );
        }
        // Add other next step logic as needed...

        return { success: true, status: "MOVED_TO_NEXT_STEP" };
      });

      // Invalidate the magic link after use
      await ctx.prisma.temporaryData.delete({
        where: { id: token },
      });

      return result;
    }),

  // Resubmit a rejected post for approval (Approach 2: Continue from rejection stage)
  resubmitPost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        restartFromBeginning: z.boolean().default(false), // Keep for API compatibility but always use false
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      // Get the post and its current approval instance
      const post = await ctx.prisma.post.findUnique({
        where: { id: postId },
        include: {
          approvalInstances: {
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
              assignments: {
                include: {
                  step: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Check if user has access to this post
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

      const currentInstance = post.approvalInstances[0];
      if (
        !currentInstance ||
        currentInstance.status !== ApprovalStatus.REJECTED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post is not in a rejected state",
        });
      }

      return await ctx.prisma.$transaction(async (tx) => {
        // Find the step where rejection occurred (Approach 2: Continue from rejection stage)
        const rejectedAssignments = currentInstance.assignments.filter(
          (assignment) => assignment.status === ApprovalStatus.REJECTED
        );

        let targetStepOrder: number;
        if (rejectedAssignments.length === 0) {
          // Fallback to first step if no specific rejection found
          targetStepOrder = 1;
        } else {
          // Get the earliest rejection step
          const rejectionSteps = rejectedAssignments.map(
            (assignment) => assignment.step.order
          );
          targetStepOrder = Math.min(...rejectionSteps);
        }

        // Update the approval instance
        await tx.approvalInstance.update({
          where: { id: currentInstance.id },
          data: {
            status: ApprovalStatus.IN_PROGRESS,
            currentStepOrder: targetStepOrder,
          },
        });

        // Reset only the assignments from the rejection step onwards
        const stepsToReset = currentInstance.workflow.steps.filter(
          (step) => step.order >= targetStepOrder
        );

        for (const step of stepsToReset) {
          await tx.approvalAssignment.updateMany({
            where: {
              instanceId: currentInstance.id,
              stepId: step.id,
            },
            data: {
              status: ApprovalStatus.PENDING,
              feedback: null,
              completedAt: null,
            },
          });
        }

        // Update post status
        await tx.post.update({
          where: { id: postId },
          data: {
            status: "DRAFT", // Set to draft while under review
          },
        });

        // Send notifications to assignees of the target step (rejection step)
        const targetStep = currentInstance.workflow.steps.find(
          (step) => step.order === targetStepOrder
        );

        if (targetStep) {
          const targetAssignments = await tx.approvalAssignment.findMany({
            where: {
              instanceId: currentInstance.id,
              stepId: targetStep.id,
            },
          });

          if (targetAssignments.length > 0) {
            await sendApprovalNotifications(
              ctx,
              targetAssignments.map((a) => a.id),
              postId,
              post.teamId,
              tx
            );
          }
        }

        return {
          success: true,
          message: "Post resubmitted for review from rejection stage",
          targetStepOrder,
        };
      });
    }),
});
