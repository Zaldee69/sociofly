import React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  LoaderCircle,
  User,
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
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error || !approvalInstances || approvalInstances.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CheckCircle className="h-4 w-4 text-green-500" />
        No approval required
      </div>
    );
  }

  const instance = approvalInstances[0];
  const workflow = instance.workflow;
  const assignments = instance.assignments || [];

  // Get current step
  const currentStep = workflow.steps
    .sort((a, b) => a.order - b.order)
    .find((step) => {
      const stepAssignments = assignments.filter((a) => a.stepId === step.id);
      return stepAssignments.some((a) => a.status === "PENDING");
    });

  // Get current reviewer
  const currentAssignment = currentStep
    ? assignments.find(
        (a) => a.stepId === currentStep.id && a.status === "PENDING"
      )
    : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Simple Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(instance.status)}
          <span className="text-sm font-medium text-gray-900">
            {workflow.name}
          </span>
        </div>
        <Badge
          variant={instance.status === "APPROVED" ? "default" : "secondary"}
          className="text-xs"
        >
          {instance.status === "IN_PROGRESS" ? "In Progress" : instance.status}
        </Badge>
      </div>

      {/* Current Reviewer */}
      {currentStep && currentAssignment && currentAssignment.user && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Avatar className="w-8 h-8">
            <AvatarImage
              src={`https://avatar.vercel.sh/${currentAssignment.user.email}`}
            />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
              {currentAssignment.user.name?.charAt(0) ||
                currentAssignment.user.email.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {currentAssignment.user.name || currentAssignment.user.email}
            </div>
            <div className="text-xs text-gray-500">
              Waiting for {currentStep.name.toLowerCase()}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            Pending
          </Badge>
        </div>
      )}

      {/* Simple Progress */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>
          Step {currentStep?.order || workflow.steps.length} of{" "}
          {workflow.steps.length}
        </span>
        <div className="flex-1 bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all"
            style={{
              width: `${
                ((currentStep?.order || workflow.steps.length) /
                  workflow.steps.length) *
                100
              }%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
