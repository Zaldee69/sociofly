import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApprovalFlowViewer } from "./approval-workflow-viewer";

export interface Step {
  id: string;
  order: number;
  role: string;
}

export default function ApprovalWorkflowTab() {
  // Sample initial steps
  const [steps, setSteps] = useState<Step[]>([
    {
      id: "1",
      order: 1,
      role: "MANAGER",
    },
    {
      id: "2",
      order: 2,
      role: "SUPERVISOR",
    },
    {
      id: "3",
      order: 3,
      role: "INTERNAL_REVIEWER",
    },
    {
      id: "4",
      order: 4,
      role: "EXTERNAL_REVIEWER",
    },
  ]);

  // Handler for when steps are saved
  const handleSave = (savedSteps: Step[]) => {
    console.log("Saved steps:", savedSteps);
    setSteps(savedSteps);
  };

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
        <ApprovalFlowViewer
          steps={steps}
          currentStepId={steps.length > 0 ? steps[0].id : null}
          onChange={setSteps}
          onSave={handleSave}
        />
      </CardContent>
    </Card>
  );
}
