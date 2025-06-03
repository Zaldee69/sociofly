import { ApprovalSystemHealth } from "@/features/system";

export default function SystemHealthPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Health Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor approval system health, edge cases, and get automated
          recommendations.
        </p>
      </div>

      <ApprovalSystemHealth />
    </div>
  );
}
