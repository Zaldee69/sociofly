"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  Trash2,
  Minimize2,
  Maximize2,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobExecution {
  id: string;
  jobName: string;
  status: "queued" | "processing" | "completed" | "failed";
  timestamp: Date;
  message?: string;
  executionTime?: number;
  jobId?: string;
  queueName?: string;
  error?: string;
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

interface JobStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  queued: number;
  successRate: number;
  avgExecutionTime: number;
}

export function JobExecutionMonitor() {
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics>({});
  const [lastMetrics, setLastMetrics] = useState<QueueMetrics>({});
  const [jobStats, setJobStats] = useState<JobStats>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    queued: 0,
    successRate: 0,
    avgExecutionTime: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key";

  // Calculate job statistics
  const calculateStats = (executions: JobExecution[]): JobStats => {
    const total = executions.length;
    const completed = executions.filter((e) => e.status === "completed").length;
    const failed = executions.filter((e) => e.status === "failed").length;
    const processing = executions.filter(
      (e) => e.status === "processing"
    ).length;
    const queued = executions.filter((e) => e.status === "queued").length;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    const executionTimes = executions
      .filter((e) => e.executionTime && e.executionTime > 0)
      .map((e) => e.executionTime!);
    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) /
          executionTimes.length
        : 0;

    return {
      total,
      completed,
      failed,
      processing,
      queued,
      successRate,
      avgExecutionTime,
    };
  };

  // Update stats whenever executions change
  useEffect(() => {
    setJobStats(calculateStats(executions));
  }, [executions]);

  // Add execution log
  const addExecution = (execution: Omit<JobExecution, "id" | "timestamp">) => {
    const newExecution: JobExecution = {
      ...execution,
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setExecutions((prev) => [newExecution, ...prev.slice(0, 99)]); // Keep last 100
    return newExecution.id;
  };

  // Update execution status
  const updateExecution = (id: string, updates: Partial<JobExecution>) => {
    setExecutions((prev) =>
      prev.map((exec) =>
        exec.id === id ? { ...exec, ...updates, timestamp: new Date() } : exec
      )
    );
  };

  // Fetch queue metrics
  const fetchQueueMetrics = async (): Promise<QueueMetrics | null> => {
    try {
      const response = await fetch(
        `/api/cron-manager?action=queue_metrics&apiKey=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.result;
      }
      return null;
    } catch (error) {
      console.error("Error fetching queue metrics:", error);
      return null;
    }
  };

  // Monitor queue changes
  const monitorQueueChanges = async () => {
    if (!isMonitoring) return;

    const currentMetrics = await fetchQueueMetrics();
    if (!currentMetrics) return;

    // Compare with previous metrics to detect job completions
    for (const [queueName, metrics] of Object.entries(currentMetrics)) {
      const prevMetrics = lastMetrics[queueName];
      if (!prevMetrics) continue;

      // Check for completed jobs
      if (metrics.completed > prevMetrics.completed) {
        const completedCount = metrics.completed - prevMetrics.completed;
        addExecution({
          jobName: `${queueName}_job`,
          status: "completed",
          message: `${completedCount} job(s) completed in ${queueName} queue`,
          queueName,
          executionTime: Math.random() * 5000 + 1000, // Mock execution time
        });
      }

      // Check for failed jobs
      if (metrics.failed > prevMetrics.failed) {
        const failedCount = metrics.failed - prevMetrics.failed;
        addExecution({
          jobName: `${queueName}_job`,
          status: "failed",
          message: `${failedCount} job(s) failed in ${queueName} queue`,
          queueName,
          error: "Job execution failed",
        });
      }

      // Check for active jobs
      if (metrics.active > prevMetrics.active) {
        const activeCount = metrics.active - prevMetrics.active;
        addExecution({
          jobName: `${queueName}_job`,
          status: "processing",
          message: `${activeCount} job(s) started processing in ${queueName} queue`,
          queueName,
        });
      }
    }

    setQueueMetrics(currentMetrics);
    setLastMetrics(currentMetrics);
  };

  // Start/stop monitoring
  const toggleMonitoring = async () => {
    if (isMonitoring) {
      // Stop monitoring
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsMonitoring(false);
      addExecution({
        jobName: "monitor",
        status: "completed",
        message: "Stopped real-time job monitoring",
      });
    } else {
      // Start monitoring
      const initialMetrics = await fetchQueueMetrics();
      if (initialMetrics) {
        setQueueMetrics(initialMetrics);
        setLastMetrics(initialMetrics);
        setIsMonitoring(true);

        // Start polling every 2 seconds
        intervalRef.current = setInterval(monitorQueueChanges, 2000);

        addExecution({
          jobName: "monitor",
          status: "processing",
          message: "Started real-time job monitoring",
        });
      }
    }
  };

  // Clear execution logs
  const clearExecutions = () => {
    setExecutions([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Get status icon
  const getStatusIcon = (status: JobExecution["status"]) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = (status: JobExecution["status"]) => {
    switch (status) {
      case "queued":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300";
      case "processing":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300";
      case "completed":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  // Expose method to add manual execution logs
  useEffect(() => {
    // Make this component accessible globally for manual trigger feedback
    (window as any).jobExecutionMonitor = {
      addExecution,
      updateExecution,
    };

    return () => {
      delete (window as any).jobExecutionMonitor;
    };
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          className="shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
        >
          <Activity className="h-4 w-4 mr-2" />
          Job Monitor
          {executions.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-white text-blue-600">
              {executions.length}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        isExpanded ? "w-96" : "w-80"
      )}
    >
      <Card className="shadow-2xl border-2 bg-white/95 backdrop-blur-sm dark:bg-gray-900/95">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Job Execution Monitor
              {isMonitoring && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">
                    Live
                  </span>
                </div>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={toggleMonitoring}
                size="sm"
                variant={isMonitoring ? "destructive" : "default"}
                className="h-6 px-2"
              >
                {isMonitoring ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
              {executions.length > 0 && (
                <Button
                  onClick={clearExecutions}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              <Button
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Statistics Bar */}
          {isExpanded && executions.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2 bg-blue-50 rounded-lg dark:bg-blue-950">
                <div className="font-semibold text-blue-700 dark:text-blue-300">
                  {jobStats.total}
                </div>
                <div className="text-blue-600 dark:text-blue-400">Total</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg dark:bg-green-950">
                <div className="font-semibold text-green-700 dark:text-green-300">
                  {jobStats.completed}
                </div>
                <div className="text-green-600 dark:text-green-400">
                  Success
                </div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg dark:bg-red-950">
                <div className="font-semibold text-red-700 dark:text-red-300">
                  {jobStats.failed}
                </div>
                <div className="text-red-600 dark:text-red-400">Failed</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg dark:bg-purple-950">
                <div className="font-semibold text-purple-700 dark:text-purple-300">
                  {jobStats.successRate.toFixed(0)}%
                </div>
                <div className="text-purple-600 dark:text-purple-400">Rate</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No job executions yet</p>
              <p className="text-xs">
                {isMonitoring
                  ? "Monitoring for job activity..."
                  : "Click the eye icon to start monitoring"}
              </p>
            </div>
          ) : (
            <ScrollArea
              className={cn(
                "transition-all duration-300",
                isExpanded ? "h-80" : "h-48"
              )}
            >
              <div className="space-y-2">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 text-sm hover:bg-card/80 transition-colors"
                  >
                    {getStatusIcon(execution.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {execution.jobName}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs border",
                            getStatusColor(execution.status)
                          )}
                        >
                          {execution.status}
                        </Badge>
                        {execution.executionTime && (
                          <Badge variant="secondary" className="text-xs">
                            {execution.executionTime > 1000
                              ? `${(execution.executionTime / 1000).toFixed(1)}s`
                              : `${execution.executionTime.toFixed(0)}ms`}
                          </Badge>
                        )}
                      </div>
                      {execution.message && (
                        <p className="text-muted-foreground text-xs mb-1">
                          {execution.message}
                        </p>
                      )}
                      {execution.error && (
                        <p className="text-red-600 text-xs mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {execution.error}
                        </p>
                      )}
                      {execution.queueName && (
                        <p className="text-muted-foreground text-xs">
                          Queue: {execution.queueName}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {execution.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
