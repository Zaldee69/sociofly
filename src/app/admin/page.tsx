import { CronJobMonitor, ApprovalSystemHealth } from "@/features/system";

export default function AdminDashboard() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">System Administration</h1>
        <p className="text-muted-foreground">
          Monitor and manage your system's health and automated processes.
        </p>
      </div>

      {/* Approval System Health */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Approval System Health</h2>
        <ApprovalSystemHealth />
      </section>

      {/* Cron Job Monitor */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Automated Jobs Monitor</h2>
        <CronJobMonitor />
      </section>
    </div>
  );
}
