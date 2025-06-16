import { JobSchedulerMonitor } from "@/features/system/components/cron-job-monitor";

export default function JobSchedulerPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Job Scheduler Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage scheduled jobs, queue metrics, and system health
        </p>
      </div>

      <JobSchedulerMonitor />
    </div>
  );
}
