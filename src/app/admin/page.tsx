"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  BarChart3,
  Activity,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Settings,
  Eye,
  Send,
  PauseCircle,
  PlayCircle,
  Zap,
  Shield,
  Database,
  Globe,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface AdminStats {
  publishedToday: number;
  scheduledPosts: number;
  failedPosts: number;
  pendingApprovals: number;
  overdueApprovals: number;
  totalPosts: number;
  lastUpdated: string;
}

interface AdminStatsResponse {
  success: boolean;
  data: AdminStats;
  cache: {
    fromCache: boolean;
    lastUpdated?: string;
    ttl?: number;
  };
  timestamp: string;
}

async function fetchAdminStats(
  forceRefresh = false
): Promise<AdminStatsResponse> {
  const url = `/api/admin/stats${forceRefresh ? "?refresh=true" : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch admin stats");
  }

  return response.json();
}

export default function AdminPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: statsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fetchAdminStats(),
    staleTime: 4 * 60 * 1000, // 4 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const stats = statsResponse?.data || {
    publishedToday: 0,
    scheduledPosts: 0,
    failedPosts: 0,
    pendingApprovals: 0,
    overdueApprovals: 0,
    totalPosts: 0,
    lastUpdated: new Date().toISOString(),
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshedData = await fetchAdminStats(true);
      queryClient.setQueryData(["admin-stats"], refreshedData);
      toast.success("Admin stats refreshed successfully");
    } catch (error) {
      console.error("Error refreshing stats:", error);
      toast.error("Failed to refresh admin stats");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-red-600">Error loading dashboard data</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Failed to load admin statistics. Please try refreshing the page.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Social Media Command Center
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Real-time insights and system monitoring
                  </p>
                  {statsResponse?.cache && (
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          statsResponse.cache.fromCache
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {statsResponse.cache.fromCache ? "Cached" : "Live"} •
                        {formatLastUpdated(stats.lastUpdated)}
                      </span>
                      {statsResponse.cache.ttl && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5"
                        >
                          {Math.floor(statsResponse.cache.ttl / 60)}m TTL
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                variant="outline"
                size="sm"
                className="border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Syncing..." : "Refresh Data"}
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Admin Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* System Status */}
          <Card
            className={`bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 ${isLoading ? "animate-pulse" : ""}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    System Status
                  </span>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    stats.failedPosts === 0 ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-green-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-green-200 rounded animate-pulse" />
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.failedPosts === 0 ? "Healthy" : "Issues"}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Overall system health
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Database className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      {stats.failedPosts === 0 ? "All systems operational" : `${stats.failedPosts} issues detected`}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Failed Posts */}
          <Card
            className={`bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 ${isLoading ? "animate-pulse" : ""}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                    Failed Posts
                  </span>
                </div>
                <Badge variant={stats.failedPosts > 0 ? "destructive" : "secondary"}>
                  {stats.failedPosts > 0 ? "Critical" : "Clear"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-red-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-red-200 rounded animate-pulse" />
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {stats.failedPosts}
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    Requires immediate attention
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <RefreshCw className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">
                      {stats.failedPosts > 0 ? "Action needed" : "No failures"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card
            className={`bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 ${isLoading ? "animate-pulse" : ""}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Pending Approvals
                  </span>
                </div>
                <Badge variant={stats.pendingApprovals > 0 ? "secondary" : "outline"}>
                  {stats.pendingApprovals > 0 ? "Pending" : "Clear"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-amber-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-amber-200 rounded animate-pulse" />
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {stats.pendingApprovals}
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Awaiting admin review
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <MessageSquare className="h-3 w-3 text-amber-600" />
                    <span className="text-xs text-amber-600">
                      {stats.overdueApprovals > 0 ? `${stats.overdueApprovals} overdue` : "On schedule"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total System Posts */}
          <Card
            className={`bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 ${isLoading ? "animate-pulse" : ""}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Total Posts
                  </span>
                </div>
                <Globe className="h-4 w-4 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-16 bg-blue-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-blue-200 rounded animate-pulse" />
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalPosts}
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    System-wide content
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <TrendingUp className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-blue-600">
                      {stats.publishedToday} published today
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User & Team Management */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">User Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage users, teams, and permissions
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">
                          Active Users
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          System-wide user activity
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                      Monitor
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                          Pending Approvals
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {stats.pendingApprovals} posts awaiting admin review
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    >
                      {stats.pendingApprovals}
                    </Badge>
                  </div>

                  {stats.overdueApprovals > 0 && (
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="font-medium text-red-900 dark:text-red-100">
                            Overdue Reviews
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {stats.overdueApprovals} posts past deadline
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {stats.overdueApprovals}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Monitoring */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      System Monitoring
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Real-time system performance
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Monitor
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Database className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Database Health
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          All connections stable
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                      Healthy
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <Globe className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">
                          API Status
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          All endpoints operational
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                      Online
                    </Badge>
                  </div>

                  {/* Activity Breakdown */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {stats.publishedToday}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">
                        Published
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {stats.scheduledPosts}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        Queued
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-xl font-bold text-red-600">
                        {stats.failedPosts}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">
                        Failed
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* System Status & Alerts */}
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">System Status</h3>
                    <p className="text-sm text-muted-foreground">
                      Real-time system health monitoring
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    stats.failedPosts > 0 || stats.overdueApprovals > 0
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {stats.failedPosts + stats.overdueApprovals} Issues
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.failedPosts > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="p-1 bg-red-500 rounded-full">
                        <AlertTriangle className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-red-900 dark:text-red-100">
                          System Issues Detected
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {stats.failedPosts} failed posts require admin intervention
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                      >
                        Fix Now
                      </Button>
                    </div>
                  )}

                  {stats.overdueApprovals > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="p-1 bg-yellow-500 rounded-full">
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-yellow-900 dark:text-yellow-100">
                          Admin Review Required
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          {stats.overdueApprovals} posts awaiting admin approval
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      >
                        Review
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="p-1 bg-blue-500 rounded-full">
                      <Database className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Database Status
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        All database connections stable and responsive
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Online
                    </Badge>
                  </div>

                  {stats.failedPosts === 0 && stats.overdueApprovals === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="p-2 bg-green-500 rounded-full">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          All Systems Operational
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          No admin intervention required. System running optimally.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Admin Actions</h3>
                  <p className="text-sm text-muted-foreground">System administration tools</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                     onClick={() => refetch()}
                     disabled={isLoading}
                     className="w-full justify-start bg-blue-500 hover:bg-blue-600 text-white"
                     size="sm"
                   >
                     <RefreshCw className={`h-4 w-4 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
                     Refresh System Data
                   </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Users className="h-4 w-4 mr-3" />
                    Manage Users
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Shield className="h-4 w-4 mr-3" />
                    Security Settings
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <Database className="h-4 w-4 mr-3" />
                    Database Tools
                  </Button>

                  <Separator className="my-4" />

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-600 hover:bg-gray-50"
                  >
                    <Activity className="h-4 w-4 mr-3" />
                    System Logs
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-600 hover:bg-gray-50"
                  >
                    <Globe className="h-4 w-4 mr-3" />
                    API Management
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Management Tools */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-slate-500 rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-xl">Advanced Management</h3>
                <p className="text-sm text-muted-foreground">
                  System administration and monitoring tools
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/cron" className="group">
                <Card className="border-2 border-transparent hover:border-blue-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Cron Jobs</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Manage automated scheduling tasks
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Automation
                    </Badge>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/post-monitoring" className="group">
                <Card className="border-2 border-transparent hover:border-green-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      Post Monitoring
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Real-time performance tracking
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Analytics
                    </Badge>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/system-health" className="group">
                <Card className="border-2 border-transparent hover:border-purple-200 hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      System Health
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Infrastructure monitoring
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Monitoring
                    </Badge>
                  </CardContent>
                </Card>
              </Link>

              <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all duration-200 opacity-60">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                    <Plus className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-500">
                    More Tools
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Additional features coming soon
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
