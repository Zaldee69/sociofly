"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  RefreshCw,
  Download,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  FileText,
  Database,
  AlertTriangle,
  ArrowLeft,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
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

export function ExecutionLogsAdvanced() {
  const [logs, setLogs] = useState<JobExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(10000); // Start with 10 seconds
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Load logs from multiple sources with optimized loading states
  const loadLogs = async (isManualRefresh = false) => {
    try {
      // Use different loading states for manual vs auto refresh
      if (isManualRefresh) {
        setIsLoading(true);
      } else {
        setIsBackgroundLoading(true);
      }

      // Get database logs
      const response = await fetch(
        `/api/queue-status?action=logs&hours=168&apiKey=${apiKey}` // 7 days
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

        // Only update if data actually changed (prevent unnecessary re-renders)
        setLogs((prevLogs) => {
          const hasChanged =
            JSON.stringify(prevLogs.map((l) => l.jobId)) !==
            JSON.stringify(sortedLogs.map((l) => l.jobId));

          if (hasChanged) {
            return sortedLogs;
          }
          return prevLogs;
        });

        setLastUpdate(new Date());

        // Update localStorage with new data (only if changed)
        try {
          const existingLocal = getLocalExecutionLogs();
          const newLocalLogs = [...existingLocal];

          // Add new database logs to localStorage (avoid duplicates)
          convertedLogs.forEach((dbLog) => {
            const exists = newLocalLogs.some(
              (localLog) => localLog.jobId === dbLog.jobId
            );
            if (!exists) {
              newLocalLogs.push(dbLog);
            }
          });

          // Keep only recent logs (last 1000 entries)
          const recentLogs = newLocalLogs
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 1000);

          localStorage.setItem(
            "job-execution-logs",
            JSON.stringify(recentLogs)
          );
        } catch (error) {
          console.warn("Failed to update localStorage:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
      if (isManualRefresh) {
        toast.error("Failed to load execution logs");
      }
    } finally {
      setIsLoading(false);
      setIsBackgroundLoading(false);
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

  // Simulate new log entries for real-time demo
  const simulateNewLogs = () => {
    const jobNames = [
      "Email Notification",
      "Data Backup",
      "Report Generation",
      "Image Processing",
      "Database Cleanup",
      "Cache Refresh",
      "User Sync",
      "Analytics Update",
      "File Upload",
      "API Sync",
    ];

    const statuses: JobExecutionLog["status"][] = [
      "completed",
      "failed",
      "processing",
      "queued",
    ];
    const queueNames = [
      "notifications",
      "system",
      "reports",
      "media",
      "database",
    ];

    const newLog: JobExecutionLog = {
      jobId: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobName: jobNames[Math.floor(Math.random() * jobNames.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(),
      queueName: queueNames[Math.floor(Math.random() * queueNames.length)],
      executionTime: Math.floor(Math.random() * 5000) + 100,
      priority: Math.floor(Math.random() * 10) + 1,
      attempts: Math.floor(Math.random() * 3) + 1,
      error: Math.random() < 0.3 ? "Random error for demo" : undefined,
      data: { demo: true, timestamp: Date.now() },
    };

    // Add to current logs
    setLogs((prevLogs) => {
      const updatedLogs = [newLog, ...prevLogs].slice(0, 1000); // Keep last 1000

      // Update localStorage
      try {
        localStorage.setItem("job-execution-logs", JSON.stringify(updatedLogs));
      } catch (error) {
        console.warn("Failed to update localStorage with new log:", error);
      }

      return updatedLogs;
    });

    setLastUpdate(new Date());
    setNewLogsCount((prev) => prev + 1);

    // Show subtle toast notification for new log (less intrusive)
    toast.success(`${newLog.jobName} - ${newLog.status}`, {
      duration: 2000,
      position: "bottom-right",
    });
  };

  // Apply filters with memoization
  const applyFilters = useCallback(() => {
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

  // Get filtered logs with memoization
  const filteredLogs = useMemo(() => applyFilters(), [applyFilters]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Load logs on mount and set up optimized real-time updates
  useEffect(() => {
    initializeSampleData(); // Initialize sample data if needed
    loadLogs(true); // Initial load with loading state

    // Set up adaptive auto-refresh
    let interval: NodeJS.Timeout;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        loadLogs(false); // Background refresh without loading state
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefresh, refreshInterval]);

  // Add visibility change listener for real-time updates when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAutoRefresh) {
        loadLogs(false); // Background refresh when tab becomes visible
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isAutoRefresh]);

  // Simulate new logs periodically for demo (remove in production)
  useEffect(() => {
    if (isAutoRefresh && refreshInterval <= 10000) {
      // Only simulate if refresh is frequent
      const simulationInterval = setInterval(() => {
        // 20% chance to add a new log every 20 seconds (less frequent)
        if (Math.random() < 0.2) {
          simulateNewLogs();
        }
      }, 20000);

      return () => clearInterval(simulationInterval);
    }
  }, [isAutoRefresh, refreshInterval]);

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
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
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
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Activity className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Execution Logs
              </h1>
              <p className="text-gray-600">
                Real-time job execution monitoring and analytics
              </p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <Card className="lg:w-auto w-full border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Live Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isAutoRefresh
                      ? isBackgroundLoading
                        ? "bg-blue-500 animate-pulse shadow-lg shadow-blue-500/50"
                        : "bg-green-500 shadow-lg shadow-green-500/50"
                      : "bg-gray-400"
                  }`}
                />
                <span className="font-semibold text-gray-700">
                  {isAutoRefresh ? "Live" : "Paused"}
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-700"
                >
                  {refreshInterval / 1000}s
                </Badge>
              </div>

              {/* Last Update */}
              {lastUpdate && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* New Logs Counter */}
              {newLogsCount > 0 && (
                <Badge className="bg-blue-500 hover:bg-blue-600 animate-bounce shadow-sm">
                  +{newLogsCount} new
                </Badge>
              )}

              {/* Sync Indicator */}
              {isBackgroundLoading && (
                <div className="flex items-center gap-1 text-blue-600">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Syncing</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Refresh Interval */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium hidden sm:block">
                  Interval:
                </Label>
                <Select
                  value={refreshInterval.toString()}
                  onValueChange={(value) => setRefreshInterval(parseInt(value))}
                >
                  <SelectTrigger className="w-16 sm:w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5000">5s</SelectItem>
                    <SelectItem value="10000">10s</SelectItem>
                    <SelectItem value="30000">30s</SelectItem>
                    <SelectItem value="60000">1m</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Live Controls */}
              <Button
                variant={isAutoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={
                  isAutoRefresh
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "border-green-200 text-green-700 hover:bg-green-50"
                }
              >
                {isAutoRefresh ? (
                  <>
                    <div className="w-2 h-2 bg-white rounded-full mr-2" />
                    <span className="hidden sm:inline">Live</span>
                    <span className="sm:hidden">●</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                    <span className="hidden sm:inline">Paused</span>
                    <span className="sm:hidden">⏸</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Manual Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadLogs(true);
                  setNewLogsCount(0);
                }}
                disabled={isLoading}
                className="hover:bg-blue-50 hover:border-blue-200"
              >
                <RefreshCw
                  className={`h-4 w-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              {/* Test Log */}
              <Button
                variant="outline"
                size="sm"
                onClick={simulateNewLogs}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full sm:mr-2" />
                <span className="hidden sm:inline">Add Test</span>
              </Button>

              {/* Export */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {logs.filter((log) => log.status === "completed").length}
                </p>
                <p className="text-xs text-green-600 font-medium">Completed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg shadow-sm">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">
                  {logs.filter((log) => log.status === "failed").length}
                </p>
                <p className="text-xs text-red-600 font-medium">Failed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg shadow-sm">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">
                  {logs.filter((log) => log.status === "processing").length}
                </p>
                <p className="text-xs text-yellow-600 font-medium">
                  Processing
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shadow-sm">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {logs.length}
                </p>
                <p className="text-xs text-blue-600 font-medium">Total</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-blue-600" />
              Filters & Search
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length} of {logs.length} logs
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, queues, errors..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                }))
              }
              className="pl-10 h-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Time Period */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Time Period
              </Label>
              <Select
                value={filters.dateFilter}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateFilter: value as any,
                  }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Status
              </Label>
              <Select
                value={
                  filters.status.length === 0 ? "all" : filters.status.join(",")
                }
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value === "all" ? [] : value.split(","),
                  }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="failed">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Failed
                    </div>
                  </SelectItem>
                  <SelectItem value="processing">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Processing
                    </div>
                  </SelectItem>
                  <SelectItem value="queued">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Queued
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Sort By
              </Label>
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
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp-desc">Newest First</SelectItem>
                  <SelectItem value="timestamp-asc">Oldest First</SelectItem>
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

            {/* Error Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Filter
              </Label>
              <div className="flex items-center h-9 px-3 border rounded-md bg-gray-50/50">
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
                <Label
                  htmlFor="errors-only"
                  className="ml-2 text-sm cursor-pointer"
                >
                  Errors only
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-gray-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              Execution Logs
            </CardTitle>
            {filteredLogs.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Latest:</span>
                <span className="font-mono text-xs">
                  {filteredLogs[0]?.timestamp.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-muted-foreground">
                  Loading execution logs...
                </p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                No logs found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your filters or time period
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    search: "",
                    status: [],
                    jobNames: [],
                    queueNames: [],
                    showOnlyErrors: false,
                    sortBy: "timestamp",
                    sortOrder: "desc",
                    dateFilter: "week",
                  });
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedLogs.map((log, index) => {
                  const isNewLog =
                    log.jobId.startsWith("live-") &&
                    new Date().getTime() - log.timestamp.getTime() < 15000;

                  return (
                    <div
                      key={log.jobId}
                      className={`group relative p-4 hover:bg-gray-50/80 transition-all duration-200 ${
                        isNewLog
                          ? "bg-blue-50/60 border-l-4 border-l-blue-400"
                          : index === 0
                            ? "bg-gray-50/30"
                            : ""
                      }`}
                    >
                      {/* New Log Indicator */}
                      {isNewLog && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-blue-500 text-white text-xs animate-pulse">
                            NEW
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(log.status)}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {log.jobName}
                              </h4>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs font-medium flex-shrink-0",
                                  getStatusColor(log.status)
                                )}
                              >
                                {log.status}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {log.executionTime && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-gray-100 text-gray-700"
                                >
                                  {log.executionTime > 1000
                                    ? `${(log.executionTime / 1000).toFixed(1)}s`
                                    : `${log.executionTime.toFixed(0)}ms`}
                                </Badge>
                              )}
                              {log.priority && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-300"
                                >
                                  P{log.priority}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Metadata Row */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              <span className="font-mono">
                                {log.timestamp.toLocaleString()}
                              </span>
                            </div>
                            {log.queueName && (
                              <div className="flex items-center gap-1">
                                <Database className="h-3 w-3 flex-shrink-0" />
                                <span>{log.queueName}</span>
                              </div>
                            )}
                            {log.attempts && log.attempts > 1 && (
                              <div className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3 flex-shrink-0" />
                                <span>{log.attempts} attempts</span>
                              </div>
                            )}
                          </div>

                          {/* Error Message */}
                          {log.error && (
                            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                              <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-red-700 break-words">
                                {log.error}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
        
        {/* Pagination */}
        {filteredLogs.length > 0 && totalPages > 1 && (
          <div className="border-t bg-gray-50/30 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>of {filteredLogs.length} logs</span>
              </div>

              {/* Pagination controls */}
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNumber);
                          }}
                          isActive={currentPage === pageNumber}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              
              {/* Page info */}
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
