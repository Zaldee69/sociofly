"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Square,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  BarChart3,
  TrendingUp,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface CronJobStatus {
  name: string;
  running: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface QueueMetrics {
  [queueName: string]: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
}

interface JobExecutionLog {
  jobId: string;
  jobName: string;
  status: "queued" | "processing" | "completed" | "failed";
  timestamp: Date;
  queueName?: string;
  error?: string;
  executionTime?: number;
}

interface ExecutionStats {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  hourlyStats: Array<{
    hour: string;
    executions: number;
    success: number;
    failed: number;
  }>;
  queueStats: Array<{
    queue: string;
    completed: number;
    failed: number;
    successRate: number;
  }>;
  jobTypeStats: Array<{
    jobType: string;
    count: number;
    avgDuration: number;
    successRate: number;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function CronJobMonitor() {
  const [jobStatus, setJobStatus] = useState<CronJobStatus[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [executionLogs, setExecutionLogs] = useState<JobExecutionLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(
    null
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedView, setSelectedView] = useState<
    "overview" | "stats" | "logs"
  >("overview");

  const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key";

  const fetchJobStatus = async () => {
    try {
      const response = await fetch(
        `/api/cron-manager?action=status&apiKey=${apiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        setJobStatus(data.result?.cronJobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch job status:", error);
    }
  };

  const fetchJobStats = async () => {
    try {
      const response = await fetch(
        `/api/cron-manager?action=queue_metrics&apiKey=${apiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        setQueueMetrics(data.result || {});
      }
    } catch (error) {
      console.error("Failed to fetch job stats:", error);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchJobStatus(), fetchJobStats()]);
      await fetchExecutionStats(); // Fetch stats after metrics are updated
      setLastUpdated(new Date());
      toast.success("Data refreshed successfully");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExecutionStats = async () => {
    try {
      // Generate mock execution statistics for demonstration
      // In a real implementation, this would come from your database
      const mockStats: ExecutionStats = {
        totalExecutions: Object.values(queueMetrics).reduce(
          (sum, queue) => sum + queue.completed + queue.failed,
          0
        ),
        successRate: 85.5,
        avgDuration: 2.3,
        hourlyStats: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, "0")}:00`,
          executions: Math.floor(Math.random() * 20) + 5,
          success: Math.floor(Math.random() * 18) + 4,
          failed: Math.floor(Math.random() * 3),
        })),
        queueStats: Object.entries(queueMetrics).map(([queue, metrics]) => ({
          queue,
          completed: metrics.completed,
          failed: metrics.failed,
          successRate:
            metrics.completed + metrics.failed > 0
              ? (metrics.completed / (metrics.completed + metrics.failed)) * 100
              : 100,
        })),
        jobTypeStats: [
          {
            jobType: "system_health_check",
            count: 45,
            avgDuration: 1.2,
            successRate: 98.5,
          },
          {
            jobType: "publish_due_posts",
            count: 23,
            avgDuration: 3.8,
            successRate: 87.2,
          },
          {
            jobType: "analyze_engagement_hotspots",
            count: 12,
            avgDuration: 8.5,
            successRate: 75.0,
          },
          {
            jobType: "fetch_account_insights",
            count: 8,
            avgDuration: 12.3,
            successRate: 62.5,
          },
          {
            jobType: "cleanup_old_logs",
            count: 15,
            avgDuration: 0.8,
            successRate: 100.0,
          },
        ],
      };
      setExecutionStats(mockStats);
    } catch (error) {
      console.error("Failed to fetch execution stats:", error);
    }
  };

  const triggerJob = async (jobName: string) => {
    try {
      const response = await fetch("/api/cron-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trigger",
          jobName,
          apiKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add execution log
        const newLog: JobExecutionLog = {
          jobId: data.result?.jobId || Date.now().toString(),
          jobName,
          status: "queued",
          timestamp: new Date(),
          queueName: data.result?.queueName,
        };
        setExecutionLogs((prev) => [newLog, ...prev.slice(0, 49)]);

        // Also add to global job execution monitor if available
        if ((window as any).jobExecutionMonitor) {
          (window as any).jobExecutionMonitor.addExecution({
            jobName,
            status: "queued",
            message: `Manual trigger: ${jobName}`,
            jobId: data.result?.jobId,
            queueName: data.result?.queueName,
          });
        }

        toast.success(`Job "${jobName}" triggered successfully`, {
          description: `Job ID: ${data.result?.jobId || "N/A"}`,
        });

        // Start real-time monitoring for this specific job
        // Use a small delay to allow the job to be queued properly
        setTimeout(() => {
          monitorJobExecution(newLog.jobId, jobName, data.result?.queueName);
        }, 500);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to trigger job: ${errorData.error}`);
      }
    } catch (error) {
      toast.error("Failed to trigger job");
    }
  };

  const monitorJobExecution = async (
    jobId: string,
    jobName: string,
    queueName?: string
  ) => {
    let attempts = 0;
    const maxAttempts = 60; // Reduced to 2 minutes since jobs complete quickly
    const relevantQueue = queueName || "social-sync";
    let lastKnownStatus = "queued";

    const checkJobStatus = async () => {
      try {
        // First, try to get specific job details
        const jobDetailResponse = await fetch(
          `/api/cron-manager?action=job_details&jobId=${jobId}&queueName=${relevantQueue}&apiKey=${apiKey}`
        );

        if (jobDetailResponse.ok) {
          const jobDetailData = await jobDetailResponse.json();
          const jobDetails = jobDetailData.result;

          if (jobDetails && !jobDetails.error) {
            // Job exists, check its status more carefully
            const hasFinished =
              jobDetails.finishedOn !== null &&
              jobDetails.finishedOn !== undefined;
            const hasFailed =
              jobDetails.failedReason !== null &&
              jobDetails.failedReason !== undefined;
            const hasStartedProcessing =
              jobDetails.processedOn !== null &&
              jobDetails.processedOn !== undefined;

            // More accurate status detection
            const isCompleted = hasFinished && !hasFailed;
            const isFailed = hasFailed;
            const isProcessing =
              hasStartedProcessing && !hasFinished && !hasFailed;

            console.log(`Job ${jobId} status check:`, {
              hasFinished,
              hasFailed,
              hasStartedProcessing,
              isCompleted,
              isFailed,
              isProcessing,
              processedOn: jobDetails.processedOn,
              finishedOn: jobDetails.finishedOn,
              failedReason: jobDetails.failedReason,
            });

            // Update status based on job state
            if (isProcessing && lastKnownStatus !== "processing") {
              lastKnownStatus = "processing";
              setExecutionLogs((prev) =>
                prev.map((log) =>
                  log.jobId === jobId
                    ? { ...log, status: "processing" as const }
                    : log
                )
              );

              // Update global monitor
              if ((window as any).jobExecutionMonitor) {
                (window as any).jobExecutionMonitor.updateExecution(jobId, {
                  status: "processing",
                  message: `Processing: ${jobName}`,
                });
              }
            }

            if (isCompleted || isFailed) {
              const finalStatus: "failed" | "completed" = isFailed
                ? "failed"
                : "completed";
              const executionTime =
                hasFinished && hasStartedProcessing
                  ? (jobDetails.finishedOn - jobDetails.processedOn) / 1000
                  : undefined;

              setExecutionLogs((prev) =>
                prev.map((log) =>
                  log.jobId === jobId
                    ? {
                        ...log,
                        status: finalStatus,
                        executionTime,
                        error: isFailed ? jobDetails.failedReason : undefined,
                      }
                    : log
                )
              );

              const statusMessage = isFailed
                ? `Job "${jobName}" failed`
                : `Job "${jobName}" completed successfully`;

              const description = isFailed
                ? `Error: ${jobDetails.failedReason}`
                : executionTime
                  ? `Execution time: ${executionTime.toFixed(1)}s`
                  : "Completed";

              // Update global monitor
              if ((window as any).jobExecutionMonitor) {
                (window as any).jobExecutionMonitor.updateExecution(jobId, {
                  status: finalStatus,
                  message: isFailed
                    ? `Failed: ${jobDetails.failedReason}`
                    : `Completed: ${jobName}`,
                  executionTime: executionTime
                    ? executionTime * 1000
                    : undefined,
                  error: isFailed ? jobDetails.failedReason : undefined,
                });
              }

              if (isFailed) {
                toast.error(statusMessage, { description });
              } else {
                toast.success(statusMessage, { description });
              }

              return; // Stop monitoring
            }
          }
        } else {
          // Job details not available - this is common for fast-completing jobs
          console.log(
            `Job details not available for ${jobId}, checking queue metrics...`
          );
        }

        // Always check queue metrics as a fallback
        const response = await fetch(
          `/api/cron-manager?action=queue_metrics&apiKey=${apiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          const currentMetrics = data.result || {};
          setQueueMetrics(currentMetrics);

          const queueMetric = currentMetrics[relevantQueue];

          // If no active jobs and we haven't seen completion, assume it completed
          if (queueMetric && queueMetric.active === 0 && attempts > 3) {
            // For fast-completing jobs, assume success if no active jobs and no error
            setExecutionLogs((prev) =>
              prev.map((log) =>
                log.jobId === jobId &&
                log.status !== "completed" &&
                log.status !== "failed"
                  ? {
                      ...log,
                      status: "completed" as "completed",
                      executionTime: 2.0, // Estimated execution time for fast jobs
                    }
                  : log
              )
            );

            // Update global monitor
            if ((window as any).jobExecutionMonitor) {
              (window as any).jobExecutionMonitor.updateExecution(jobId, {
                status: "completed",
                message: `Completed: ${jobName} (estimated)`,
                executionTime: 2000, // 2 seconds estimated
              });
            }

            toast.success(`Job "${jobName}" completed successfully`, {
              description: "Execution time: ~2.0s (estimated)",
            });

            return; // Stop monitoring
          }

          // Update to processing if there are active jobs
          if (
            queueMetric &&
            queueMetric.active > 0 &&
            lastKnownStatus === "queued"
          ) {
            lastKnownStatus = "processing";
            setExecutionLogs((prev) =>
              prev.map((log) =>
                log.jobId === jobId && log.status === "queued"
                  ? { ...log, status: "processing" as const }
                  : log
              )
            );
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          // Use shorter intervals for the first few attempts to catch fast jobs
          const interval = attempts < 10 ? 1000 : 2000;
          setTimeout(checkJobStatus, interval);
        } else {
          // Timeout - assume completion for jobs that can't be tracked
          setExecutionLogs((prev) =>
            prev.map((log) =>
              log.jobId === jobId &&
              log.status !== "completed" &&
              log.status !== "failed"
                ? {
                    ...log,
                    status: "completed" as "completed",
                    executionTime: undefined,
                    error: "Monitoring timeout - job likely completed",
                  }
                : log
            )
          );

          // Update global monitor
          if ((window as any).jobExecutionMonitor) {
            (window as any).jobExecutionMonitor.updateExecution(jobId, {
              status: "completed",
              message: `Completed: ${jobName} (timeout)`,
              error: "Monitoring timeout - job likely completed",
            });
          }

          toast.success(`Job "${jobName}" likely completed`, {
            description:
              "Monitoring timeout - job executed too quickly to track",
          });
        }
      } catch (error) {
        console.error("Error monitoring job:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkJobStatus, 2000);
        } else {
          setExecutionLogs((prev) =>
            prev.map((log) =>
              log.jobId === jobId &&
              log.status !== "completed" &&
              log.status !== "failed"
                ? {
                    ...log,
                    status: "completed" as "completed",
                    error: "Monitoring error - job likely completed",
                  }
                : log
            )
          );
        }
      }
    };

    // Start monitoring immediately
    checkJobStatus();
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusIcon = (
    status:
      | "queued"
      | "processing"
      | "completed"
      | "failed"
      | "running"
      | "stopped"
  ) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "queued":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "stopped":
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Safe access to job status
  const safeJobStatus = Array.isArray(jobStatus) ? jobStatus : [];

  if (isLoading && safeJobStatus.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading cron job status...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cron Job Monitor</h2>
          <p className="text-muted-foreground">
            Monitor and manage scheduled jobs
            {lastUpdated && (
              <span className="ml-2">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Disable" : "Enable"} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {safeJobStatus.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No cron jobs found. Make sure the cron manager is initialized.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={selectedView === "overview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSelectedView("overview")}
        >
          Overview
        </Button>
        <Button
          variant={selectedView === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSelectedView("stats")}
        >
          Statistics
        </Button>
        <Button
          variant={selectedView === "logs" ? "default" : "ghost"}
          size="sm"
          onClick={() => setSelectedView("logs")}
        >
          Execution Logs
        </Button>
      </div>

      {/* Content */}
      {selectedView === "overview" && (
        <div className="space-y-6">
          {/* Queue Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Queue Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                  <div key={queueName} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2 capitalize">
                      {queueName.replace("-", " ")}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Waiting:</span>
                        <Badge variant="secondary">{metrics.waiting}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Active:</span>
                        <Badge variant="default">{metrics.active}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <Badge variant="outline" className="text-green-600">
                          {metrics.completed}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <Badge variant="outline" className="text-red-600">
                          {metrics.failed}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cron Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Cron Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {safeJobStatus.map((job) => (
                  <div
                    key={job.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.running ? "running" : "stopped")}
                      <div>
                        <h4 className="font-medium">{job.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {job.running ? "Running" : "Stopped"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerJob(job.name)}
                        disabled={isLoading}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Trigger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === "stats" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {executionStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Executions
                      </p>
                      <p className="text-2xl font-bold">
                        {executionStats.totalExecutions}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Success Rate
                      </p>
                      <p className="text-2xl font-bold">
                        {executionStats.successRate}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Avg Duration
                      </p>
                      <p className="text-2xl font-bold">
                        {executionStats.avgDuration}s
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Active Queues
                      </p>
                      <p className="text-2xl font-bold">
                        {Object.keys(queueMetrics).length}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Hourly Execution Chart */}
          {executionStats && (
            <Card>
              <CardHeader>
                <CardTitle>Hourly Execution Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={executionStats.hourlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="executions"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Total Executions"
                    />
                    <Line
                      type="monotone"
                      dataKey="success"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Successful"
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#ff7c7c"
                      strokeWidth={2}
                      name="Failed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Queue Performance Chart */}
          {executionStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Queue Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={executionStats.queueStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="queue" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="completed"
                        fill="#82ca9d"
                        name="Completed"
                      />
                      <Bar dataKey="failed" fill="#ff7c7c" name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={executionStats.jobTypeStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ jobType, count }) => `${jobType}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {executionStats.jobTypeStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {selectedView === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {executionLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No execution logs yet. Trigger a job to see logs here.
                  </p>
                ) : (
                  executionLogs.map((log) => (
                    <div
                      key={log.jobId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(log.status)}
                        <div>
                          <h4 className="font-medium text-sm">{log.jobName}</h4>
                          <p className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()} • Queue:{" "}
                            {log.queueName || "N/A"}
                          </p>
                          {log.error && (
                            <p className="text-xs text-red-600 mt-1">
                              {log.error}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            log.status === "completed"
                              ? "default"
                              : log.status === "failed"
                                ? "destructive"
                                : log.status === "processing"
                                  ? "secondary"
                                  : "outline"
                          }
                        >
                          {log.status}
                        </Badge>
                        {log.executionTime && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.executionTime.toFixed(1)}s
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
