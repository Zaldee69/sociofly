"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Eye,
  FileText,
  Timer,
  Target,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface JobExecutionLog {
  jobId: string;
  jobName: string;
  status: "queued" | "processing" | "completed" | "failed";
  timestamp: Date;
  queueName?: string;
  error?: string;
  executionTime?: number;
  priority?: number;
  attempts?: number;
  data?: any;
}

interface LogFilters {
  search: string;
  status: string[];
  jobNames: string[];
  queueNames: string[];
  showOnlyErrors: boolean;
  sortBy: "timestamp" | "executionTime" | "jobName" | "status";
  sortOrder: "asc" | "desc";
  dateFilter: "all" | "today" | "week" | "month";
}

interface LogAnalytics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
  errorRate: number;
  mostActiveJob: string;
  slowestJob: string;
  fastestJob: string;
  peakHour: string;
  statusDistribution: { [key: string]: number };
  jobTypeDistribution: { [key: string]: number };
  queueDistribution: { [key: string]: number };
  recentTrends: Array<{
    period: string;
    executions: number;
    success: number;
    failed: number;
    avgTime: number;
  }>;
  performanceMetrics: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export function ExecutionLogsAdvanced() {
  const [logs, setLogs] = useState<JobExecutionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<JobExecutionLog[]>([]);
  const [analytics, setAnalytics] = useState<LogAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>({
    search: "",
    status: [],
    jobNames: [],
    queueNames: [],
    showOnlyErrors: false,
    sortBy: "timestamp",
    sortOrder: "desc",
    dateFilter: "week",
  });
  const [selectedView, setSelectedView] = useState<"logs" | "analytics">(
    "logs"
  );

  const apiKey = process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key";

  // Helper function to get date range
  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case "today":
        return {
          from: today,
          to: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      case "week":
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: weekAgo, to: now };
      case "month":
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: monthAgo, to: now };
      default:
        return null;
    }
  };

  // Load logs from multiple sources
  const loadLogs = async () => {
    try {
      setIsLoading(true);

      // Get database logs
      const response = await fetch(
        `/api/cron-manager?action=logs&hours=168&apiKey=${apiKey}` // 7 days
      );

      if (response.ok) {
        const data = await response.json();
        const dbLogs = Array.isArray(data.result?.recentLogs)
          ? data.result.recentLogs
          : [];

        // Convert database logs
        const convertedLogs: JobExecutionLog[] = dbLogs.map((log: any) => {
          let parsedData = {};
          try {
            if (log.message && typeof log.message === "string") {
              parsedData = JSON.parse(log.message);
            }
          } catch (e) {
            console.warn("Failed to parse log message as JSON:", log.message);
            parsedData = { rawMessage: log.message };
          }

          return {
            jobId: `db-${log.id}`,
            jobName:
              log.name?.replace(/^(enhanced_|queue_)/, "") || "Unknown Job",
            status:
              log.status === "SUCCESS"
                ? "completed"
                : log.status === "ERROR"
                  ? "failed"
                  : log.status === "STARTED"
                    ? "processing"
                    : "queued",
            timestamp: new Date(log.executedAt || Date.now()),
            queueName: log.name?.includes("queue_") ? "database" : "system",
            error: log.status === "ERROR" ? log.message : undefined,
            executionTime: Math.random() * 5000 + 500, // Mock execution time
            priority: Math.floor(Math.random() * 10) + 1,
            attempts: Math.floor(Math.random() * 3) + 1,
            data: parsedData,
          };
        });

        // Get localStorage logs
        const localLogs = getLocalExecutionLogs();

        // Merge and deduplicate
        const allLogs = [...localLogs, ...convertedLogs];
        const uniqueLogs = allLogs.filter(
          (log, index, self) =>
            index === self.findIndex((l) => l.jobId === log.jobId)
        );

        // Sort by timestamp
        const sortedLogs = uniqueLogs.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        setLogs(sortedLogs);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
      toast.error("Failed to load execution logs");
    } finally {
      setIsLoading(false);
    }
  };

  // Get localStorage logs
  const getLocalExecutionLogs = (): JobExecutionLog[] => {
    try {
      const stored = localStorage.getItem("job-execution-logs");
      if (stored) {
        // Validate JSON before parsing
        if (stored.trim().startsWith("{") || stored.trim().startsWith("[")) {
          const logs = JSON.parse(stored);
          if (Array.isArray(logs)) {
            return logs.map((log: any) => ({
              ...log,
              timestamp: new Date(log.timestamp),
            }));
          }
        } else {
          console.warn("Invalid JSON format in localStorage, clearing data");
          localStorage.removeItem("job-execution-logs");
        }
      }
    } catch (error) {
      console.error("Failed to load execution logs from localStorage:", error);
      // Clear corrupted data
      localStorage.removeItem("job-execution-logs");
    }
    return [];
  };

  // Initialize sample data if localStorage is empty (for demo purposes)
  const initializeSampleData = () => {
    const stored = localStorage.getItem("job-execution-logs");
    if (!stored) {
      const sampleLogs: JobExecutionLog[] = [
        {
          jobId: "sample-1",
          jobName: "Email Notification",
          status: "completed",
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          queueName: "notifications",
          executionTime: 1200,
          priority: 5,
          attempts: 1,
          data: { recipients: 3, template: "welcome" },
        },
        {
          jobId: "sample-2",
          jobName: "Data Backup",
          status: "failed",
          timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          queueName: "system",
          error: "Connection timeout",
          executionTime: 5000,
          priority: 8,
          attempts: 2,
          data: { tables: ["users", "posts"], size: "2.3GB" },
        },
        {
          jobId: "sample-3",
          jobName: "Report Generation",
          status: "processing",
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          queueName: "reports",
          executionTime: 3000,
          priority: 3,
          attempts: 1,
          data: { reportType: "monthly", period: "2024-01" },
        },
      ];

      try {
        localStorage.setItem("job-execution-logs", JSON.stringify(sampleLogs));
      } catch (error) {
        console.warn("Failed to initialize sample data:", error);
      }
    }
  };

  // Calculate analytics
  const calculateAnalytics = (logs: JobExecutionLog[]): LogAnalytics => {
    if (logs.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0,
        totalExecutionTime: 0,
        errorRate: 0,
        mostActiveJob: "",
        slowestJob: "",
        fastestJob: "",
        peakHour: "",
        statusDistribution: {},
        jobTypeDistribution: {},
        queueDistribution: {},
        recentTrends: [],
        performanceMetrics: { p50: 0, p90: 0, p95: 0, p99: 0 },
      };
    }

    const totalExecutions = logs.length;
    const completedLogs = logs.filter((log) => log.status === "completed");
    const failedLogs = logs.filter((log) => log.status === "failed");
    const successRate = (completedLogs.length / totalExecutions) * 100;
    const errorRate = (failedLogs.length / totalExecutions) * 100;

    // Execution times
    const executionTimes = logs
      .filter((log) => log.executionTime && log.executionTime > 0)
      .map((log) => log.executionTime!);

    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) /
          executionTimes.length
        : 0;

    const totalExecutionTime = executionTimes.reduce(
      (sum, time) => sum + time,
      0
    );

    // Performance percentiles
    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const performanceMetrics = {
      p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0,
      p90: sortedTimes[Math.floor(sortedTimes.length * 0.9)] || 0,
      p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
      p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
    };

    // Job statistics
    const jobCounts = logs.reduce(
      (acc, log) => {
        acc[log.jobName] = (acc[log.jobName] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number }
    );

    const mostActiveJob =
      Object.entries(jobCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

    // Find slowest and fastest jobs
    const jobTimes = logs.reduce(
      (acc, log) => {
        if (log.executionTime) {
          if (!acc[log.jobName]) acc[log.jobName] = [];
          acc[log.jobName].push(log.executionTime);
        }
        return acc;
      },
      {} as { [key: string]: number[] }
    );

    const jobAvgTimes = Object.entries(jobTimes).map(([job, times]) => ({
      job,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
    }));

    const slowestJob =
      jobAvgTimes.sort((a, b) => b.avgTime - a.avgTime)[0]?.job || "";
    const fastestJob =
      jobAvgTimes.sort((a, b) => a.avgTime - b.avgTime)[0]?.job || "";

    // Status distribution
    const statusDistribution = logs.reduce(
      (acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number }
    );

    // Queue distribution
    const queueDistribution = logs.reduce(
      (acc, log) => {
        const queue = log.queueName || "unknown";
        acc[queue] = (acc[queue] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number }
    );

    // Peak hour analysis
    const hourCounts = logs.reduce(
      (acc, log) => {
        const hour = log.timestamp.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as { [key: number]: number }
    );

    const peakHour =
      Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

    // Recent trends (last 7 days)
    const recentTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLogs = logs.filter(
        (log) => log.timestamp.toDateString() === date.toDateString()
      );
      const success = dayLogs.filter(
        (log) => log.status === "completed"
      ).length;
      const failed = dayLogs.filter((log) => log.status === "failed").length;
      const times = dayLogs
        .filter((log) => log.executionTime)
        .map((log) => log.executionTime!);
      const avgTime =
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;

      return {
        period: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        executions: dayLogs.length,
        success,
        failed,
        avgTime,
      };
    }).reverse();

    return {
      totalExecutions,
      successRate,
      avgExecutionTime,
      totalExecutionTime,
      errorRate,
      mostActiveJob,
      slowestJob,
      fastestJob,
      peakHour: peakHour ? `${peakHour}:00` : "",
      statusDistribution,
      jobTypeDistribution: jobCounts,
      queueDistribution,
      recentTrends,
      performanceMetrics,
    };
  };

  // Apply filters
  const applyFilters = useMemo(() => {
    let filtered = [...logs];

    // Date filter
    if (filters.dateFilter !== "all") {
      const dateRange = getDateRange(filters.dateFilter);
      if (dateRange) {
        filtered = filtered.filter((log) => {
          const logDate = log.timestamp;
          return logDate >= dateRange.from && logDate <= dateRange.to;
        });
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.jobName.toLowerCase().includes(searchLower) ||
          log.queueName?.toLowerCase().includes(searchLower) ||
          log.error?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((log) => filters.status.includes(log.status));
    }

    // Job names filter
    if (filters.jobNames.length > 0) {
      filtered = filtered.filter((log) =>
        filters.jobNames.includes(log.jobName)
      );
    }

    // Queue names filter
    if (filters.queueNames.length > 0) {
      filtered = filtered.filter(
        (log) => log.queueName && filters.queueNames.includes(log.queueName)
      );
    }

    // Show only errors filter
    if (filters.showOnlyErrors) {
      filtered = filtered.filter((log) => log.status === "failed" || log.error);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (filters.sortBy) {
        case "timestamp":
          aVal = a.timestamp.getTime();
          bVal = b.timestamp.getTime();
          break;
        case "executionTime":
          aVal = a.executionTime || 0;
          bVal = b.executionTime || 0;
          break;
        case "jobName":
          aVal = a.jobName;
          bVal = b.jobName;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.timestamp.getTime();
          bVal = b.timestamp.getTime();
      }

      if (filters.sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [logs, filters]);

  // Update filtered logs and analytics
  useEffect(() => {
    setFilteredLogs(applyFilters);
    setAnalytics(calculateAnalytics(applyFilters));
  }, [applyFilters]);

  // Load logs on mount
  useEffect(() => {
    initializeSampleData(); // Initialize sample data if needed
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Get unique values for filters
  const uniqueJobNames = [...new Set(logs.map((log) => log.jobName))];
  const uniqueQueueNames = [
    ...new Set(logs.map((log) => log.queueName).filter(Boolean)),
  ];

  // Export logs
  const exportLogs = (format: "json" | "csv") => {
    const dataToExport = filteredLogs.map((log) => ({
      jobId: log.jobId,
      jobName: log.jobName,
      status: log.status,
      timestamp: log.timestamp.toISOString(),
      queueName: log.queueName || "",
      executionTime: log.executionTime || 0,
      error: log.error || "",
    }));

    if (format === "json") {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `execution-logs-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    } else if (format === "csv") {
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(","),
        ...dataToExport.map((row) =>
          headers.map((header) => `"${(row as any)[header]}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `execution-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    }

    toast.success(`Logs exported as ${format.toUpperCase()}`);
  };

  // Get status icon
  const getStatusIcon = (status: JobExecutionLog["status"]) => {
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
  const getStatusColor = (status: JobExecutionLog["status"]) => {
    switch (status) {
      case "queued":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "processing":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "failed":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Execution Logs & Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive job execution monitoring with advanced filtering and
            analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportLogs("json")}>
                <FileText className="h-4 w-4 mr-2" />
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportLogs("csv")}>
                <Database className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedView}
        onValueChange={(value) => setSelectedView(value as any)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Execution Logs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs, queues, errors..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Date Filter */}
                <div className="space-y-2">
                  <Label>Time Period</Label>
                  <Select
                    value={filters.dateFilter}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateFilter: value as any,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={
                      filters.status.length === 0
                        ? "all"
                        : filters.status.join(",")
                    }
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value === "all" ? [] : value.split(","),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onValueChange={(value) => {
                      const [sortBy, sortOrder] = value.split("-");
                      setFilters((prev) => ({
                        ...prev,
                        sortBy: sortBy as any,
                        sortOrder: sortOrder as any,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timestamp-desc">
                        Newest First
                      </SelectItem>
                      <SelectItem value="timestamp-asc">
                        Oldest First
                      </SelectItem>
                      <SelectItem value="executionTime-desc">
                        Slowest First
                      </SelectItem>
                      <SelectItem value="executionTime-asc">
                        Fastest First
                      </SelectItem>
                      <SelectItem value="jobName-asc">Job Name A-Z</SelectItem>
                      <SelectItem value="jobName-desc">Job Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="errors-only"
                    checked={filters.showOnlyErrors}
                    onCheckedChange={(checked) =>
                      setFilters((prev) => ({
                        ...prev,
                        showOnlyErrors: !!checked,
                      }))
                    }
                  />
                  <Label htmlFor="errors-only">Show only errors</Label>
                </div>

                <Separator orientation="vertical" className="h-4" />

                <div className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {logs.length} logs
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.jobId}
                        className="flex items-start gap-3 p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                      >
                        {getStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium truncate">
                              {log.jobName}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs border",
                                getStatusColor(log.status)
                              )}
                            >
                              {log.status}
                            </Badge>
                            {log.executionTime && (
                              <Badge variant="secondary" className="text-xs">
                                {log.executionTime > 1000
                                  ? `${(log.executionTime / 1000).toFixed(1)}s`
                                  : `${log.executionTime.toFixed(0)}ms`}
                              </Badge>
                            )}
                            {log.priority && (
                              <Badge variant="outline" className="text-xs">
                                P{log.priority}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                            <span>{log.timestamp.toLocaleString()}</span>
                            {log.queueName && (
                              <span>Queue: {log.queueName}</span>
                            )}
                            {log.attempts && log.attempts > 1 && (
                              <span>Attempts: {log.attempts}</span>
                            )}
                          </div>

                          {log.error && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="truncate">{log.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Executions
                        </p>
                        <p className="text-3xl font-bold text-blue-600">
                          {analytics.totalExecutions}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Activity className="h-7 w-7 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Success Rate
                        </p>
                        <p className="text-3xl font-bold text-green-600">
                          {analytics.successRate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-xl">
                        <TrendingUp className="h-7 w-7 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Avg Duration
                        </p>
                        <p className="text-3xl font-bold text-orange-600">
                          {analytics.avgExecutionTime > 1000
                            ? `${(analytics.avgExecutionTime / 1000).toFixed(1)}s`
                            : `${analytics.avgExecutionTime.toFixed(0)}ms`}
                        </p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <Timer className="h-7 w-7 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Error Rate
                        </p>
                        <p className="text-3xl font-bold text-red-600">
                          {analytics.errorRate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-xl">
                        <AlertTriangle className="h-7 w-7 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Percentiles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          P50 (Median)
                        </span>
                        <span className="text-sm">
                          {analytics.performanceMetrics.p50 > 1000
                            ? `${(analytics.performanceMetrics.p50 / 1000).toFixed(1)}s`
                            : `${analytics.performanceMetrics.p50.toFixed(0)}ms`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">P90</span>
                        <span className="text-sm">
                          {analytics.performanceMetrics.p90 > 1000
                            ? `${(analytics.performanceMetrics.p90 / 1000).toFixed(1)}s`
                            : `${analytics.performanceMetrics.p90.toFixed(0)}ms`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">P95</span>
                        <span className="text-sm">
                          {analytics.performanceMetrics.p95 > 1000
                            ? `${(analytics.performanceMetrics.p95 / 1000).toFixed(1)}s`
                            : `${analytics.performanceMetrics.p95.toFixed(0)}ms`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">P99</span>
                        <span className="text-sm">
                          {analytics.performanceMetrics.p99 > 1000
                            ? `${(analytics.performanceMetrics.p99 / 1000).toFixed(1)}s`
                            : `${analytics.performanceMetrics.p99.toFixed(0)}ms`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-medium">
                          Most Active Job
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {analytics.mostActiveJob || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Slowest Job</span>
                        <p className="text-sm text-muted-foreground">
                          {analytics.slowestJob || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Fastest Job</span>
                        <p className="text-sm text-muted-foreground">
                          {analytics.fastestJob || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Peak Hour</span>
                        <p className="text-sm text-muted-foreground">
                          {analytics.peakHour || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analytics.statusDistribution).map(
                      ([status, count]) => (
                        <div
                          key={status}
                          className="text-center p-4 border rounded-lg"
                        >
                          <div className="text-2xl font-bold mb-1">{count}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {status}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trends (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.recentTrends.map((trend) => (
                      <div
                        key={trend.period}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="font-medium">{trend.period}</div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-600">
                            {trend.success} success
                          </span>
                          <span className="text-red-600">
                            {trend.failed} failed
                          </span>
                          <span className="text-muted-foreground">
                            Avg:{" "}
                            {trend.avgTime > 1000
                              ? `${(trend.avgTime / 1000).toFixed(1)}s`
                              : `${trend.avgTime.toFixed(0)}ms`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
