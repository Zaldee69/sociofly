import { CronJobMonitor } from "@/features/system";
import { JobExecutionMonitor } from "@/components/debug/job-execution-monitor";

export default function CronJobsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cron Jobs Management</h1>
        <p className="text-muted-foreground">
          Monitor, control, and manage automated background jobs.
        </p>
      </div>

      <CronJobMonitor />

      {/* Real-time job execution monitor */}
      <JobExecutionMonitor />
    </div>
  );
}
