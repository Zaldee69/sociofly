import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

export interface Step {
  id: string;
  order: number;
  role: string;
  name: string;
  assignedUserId?: string;
  requireAllUsersInRole: boolean;
}

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Default steps when no workflow exists
const DEFAULT_STEPS: Step[] = [
  {
    id: "1",
    order: 1,
    role: "MANAGER",
    name: "Manager Review",
    requireAllUsersInRole: false,
  },
  {
    id: "2",
    order: 2,
    role: "SUPERVISOR",
    name: "Supervisor Approval",
    requireAllUsersInRole: false,
  },
  {
    id: "3",
    order: 3,
    role: "INTERNAL_REVIEWER",
    name: "Internal Review",
    requireAllUsersInRole: true,
  },
  {
    id: "4",
    order: 4,
    role: "CLIENT_REVIEWER",
    name: "Client Approval",
    requireAllUsersInRole: false,
  },
];

export function useApprovalWorkflow(teamId: string) {
  const [steps, setSteps] = useState<Step[]>([]);

  // Query workflows with improved caching options
  const {
    data: workflows,
    isLoading: isLoadingWorkflows,
    isError: isWorkflowError,
    error: workflowError,
    refetch: refetchWorkflows,
  } = trpc.approvalWorkflow.getWorkflows.useQuery(
    { teamId: teamId },
    {
      staleTime: Infinity, // Keep data fresh indefinitely
      gcTime: 1000 * 60 * 60, // Cache for 1 hour (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false, // Don't refetch when component remounts
      refetchOnReconnect: false, // Don't refetch when network reconnects
      retry: 1,
    }
  );

  // Log errors
  useEffect(() => {
    if (workflowError) {
      console.error("Error fetching workflows:", workflowError);
    }
  }, [workflowError]);

  // Query users in organization
  const {
    data: organizationUsers = [],
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = trpc.approvalWorkflow.getUsersByRole.useQuery(
    { teamId },
    {
      staleTime: 1000 * 60 * 15, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Log user errors
  useEffect(() => {
    if (usersError) {
      console.error("Error fetching users:", usersError);
    }
  }, [usersError]);

  // Get users filtered by role
  const getUsersByRole = (role: string): OrganizationUser[] => {
    return organizationUsers.filter((user) => user.role === role);
  };

  // Mutation for creating workflows
  const createWorkflowMutation =
    trpc.approvalWorkflow.createWorkflow.useMutation({
      onSuccess: () => {
        toast.success("Approval workflow created successfully!");
        refetchWorkflows(); // Only refetch after a successful mutation
      },
      onError: (error) => {
        toast.error(`Failed to create workflow: ${error.message}`);
        console.error("Error creating workflow:", error);
      },
    });

  // Set steps when workflows data changes
  useEffect(() => {
    if (isWorkflowError) {
      console.error("Using default steps due to error:", workflowError);
      setSteps(DEFAULT_STEPS);
      return;
    }

    if (workflows && workflows.length > 0) {
      try {
        const workflow = workflows[0]; // Use the first workflow

        // Map the workflow steps to our step format
        const workflowSteps = workflow.steps.map((step) => ({
          id: step.id,
          order: step.order,
          role: step.role,
          name: step.name,
          assignedUserId: step.assignedUserId || undefined,
          requireAllUsersInRole: step.requireAllUsersInRole,
        }));

        setSteps(workflowSteps);
      } catch (error) {
        console.error("Error processing workflow steps:", error);
        setSteps(DEFAULT_STEPS);
      }
    } else if (!isLoadingWorkflows) {
      // Set default steps if no workflows exist and not in loading state
      setSteps(DEFAULT_STEPS);
    }
  }, [workflows, isLoadingWorkflows, isWorkflowError, workflowError]);

  // Save workflow function
  const saveWorkflow = (savedSteps: Step[]) => {
    try {
      // Check if a workflow already exists for this organization
      if (workflows && workflows.length > 0) {
        // We need to update an existing workflow
        // Since there's no updateWorkflow endpoint yet, we'll need to create a unique name
        // to avoid the unique constraint error
        createWorkflowMutation.mutate({
          name: `${workflows[0].name}-${Date.now()}`, // Make name unique by adding timestamp
          description:
            workflows[0].description ||
            "Organization's content approval workflow",
          teamId,
          steps: savedSteps.map((step) => ({
            name: step.name,
            order: step.order,
            role: step.role,
            assignedUserId: step.assignedUserId,
            requireAllUsersInRole: step.requireAllUsersInRole,
          })),
        });
      } else {
        // Create a new workflow if none exists
        createWorkflowMutation.mutate({
          name: "Default Approval Workflow",
          description: "Organization's default content approval workflow",
          teamId,
          steps: savedSteps.map((step) => ({
            name: step.name,
            order: step.order,
            role: step.role,
            assignedUserId: step.assignedUserId,
            requireAllUsersInRole: step.requireAllUsersInRole,
          })),
        });
      }
    } catch (error) {
      console.error("Error in saveWorkflow:", error);
      toast.error("An unexpected error occurred while saving the workflow");
    }
  };

  // Check if we have errors
  const hasErrors = isWorkflowError || isUsersError;

  return {
    steps,
    setSteps,
    isLoading: isLoadingWorkflows || isLoadingUsers,
    isError: hasErrors,
    error: workflowError,
    saveWorkflow,
    isSaving: createWorkflowMutation.isPending,
    refetchWorkflows, // Expose refetch for manual refresh if needed
    organizationUsers,
    getUsersByRole,
  };
}
