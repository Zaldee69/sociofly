import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { LoaderCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PostFormValues } from "../schema";

interface ApprovalWorkflowSelectorProps {
  teamId: string;
}

export function ApprovalWorkflowSelector({
  teamId,
}: ApprovalWorkflowSelectorProps) {
  const form = useFormContext<PostFormValues>();
  const needsApproval = form.watch("needsApproval");

  // Fetch available approval workflows for the team
  const { data: approvalWorkflows, isLoading } =
    trpc.approvalWorkflow.getWorkflows.useQuery(
      { teamId },
      {
        enabled: !!teamId,
      }
    );

  // If user unchecks "needs approval", clear the workflow ID
  useEffect(() => {
    if (!needsApproval) {
      form.setValue("approvalWorkflowId", undefined);
    }
  }, [needsApproval, form]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="needsApproval"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Submit for approval</FormLabel>
              <FormDescription>
                This post will need to be approved before publishing
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {needsApproval && (
        <FormField
          control={form.control}
          name="approvalWorkflowId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Approval Workflow</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={
                  isLoading ||
                  !approvalWorkflows ||
                  approvalWorkflows.length === 0
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                    </div>
                  ) : approvalWorkflows && approvalWorkflows.length > 0 ? (
                    approvalWorkflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">
                      No workflows found
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose which approval workflow to use
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
