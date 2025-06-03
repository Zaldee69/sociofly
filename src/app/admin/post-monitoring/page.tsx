import { PostMonitoringDashboard } from "@/features/system/components";

export default function AdminPostMonitoringPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Post Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor system health and manage post publishing issues
        </p>
      </div>

      <PostMonitoringDashboard />
    </div>
  );
}
