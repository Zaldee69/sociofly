"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApprovalFlowViewer } from "./approval-workflow-viewer";
import { useParams } from "next/navigation";
import {
  useApprovalWorkflow,
  type Step,
} from "../../hooks/use-approval-workflow";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type { Step };

export default function ApprovalWorkflowTab() {
  const params = useParams();
  const teamId = params.id as string;

  // Use our custom hook
  const { steps, setSteps, isLoading, isError, error, saveWorkflow, isSaving } =
    useApprovalWorkflow(teamId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Approval Workflow</CardTitle>
          <CardDescription>
            Loading approval workflow configuration...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-12">
            <div className="animate-spin text-2xl">
              <Loader2 className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError && !steps.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Approval Workflow</CardTitle>
          <CardDescription>
            There was a problem loading the workflow configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message ||
                "Failed to load workflow data. Using default settings instead."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Approval Workflow</CardTitle>
        <CardDescription>
          Drag and drop to reorganize steps, add or remove steps, and customize
          the workflow to match your content approval process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700">Warning</AlertTitle>
            <AlertDescription className="text-amber-600">
              Some data could not be loaded. Using limited functionality.
            </AlertDescription>
          </Alert>
        )}
        <ApprovalFlowViewer
          steps={steps}
          currentStepId={steps.length > 0 ? steps[0].id : null}
          onChange={setSteps}
          onSave={saveWorkflow}
          isLoading={isSaving}
        />
      </CardContent>
    </Card>
  );
}
