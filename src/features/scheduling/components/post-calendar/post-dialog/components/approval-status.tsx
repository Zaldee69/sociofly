import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  LoaderCircle,
  User,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface ApprovalStatusProps {
  postId: string;
}

export function ApprovalStatusDisplay({ postId }: ApprovalStatusProps) {
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
      <Card className="border-l-4 py-2 border-l-blue-500">
        <CardContent className="flex items-center gap-3 py-3">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm">Loading approval status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-l-4 py-2 border-l-red-500">
        <CardContent className="flex items-center gap-3 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-sm text-red-600">
            Failed to load approval status
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!approvalInstances || approvalInstances.length === 0) {
    return (
      <Card className="border-l-4 py-2 border-l-green-500">
        <CardContent className="flex items-center gap-3 py-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm">
            No approval required - Ready to publish
          </span>
        </CardContent>
      </Card>
    );
  }

  const instance = approvalInstances[0];
  const workflow = instance.workflow;
  const assignments = instance.assignments || [];

  // Get current step assignments
  const getCurrentStepAssignments = () => {
    const currentStepOrder = instance.currentStepOrder;
    const currentStep = workflow.steps.find(
      (step) => step.order === currentStepOrder
    );
    if (!currentStep) return [];

    return assignments.filter(
      (assignment) => assignment.stepId === currentStep.id
    );
  };

  // Get rejection feedback
  const getRejectionFeedback = () => {
    const rejectedAssignments = assignments.filter(
      (assignment) => assignment.status === "REJECTED" && assignment.feedback
    );
    return rejectedAssignments.map((assignment) => ({
      feedback: assignment.feedback,
      reviewer: assignment.user?.name || assignment.user?.email || "Unknown",
    }));
  };

  // Render status based on approval status
  const renderStatus = () => {
    const currentStepAssignments = getCurrentStepAssignments();
    const rejectionFeedback = getRejectionFeedback();

    switch (instance.status) {
      case "APPROVED":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Approved
            </Badge>
          ),
          message: "This post has been approved and is ready to publish",
          borderColor: "border-l-green-500",
          additionalInfo: null,
        };
      case "REJECTED":
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          badge: <Badge variant="destructive">Rejected</Badge>,
          message: "This post has been rejected and needs revision",
          borderColor: "border-l-red-500",
          additionalInfo:
            rejectionFeedback.length > 0 ? (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-medium text-red-800 mb-2">
                  Rejection Feedback:
                </div>
                {rejectionFeedback.map((feedback, index) => (
                  <div key={index} className="text-sm text-red-700">
                    <div className="font-medium">From: {feedback.reviewer}</div>
                    <div className="mt-1">{feedback.feedback}</div>
                    {index < rejectionFeedback.length - 1 && (
                      <hr className="my-2 border-red-200" />
                    )}
                  </div>
                ))}
                <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                  💡 Tip: Use the submit button below to resubmit this post for
                  review
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                💡 Tip: Use the submit button below to resubmit this post for
                review
              </div>
            ),
        };
      case "IN_PROGRESS":
        const currentStep = instance.currentStepOrder;
        const totalSteps = workflow.steps.length;
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          badge: <Badge variant="secondary">In Progress</Badge>,
          message: `Under review - Step ${currentStep} of ${totalSteps}`,
          borderColor: "border-l-yellow-500",
          additionalInfo:
            currentStepAssignments.length > 0 ? (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-medium text-yellow-800 mb-2">
                  Currently reviewing:
                </div>
                <div className="space-y-1">
                  {currentStepAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-2 text-sm text-yellow-700"
                    >
                      <User className="w-4 h-4" />
                      <span>
                        {assignment.user?.name ||
                          assignment.user?.email ||
                          "Unassigned"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {assignment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          badge: <Badge variant="outline">Pending</Badge>,
          message: "Waiting for review",
          borderColor: "border-l-gray-500",
          additionalInfo: null,
        };
    }
  };

  const status = renderStatus();

  return (
    <Card className={`border-l-4 py-2 ${status.borderColor}`}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <div className="font-medium text-sm">Approval Status</div>
              <div className="text-xs text-muted-foreground">
                {workflow.name}
              </div>
            </div>
          </div>
          {status.badge}
        </div>
        <div className="text-sm text-muted-foreground">{status.message}</div>
        {status.additionalInfo}
      </CardContent>
    </Card>
  );
}

// Export function to check if post is rejected (for use in other components)
export function usePostApprovalStatus(postId: string) {
  const { data: approvalInstances } = trpc.post.getApprovalInstances.useQuery(
    { postId },
    { enabled: !!postId }
  );

  const instance = approvalInstances?.[0];

  return {
    isRejected: instance?.status === "REJECTED",
    isApproved: instance?.status === "APPROVED",
    isInProgress: instance?.status === "IN_PROGRESS",
    instance,
  };
}
