"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Square,
  RefreshCw,
  Zap,
  Activity,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CronJobStatus {
  name: string;
  running: boolean;
}

interface CronJobStats {
  period: string;
  totalLogs: number;
  jobs: Record<
    string,
    {
      total: number;
      success: number;
      error: number;
      warning: number;
      started: number;
      lastRun: Date | null;
    }
  >;
}

export function CronJobMonitor() {
  const [jobStatus, setJobStatus] = useState<CronJobStatus[]>([]);
  const [jobStats, setJobStats] = useState<CronJobStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [processingJob, setProcessingJob] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key";

  // Fetch cron job status
  const fetchJobStatus = async () => {
    try {
      const response = await fetch(
        `/api/cron-manager?action=status&apiKey=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        setJobStatus(data.result);
      }
    } catch (error) {
      console.error("Error fetching job status:", error);
    }
  };

  // Fetch cron job statistics
  const fetchJobStats = async (hours: number = 24) => {
    try {
      const response = await fetch(
        `/api/cron-manager?action=stats&hours=${hours}&apiKey=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        setJobStats(data.result);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching job stats:", error);
    }
  };

  // Trigger a specific job
  const triggerJob = async (jobName: string) => {
    setProcessingJob(jobName);
    try {
      const response = await fetch("/api/cron-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "trigger",
          jobName,
          apiKey,
        }),
      });

      if (response.ok) {
        await fetchJobStats(); // Refresh stats after triggering
      } else {
        console.error("Failed to trigger job");
      }
    } catch (error) {
      console.error("Error triggering job:", error);
    } finally {
      setProcessingJob(null);
    }
  };

  // Stop/Start a job
  const toggleJob = async (jobName: string, action: "start" | "stop") => {
    try {
      const response = await fetch("/api/cron-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          jobName,
          apiKey,
        }),
      });

      if (response.ok) {
        await fetchJobStatus(); // Refresh status after toggle
      }
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
    }
  };

  // Initialize data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchJobStatus(), fetchJobStats()]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every minute
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Get job description
  const getJobDescription = (jobName: string): string => {
    const descriptions: Record<string, string> = {
      publish_due_posts: "Publish posts that are due for publication",
      process_edge_cases: "Process approval system edge cases",
      check_expired_tokens: "Check for expired social account tokens",
      system_health_check: "Monitor system health and log metrics",
      cleanup_old_logs: "Clean up old cron logs (keep last 30 days)",
    };
    return descriptions[jobName] || "Unknown job";
  };

  // Get job schedule
  const getJobSchedule = (jobName: string): string => {
    const schedules: Record<string, string> = {
      publish_due_posts: "Every 5 minutes",
      process_edge_cases: "Every hour",
      check_expired_tokens: "Daily at 2 AM",
      system_health_check: "Every 15 minutes",
      cleanup_old_logs: "Weekly on Sunday at 3 AM",
    };
    return schedules[jobName] || "Unknown schedule";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cron Job Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const runningJobs = jobStatus.filter((job) => job.running).length;
  const totalJobs = jobStatus.length;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cron Job Monitor
            {lastUpdated && (
              <Badge variant="outline" className="ml-auto">
                Updated {lastUpdated.toLocaleTimeString()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  {runningJobs}/{totalJobs} jobs running
                </span>
              </div>
              {jobStats && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    {jobStats.totalLogs} executions in{" "}
                    {jobStats.period.toLowerCase()}
                  </span>
                </div>
              )}
            </div>
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Job Status Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobStatus.map((job) => {
                const stats = jobStats?.jobs[job.name];
                const successRate = stats
                  ? Math.round((stats.success / (stats.total || 1)) * 100)
                  : 0;

                return (
                  <TableRow key={job.name}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {job.name.replace(/_/g, " ").toUpperCase()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getJobDescription(job.name)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={job.running ? "default" : "secondary"}
                        className="flex items-center gap-1 w-fit"
                      >
                        {job.running ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Square className="h-3 w-3" />
                        )}
                        {job.running ? "Running" : "Stopped"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {getJobSchedule(job.name)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {stats?.lastRun ? (
                        <div className="text-sm">
                          {new Date(stats.lastRun).toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Never
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {stats ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-12 h-2 rounded-full",
                              successRate >= 90
                                ? "bg-green-200"
                                : successRate >= 70
                                  ? "bg-yellow-200"
                                  : "bg-red-200"
                            )}
                          >
                            <div
                              className={cn(
                                "h-full rounded-full",
                                successRate >= 90
                                  ? "bg-green-600"
                                  : successRate >= 70
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                              )}
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                          <span className="text-sm">{successRate}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No data
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerJob(job.name)}
                          disabled={processingJob === job.name}
                        >
                          {processingJob === job.name ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant={job.running ? "destructive" : "default"}
                          onClick={() =>
                            toggleJob(job.name, job.running ? "stop" : "start")
                          }
                        >
                          {job.running ? (
                            <Square className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Job Statistics */}
      {jobStats && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Statistics ({jobStats.period})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(jobStats.jobs).map(([jobName, stats]) => (
                <Card key={jobName} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">
                      {jobName.replace(/_/g, " ").toUpperCase()}
                    </h4>
                    <Badge variant="outline">{stats.total} runs</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">Success:</span>
                      <span>{stats.success}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Errors:</span>
                      <span>{stats.error}</span>
                    </div>
                    {stats.warning > 0 && (
                      <div className="flex justify-between">
                        <span className="text-yellow-600">Warnings:</span>
                        <span>{stats.warning}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {jobStatus.some((job) => !job.running) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Jobs Not Running</AlertTitle>
          <AlertDescription>
            Some cron jobs are not running:{" "}
            {jobStatus
              .filter((job) => !job.running)
              .map((job) => job.name)
              .join(", ")}
            . This may affect automated post scheduling and edge case handling.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
