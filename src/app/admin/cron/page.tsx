"use client";

import { JobSchedulerMonitor } from "@/features/system/components/cron-job-monitor";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";

export default function JobSchedulerPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cron Job Management</h1>
              <p className="text-muted-foreground text-sm">
                Monitor and manage scheduled jobs, queue metrics, and system health
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      <JobSchedulerMonitor />
    </div>
  );
}
