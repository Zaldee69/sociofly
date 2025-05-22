import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { ApprovalStatus } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";

interface ApprovalStatusProps {
  postId: string;
}

type ApprovalData = {
  inApproval: boolean;
  status: string;
  currentStep?: string;
  approvers?: string[];
};

export function ApprovalStatusDisplay({ postId }: ApprovalStatusProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);

  const { data: approvalInstances, isLoading } =
    trpc.post.getApprovalInstances.useQuery(
      { postId },
      {
        enabled: !!postId,
      }
    );

  // Process the data when it's loaded
  useEffect(() => {
    if (!isLoading && approvalInstances) {
      if (approvalInstances.length === 0) {
        setApprovalData({ inApproval: false, status: "NOT_IN_APPROVAL" });
      } else {
        const instance = approvalInstances[0];
        setApprovalData({
          inApproval: true,
          status: instance.status,
          currentStep: instance.currentStepOrder
            ? `Step ${instance.currentStepOrder}`
            : "Completed",
          approvers: instance.assignments?.map(
            (assignment) =>
              assignment.user?.name || assignment.user?.email || "Unknown"
          ),
        });
      }
      setLoading(false);
    }
  }, [approvalInstances, isLoading]);

  // Handle error state
  useEffect(() => {
    if (!isLoading && !approvalInstances) {
      setError("Failed to load approval status");
      setLoading(false);
    }
  }, [approvalInstances, isLoading]);

  if (loading || isLoading) {
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
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!approvalData?.inApproval) {
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

  // Render appropriate status icon based on approval status
  const renderStatusIcon = () => {
    switch (approvalData.status) {
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
    switch (approvalData.status) {
      case "APPROVED":
        // Using 'outline' with custom color classes instead of 'success' variant
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
        return <Badge variant="outline">{approvalData.status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Approval Status</CardTitle>
          {renderStatusBadge()}
        </div>
        <CardDescription>
          {approvalData.currentStep
            ? `Currently at: ${approvalData.currentStep}`
            : "Approval process complete"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          {renderStatusIcon()}
          <span className="font-medium">
            {approvalData.status === "APPROVED"
              ? "This post has been approved"
              : approvalData.status === "REJECTED"
                ? "This post has been rejected"
                : "Awaiting approval from reviewers"}
          </span>
        </div>

        {approvalData.approvers && approvalData.approvers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Reviewers:</h4>
            <ul className="text-sm space-y-1">
              {approvalData.approvers.map((approver, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span>• {approver}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
