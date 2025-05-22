import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostFormValues, PostAction } from "../schema";
import { ApprovalWorkflowSelector } from "./approval-workflow-selector";
import { ApprovalStatusDisplay } from "./approval-status";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

interface PostApprovalIntegrationProps {
  teamId: string;
  postId?: string;
  isEditing: boolean;
}

export function PostApprovalIntegration({
  teamId,
  postId,
  isEditing,
}: PostApprovalIntegrationProps) {
  const form = useFormContext<PostFormValues>();
  const [activeTab, setActiveTab] = useState<string>("workflow");
  const postAction = form.watch("postAction");
  const needsApproval = form.watch("needsApproval");

  // If we're editing an existing post and it has an approval instance,
  // show the status tab by default
  useEffect(() => {
    if (isEditing && postId) {
      const checkApprovalStatus = async () => {
        try {
          const approvalInstances =
            await trpc.post.getApprovalInstances.useQuery({ postId }).data;
          if (approvalInstances && approvalInstances.length > 0) {
            setActiveTab("status");
            // Set the form field so the checkbox shows as checked
            form.setValue("needsApproval", true);
          }
        } catch (error) {
          console.error("Error checking approval status:", error);
        }
      };

      checkApprovalStatus();
    }
  }, [isEditing, postId, form]);

  // Only show approval options for scheduled posts
  if (postAction !== PostAction.SCHEDULE) {
    return null;
  }

  return (
    <div className="space-y-4 mt-6 border rounded-md p-4">
      <h3 className="text-lg font-medium">Approval Workflow</h3>

      {isEditing && postId ? (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflow">Workflow Settings</TabsTrigger>
            <TabsTrigger value="status">Approval Status</TabsTrigger>
          </TabsList>
          <TabsContent value="workflow">
            <ApprovalWorkflowSelector teamId={teamId} />
          </TabsContent>
          <TabsContent value="status">
            <ApprovalStatusDisplay postId={postId} />
          </TabsContent>
        </Tabs>
      ) : (
        <ApprovalWorkflowSelector teamId={teamId} />
      )}

      {needsApproval && (
        <div className="p-4 bg-muted rounded-md mt-4">
          <p className="text-sm text-muted-foreground">
            This post will be scheduled but won't be published until it's
            approved according to the selected workflow.
          </p>
        </div>
      )}
    </div>
  );
}
