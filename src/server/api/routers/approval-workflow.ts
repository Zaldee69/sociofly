import { z } from "zod";
import { Role } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, hasTeamFeature } from "../trpc";
import { Feature } from "@/config/feature-flags";
import { prisma } from "@/lib/prisma/client"; // Import prisma directly for fallback

// Schema for workflow creation
const workflowCreateSchema = z.object({
  id: z.string().optional(), // Optional ID for updating existing workflows
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  steps: z
    .array(
      z.object({
        id: z.string().optional(), // Optional for existing steps
        name: z.string().min(1, "Step name is required"),
        order: z.number().int().positive(),
        role: z.string(),
        assignedUserId: z.string().optional().nullable(),
        requireAllUsersInRole: z.boolean().default(false),
        externalReviewerEmails: z
          .array(z.string().email())
          .optional()
          .default([]),
      })
    )
    .min(1, "At least one step is required"),
});

export const approvalWorkflowRouter = createTRPCRouter({
  getWorkflows: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_APPROVAL_WORKFLOWS))
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId } = input;
      // Use the prisma client from context, or fallback to the imported client
      const db = ctx.prisma || prisma;

      if (!ctx.auth.userId) {
        throw new Error("User not authenticated");
      }

      try {
        // Check if user has access to this team
        const membership = await db.membership.findUnique({
          where: {
            userId_teamId: {
              userId: ctx.auth.userId,
              teamId,
            },
          },
        });

        if (!membership) {
          throw new Error("Not a member of this team");
        }

        // Get all workflows for this team
        return db.approvalWorkflow.findMany({
          where: {
            teamId,
          },
          include: {
            steps: {
              orderBy: {
                order: "asc",
              },
            },
          },
        });
      } catch (error) {
        console.error("Error in getWorkflows:", error);
        throw error;
      }
    }),

  getUsersByRole: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_APPROVAL_WORKFLOWS))
    .input(
      z.object({
        teamId: z.string(),
        role: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, role } = input;
      // Use the prisma client from context, or fallback to the imported client
      const db = ctx.prisma || prisma;

      if (!ctx.auth.userId) {
        throw new Error("User not authenticated");
      }

      try {
        // Check if user has access to this team
        const membership = await db.membership.findUnique({
          where: {
            userId_teamId: {
              userId: ctx.auth.userId,
              teamId,
            },
          },
        });

        if (!membership) {
          throw new Error("Not a member of this team");
        }

        // Get users with specific role or all users if no role specified
        const memberships = await db.membership.findMany({
          where: {
            teamId,
            ...(role ? { role: role as Role } : {}),
            status: "ACTIVE",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Format the result
        return memberships.map((membership) => ({
          id: membership.userId,
          name: membership.user.name || membership.user.email.split("@")[0],
          email: membership.user.email,
          role: membership.role,
        }));
      } catch (error) {
        console.error("Error in getUsersByRole:", error);
        return []; // Return empty array on error
      }
    }),

  createWorkflow: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_APPROVAL_WORKFLOWS))
    .input(
      workflowCreateSchema.extend({
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use the prisma client from context, or fallback to the imported client
      const db = ctx.prisma || prisma;
      const { teamId, ...workflowData } = input;

      if (!ctx.auth.userId) {
        throw new Error("User not authenticated");
      }

      try {
        // Check if user has permission to create workflow in this team
        const membership = await db.membership.findUnique({
          where: {
            userId_teamId: {
              userId: ctx.auth.userId,
              teamId,
            },
          },
          include: {
            grantsPermission: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (!membership) {
          throw new Error("Not a member of this team");
        }

        // Check if user has permission to create approval workflows
        const hasPermission =
          membership.role === "OWNER" ||
          membership.role === "MANAGER" ||
          membership.grantsPermission.some(
            (grant) => grant.permission.code === "workflow.create"
          );

        if (!hasPermission) {
          throw new Error("Insufficient permissions");
        }

        // Create workflow - we'll use a transaction to ensure all operations succeed
        return db.$transaction(async (tx) => {
          // Create the workflow first
          const workflowRecord = await tx.approvalWorkflow.create({
            data: {
              name: workflowData.name,
              description: workflowData.description,
              teamId,
            },
          });

          // Then create all steps
          await Promise.all(
            workflowData.steps.map((step) =>
              tx.approvalStep.create({
                data: {
                  name: step.name,
                  order: step.order,
                  role: step.role as Role,
                  assignedUserId: step.assignedUserId ?? undefined,
                  requireAllUsersInRole: step.requireAllUsersInRole,
                  externalReviewerEmails: step.externalReviewerEmails ?? [],
                  workflowId: workflowRecord.id,
                },
              })
            )
          );

          // Return the workflow with steps
          return tx.approvalWorkflow.findUnique({
            where: { id: workflowRecord.id },
            include: { steps: true },
          });
        });
      } catch (error) {
        console.error("Error in createWorkflow:", error);
        throw error;
      }
    }),

  updateWorkflow: protectedProcedure
    .use(hasTeamFeature(Feature.BASIC_APPROVAL_WORKFLOWS))
    .input(
      workflowCreateSchema.extend({
        id: z.string(), // Required for updates
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use the prisma client from context, or fallback to the imported client
      const db = ctx.prisma || prisma;
      const { id, teamId, ...workflowData } = input;

      if (!ctx.auth.userId) {
        throw new Error("User not authenticated");
      }

      try {
        // Check if user has permission to update workflow in this team
        const membership = await db.membership.findUnique({
          where: {
            userId_teamId: {
              userId: ctx.auth.userId,
              teamId,
            },
          },
          include: {
            grantsPermission: {
              include: {
                permission: true,
              },
            },
          },
        });

        if (!membership) {
          throw new Error("Not a member of this team");
        }

        // Check if user has permission to update approval workflows
        const hasPermission =
          membership.role === "OWNER" ||
          membership.role === "MANAGER" ||
          membership.grantsPermission.some(
            (grant) =>
              grant.permission.code === "workflow.update" ||
              grant.permission.code === "workflow.create"
          );

        if (!hasPermission) {
          throw new Error("Insufficient permissions");
        }

        // Verify the workflow exists and belongs to this team
        const existingWorkflow = await db.approvalWorkflow.findUnique({
          where: { id },
          include: { steps: true },
        });

        if (!existingWorkflow) {
          throw new Error("Workflow not found");
        }

        if (existingWorkflow.teamId !== teamId) {
          throw new Error("Workflow does not belong to this team");
        }

        // Update workflow - we'll use a transaction to ensure all operations succeed
        return db.$transaction(async (tx) => {
          // Update the workflow
          const workflowRecord = await tx.approvalWorkflow.update({
            where: { id },
            data: {
              name: workflowData.name,
              description: workflowData.description,
            },
          });

          // Delete existing steps
          await tx.approvalStep.deleteMany({
            where: { workflowId: id },
          });

          // Create new steps
          await Promise.all(
            workflowData.steps.map((step) =>
              tx.approvalStep.create({
                data: {
                  name: step.name,
                  order: step.order,
                  role: step.role as Role,
                  assignedUserId: step.assignedUserId ?? undefined,
                  requireAllUsersInRole: step.requireAllUsersInRole,
                  externalReviewerEmails: step.externalReviewerEmails ?? [],
                  workflowId: id,
                },
              })
            )
          );

          // Return the workflow with steps
          return tx.approvalWorkflow.findUnique({
            where: { id },
            include: { steps: true },
          });
        });
      } catch (error) {
        console.error("Error in updateWorkflow:", error);
        throw error;
      }
    }),
});
