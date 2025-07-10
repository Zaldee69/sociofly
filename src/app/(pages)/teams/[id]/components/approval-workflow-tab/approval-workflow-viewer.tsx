import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

import {
  UserRound,
  User,
  GripVertical,
  Trash2,
  Plus,
  Shield,
  FileCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Step } from ".";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useApprovalWorkflow,
  type OrganizationUser,
} from "../../hooks/use-approval-workflow";
import { useParams } from "next/navigation";

type ApprovalFlowViewerProps = {
  steps: Step[];
  currentStepId?: string | null;
  className?: string;
  onChange?: (steps: Step[]) => void;
  onSave?: (steps: Step[]) => void;
  isLoading?: boolean;
};

const ROLE_OPTIONS = [
  "OWNER",
  "MANAGER",
  "SUPERVISOR",
  "CONTENT_CREATOR",
  "INTERNAL_REVIEWER",
  "CLIENT_REVIEWER",
];

// Map roles to icons for better visualization
const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER: <Shield size={18} />,
  MANAGER: <User size={18} />,
  SUPERVISOR: <UserCog size={18} />,
  CONTENT_CREATOR: <FileCheck size={18} />,
  INTERNAL_REVIEWER: <UserRound size={18} />,
  CLIENT_REVIEWER: <UserRound size={18} />,
};

export function ApprovalFlowViewer({
  steps: initialSteps = [],
  currentStepId,
  className,
  onChange,
  onSave,
  isLoading,
}: ApprovalFlowViewerProps) {
  const params = useParams();
  const teamId = params?.id as string;

  const [steps, setSteps] = useState<Step[]>([]);
  const [draggedStep, setDraggedStep] = useState<Step | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize steps from props
  useEffect(() => {
    if (initialSteps && initialSteps.length > 0) {
      setSteps(JSON.parse(JSON.stringify(initialSteps)));
    }
  }, [initialSteps]);

  // Get organization users from the hook
  const { organizationUsers, getUsersByRole } = useApprovalWorkflow(teamId);

  // Handle step changes
  const updateSteps = (newSteps: Step[]) => {
    const orderedSteps = newSteps.map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    setSteps(orderedSteps);
    if (onChange) onChange(orderedSteps);
  };

  // Handle property change for a step
  const handleStepChange = (id: string, field: keyof Step, value: any) => {
    const newSteps = steps.map((step) =>
      step.id === id ? { ...step, [field]: value } : step
    );
    updateSteps(newSteps);
  };

  // Handle step deletion
  const handleDeleteStep = (id: string) => {
    const newSteps = steps.filter((step) => step.id !== id);
    updateSteps(newSteps);
  };

  // Handle adding a new step
  const handleAddStep = () => {
    const newId = `step-${Date.now()}`;
    const newOrder = steps.length + 1;
    const newStep: Step = {
      id: newId,
      order: newOrder,
      role: "CONTENT_CREATOR",
      name: `Step ${newOrder}`,
      requireAllUsersInRole: false,
    };

    updateSteps([...steps, newStep]);
    toast.success("New approval step added");
  };

  // Handle saving the flow
  const handleSave = () => {
    if (onSave) {
      onSave(steps);
    }
    toast.success("Workflow saved successfully");
  };

  // Drag and drop handlers
  const handleStepStart = (step: Step) => {
    setDraggedStep(step);
    setIsDragging(true);
  };

  const handleDragEnter = (targetStep: Step) => {
    if (!draggedStep || draggedStep.id === targetStep.id) return;

    // Reorder the steps
    const reorderedSteps = [...steps];
    const fromIndex = reorderedSteps.findIndex((s) => s.id === draggedStep.id);
    const toIndex = reorderedSteps.findIndex((s) => s.id === targetStep.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderedSteps.splice(toIndex, 0, reorderedSteps.splice(fromIndex, 1)[0]);
      updateSteps(reorderedSteps);
    }
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
    setIsDragging(false);
    toast.info("Workflow order updated");
  };

  // Find user by ID
  const findUserById = (userId: string): OrganizationUser | undefined => {
    return organizationUsers.find((user) => user.id === userId);
  };

  return (
    <div className="divide-y divide-gray-100 px-4">
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <div className="rounded-full bg-gray-100 p-3 mb-4">
            <Plus size={24} className="text-gray-400" />
          </div>
          <p className="mb-2 font-medium">No approval steps defined</p>
          <p className="text-sm text-gray-500 mb-4">
            Add steps to create an approval workflow
          </p>
          <Button
            onClick={handleAddStep}
            variant="outline"
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Plus size={16} className="mr-1" /> Add First Step
          </Button>
        </div>
      ) : (
        <div className="relative pt-4">
          {/* Timeline line */}
          <div className="absolute left-[24px] top-6 bottom-10 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500 z-0" />

          {/* Timeline steps */}
          <div className="space-y-8">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "relative z-10 transition-all duration-200",
                  isDragging && draggedStep?.id === step.id && "opacity-60"
                )}
                draggable
                onDragStart={() => handleStepStart(step)}
                onDragEnter={() => handleDragEnter(step)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="flex items-start">
                  {/* Timeline dot with drag handle */}
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-background shadow-sm transition-colors duration-200 cursor-grab",
                      currentStepId === step.id
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                        : "bg-white text-gray-700 border-gray-200"
                    )}
                  >
                    <div className="flex items-center">
                      <GripVertical className="w-4 h-4 absolute -left-6 opacity-50 hover:opacity-100" />
                      {step.order}
                    </div>
                  </div>

                  {/* Step content */}
                  <div
                    className={cn(
                      "ml-4 flex-1 rounded-xl border p-5 transition-all",
                      currentStepId === step.id
                        ? "border-purple-200 bg-purple-50/30 shadow-sm"
                        : "border-gray-100 bg-white hover:bg-gray-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-4 flex-1">
                        {/* Step name input */}
                        <div className="mb-3">
                          <Label
                            htmlFor={`step-name-${step.id}`}
                            className="text-xs text-gray-500 mb-1"
                          >
                            Step Name
                          </Label>
                          <Input
                            id={`step-name-${step.id}`}
                            value={step.name}
                            onChange={(e) =>
                              handleStepChange(step.id, "name", e.target.value)
                            }
                            className="h-8 text-sm"
                            placeholder="Enter step name"
                          />
                        </div>

                        {/* Role selection */}
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex items-center justify-center h-9 w-9 rounded-full text-white",
                              step.role.includes("REVIEWER")
                                ? "bg-indigo-500"
                                : step.role === "CONTENT_CREATOR"
                                  ? "bg-emerald-500"
                                  : "bg-purple-500"
                            )}
                          >
                            {ROLE_ICONS[step.role] || <User size={18} />}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-9 px-3 font-medium"
                              >
                                {step.role.replace(/_/g, " ")}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              {ROLE_OPTIONS.map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={() =>
                                    handleStepChange(step.id, "role", role)
                                  }
                                  className="gap-2"
                                >
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      role.includes("REVIEWER")
                                        ? "bg-indigo-500"
                                        : role === "CONTENT_CREATOR"
                                          ? "bg-emerald-500"
                                          : "bg-purple-500"
                                    )}
                                  />
                                  {role.replace(/_/g, " ")}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* User assignment */}
                        <div className="flex flex-col mt-3">
                          <Label className="text-xs text-gray-500 mb-1">
                            User Assignment
                          </Label>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-8 text-sm w-full justify-start"
                                  disabled={step.requireAllUsersInRole}
                                >
                                  {step.assignedUserId
                                    ? findUserById(step.assignedUserId)?.name ||
                                      "Unknown user"
                                    : "Any user with role"}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="start"
                                className="w-56"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStepChange(
                                      step.id,
                                      "assignedUserId",
                                      undefined
                                    )
                                  }
                                  className="gap-2"
                                >
                                  <Users size={16} />
                                  <span>Any user with this role</span>
                                </DropdownMenuItem>

                                {getUsersByRole(step.role).length > 0 ? (
                                  getUsersByRole(step.role).map((user) => (
                                    <DropdownMenuItem
                                      key={user.id}
                                      onClick={() =>
                                        handleStepChange(
                                          step.id,
                                          "assignedUserId",
                                          user.id
                                        )
                                      }
                                      className="gap-2"
                                    >
                                      <User size={16} />
                                      {user.name}
                                    </DropdownMenuItem>
                                  ))
                                ) : (
                                  <DropdownMenuItem
                                    disabled
                                    className="gap-2 text-muted-foreground"
                                  >
                                    <User size={16} />
                                    No users with this role
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Require all users checkbox */}
                        <div className="flex items-center space-x-2 mt-3">
                          <Checkbox
                            id={`require-all-${step.id}`}
                            checked={step.requireAllUsersInRole}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // When requiring all users, clear any specific assigned user
                                handleStepChange(
                                  step.id,
                                  "assignedUserId",
                                  undefined
                                );
                              }
                              handleStepChange(
                                step.id,
                                "requireAllUsersInRole",
                                !!checked
                              );
                            }}
                            disabled={!!step.assignedUserId}
                          />
                          <Label
                            htmlFor={`require-all-${step.id}`}
                            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Require approval from all users with this role
                          </Label>
                        </div>
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() => handleDeleteStep(step.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add step and save buttons */}
          <div className="mt-8 ml-12 flex justify-between">
            <Button
              onClick={handleAddStep}
              variant="outline"
              className="border-dashed border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600"
              disabled={isLoading}
            >
              <Plus size={16} className="mr-1" /> Add Step
            </Button>

            <Button
              onClick={handleSave}
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">◌</span>
                  Saving...
                </>
              ) : (
                "Save Workflow"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
