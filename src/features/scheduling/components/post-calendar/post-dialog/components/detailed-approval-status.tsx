import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  LoaderCircle,
  User,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface DetailedApprovalStatusProps {
  postId: string;
}

export function DetailedApprovalStatus({
  postId,
}: DetailedApprovalStatusProps) {
  const {
    data: approvalInstances,
    isLoading,
    error,
  } = trpc.post.getApprovalInstances.useQuery(
    { postId },
    {
      enabled: !!postId,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
          <CardDescription>Loading approval information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
          <CardDescription>Something went wrong</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load approval status</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!approvalInstances || approvalInstances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
          <CardDescription>This post does not require approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Ready to publish</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const instance = approvalInstances[0];
  const workflow = instance.workflow;
  const assignments = instance.assignments || [];

  // Calculate progress
  const totalSteps = workflow.steps.length;
  const currentStepOrder = instance.currentStepOrder || 0;
  const completedSteps =
    instance.status === "APPROVED"
      ? totalSteps
      : Math.max(0, currentStepOrder - 1);
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Render appropriate status icon based on approval status
  const renderStatusIcon = () => {
    switch (instance.status) {
      case "APPROVED":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "REJECTED":
        return <XCircle className="h-6 w-6 text-red-500" />;
      case "PENDING":
      case "IN_PROGRESS":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  // Render appropriate status badge
  const renderStatusBadge = () => {
    switch (instance.status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
            Approved
          </Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>;
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">{instance.status}</Badge>;
    }
  };

  // Get step status
  const getStepStatus = (stepOrder: number) => {
    if (instance.status === "REJECTED") {
      return stepOrder < currentStepOrder
        ? "completed"
        : stepOrder === currentStepOrder
          ? "rejected"
          : "pending";
    }
    if (instance.status === "APPROVED") {
      return "completed";
    }
    if (stepOrder < currentStepOrder) {
      return "completed";
    }
    if (stepOrder === currentStepOrder) {
      return "current";
    }
    return "pending";
  };

  // Get assignments for a specific step
  const getStepAssignments = (stepId: string) => {
    return assignments.filter((assignment) => assignment.stepId === stepId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Approval Workflow Status
          </CardTitle>
          {renderStatusBadge()}
        </div>
        <CardDescription>
          {workflow.name} -{" "}
          {instance.status === "APPROVED"
            ? "Completed"
            : instance.status === "REJECTED"
              ? "Rejected"
              : `Step ${currentStepOrder} of ${totalSteps}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall status */}
        <div className="flex items-center gap-3">
          {renderStatusIcon()}
          <div className="flex-1">
            <div className="font-medium">
              {instance.status === "APPROVED"
                ? "This post has been approved and is ready to publish"
                : instance.status === "REJECTED"
                  ? "This post has been rejected and needs revision"
                  : "This post is currently under review"}
            </div>
            {instance.status === "IN_PROGRESS" && (
              <div className="text-sm text-muted-foreground mt-1">
                Progress: {completedSteps} of {totalSteps} steps completed
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {instance.status === "IN_PROGRESS" && (
          <div className="space-y-2">
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {Math.round(progressPercentage)}% complete
            </div>
          </div>
        )}

        {/* Workflow steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Workflow Steps:</h4>
          <div className="space-y-2">
            {workflow.steps.map((step: any, index: number) => {
              const stepStatus = getStepStatus(step.order);
              const stepAssignments = getStepAssignments(step.id);

              return (
                <div
                  key={step.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        stepStatus === "completed"
                          ? "bg-green-500 text-white"
                          : stepStatus === "current"
                            ? "bg-blue-500 text-white"
                            : stepStatus === "rejected"
                              ? "bg-red-500 text-white"
                              : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {stepStatus === "completed" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : stepStatus === "rejected" ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        step.order
                      )}
                    </div>
                    {index < workflow.steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Step details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{step.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {step.role.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Assignments for this step */}
                    {stepAssignments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {stepAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <User className="w-3 h-3" />
                            <span>
                              {assignment.user?.name ||
                                assignment.user?.email ||
                                "Unassigned"}
                            </span>
                            <Badge
                              variant={
                                assignment.status === "APPROVED"
                                  ? "default"
                                  : assignment.status === "REJECTED"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {assignment.status}
                            </Badge>
                            {assignment.feedback && (
                              <span className="text-muted-foreground">
                                - {assignment.feedback}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow info */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div>Workflow: {workflow.name}</div>
          {workflow.description && (
            <div>Description: {workflow.description}</div>
          )}
          <div>Created: {new Date(instance.createdAt).toLocaleString()}</div>
          {instance.updatedAt !== instance.createdAt && (
            <div>
              Last updated: {new Date(instance.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
