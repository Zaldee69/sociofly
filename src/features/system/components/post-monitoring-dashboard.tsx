"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Settings,
  Server,
  Activity,
  AlertCircle,
  Database,
  Cpu,
  HardDrive,
} from "lucide-react";

interface PostOperationalData {
  id: string;
  title: string;
  content: string;
  scheduledAt: Date;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  platforms: {
    platform: string;
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
    publishedAt?: Date;
    errorMessage?: string;
  }[];
  approval?: {
    status: "PENDING" | "APPROVED" | "REJECTED";
    approver?: string;
    pendingSince?: Date;
  };
  author: string;
}

interface SystemOperationalStats {
  totalPosts: number;
  failedPosts: number;
  stuckApprovals: number;
  pendingRetries: number;
  systemHealth: "HEALTHY" | "WARNING" | "CRITICAL";
  systemResources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    dbConnections: number;
  };
  queueStatus: {
    emailQueue: number;
    publishQueue: number;
    mediaQueue: number;
    totalJobs: number;
  };
  recentErrors: Array<{
    id: string;
    timestamp: Date;
    level: "ERROR" | "WARNING" | "CRITICAL";
    message: string;
    source: string;
  }>;
  automatedActions: Array<{
    id: string;
    timestamp: Date;
    action: string;
    status: "SUCCESS" | "FAILED";
    details: string;
  }>;
}

export function PostMonitoringDashboard() {
  const [posts, setPosts] = useState<PostOperationalData[]>([]);
  const [stats, setStats] = useState<SystemOperationalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "failed" | "stuck" | "pending">(
    "all"
  );

  // Fetch operational data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch operational stats
      const statsResponse = await fetch("/api/post-monitoring?action=stats");
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          const data = statsResult.data;
          setStats({
            totalPosts: data.totalPosts,
            failedPosts: data.failedPosts,
            stuckApprovals: data.stuckApprovals,
            pendingRetries: data.failedPosts,
            systemHealth:
              data.failedPosts > 5
                ? "CRITICAL"
                : data.failedPosts > 0
                  ? "WARNING"
                  : "HEALTHY",
            systemResources: data.systemResources,
            queueStatus: data.queueStatus,
            recentErrors: data.recentErrors.map((error: any) => ({
              ...error,
              timestamp: new Date(error.timestamp),
            })),
            automatedActions: data.automatedActions.map((action: any) => ({
              ...action,
              timestamp: new Date(action.timestamp),
            })),
          });
        }
      }

      // Fetch posts for operational issues
      const postsResponse = await fetch(
        "/api/post-monitoring?action=posts&limit=50"
      );
      if (postsResponse.ok) {
        const postsResult = await postsResponse.json();
        if (postsResult.success) {
          setPosts(
            postsResult.data.map((post: any) => ({
              id: post.id,
              title: post.title,
              content: post.content,
              scheduledAt: new Date(post.scheduledAt),
              status: post.status,
              platforms: post.platforms.map((p: any) => ({
                platform: p.platform,
                status: p.status,
                publishedAt: p.publishedAt
                  ? new Date(p.publishedAt)
                  : undefined,
                errorMessage: p.errorMessage,
              })),
              approval: post.approval
                ? {
                    status: post.approval.status,
                    approver: post.approval.approver,
                    pendingSince: new Date(post.approval.pendingSince),
                  }
                : undefined,
              author: post.author,
            }))
          );
        }
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching operational data:", error);
      // Show error state instead of mock data
      setStats(null);
      setPosts([]);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Optimized auto-refresh every 5 minutes to reduce Redis load
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredPosts = posts.filter((post) => {
    switch (filter) {
      case "failed":
        return post.status === "FAILED";
      case "stuck":
        return (
          post.approval?.status === "PENDING" &&
          post.approval?.pendingSince &&
          Date.now() - post.approval.pendingSince.getTime() >
            24 * 60 * 60 * 1000
        );
      case "pending":
        return post.approval?.status === "PENDING";
      default:
        return post.status === "FAILED" || post.approval?.status === "PENDING";
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "FACEBOOK":
        return "📘";
      case "INSTAGRAM":
        return "📷";
      case "TWITTER":
        return "🐦";
      case "LINKEDIN":
        return "💼";
      default:
        return "📱";
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "HEALTHY":
        return "text-green-600";
      case "WARNING":
        return "text-yellow-600";
      case "CRITICAL":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const handleRetryPost = async (postId: string) => {
    try {
      const response = await fetch("/api/post-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-failed", postId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          fetchData(); // Refresh data
        }
      }
    } catch (error) {
      console.error("Error retrying post:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Operational Monitor
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

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Operational Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">
              Unable to Load System Data
            </AlertTitle>
            <AlertDescription className="text-red-700">
              Failed to connect to monitoring system. Please check your
              connection and try again.
              <div className="mt-3">
                <Button onClick={fetchData} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical System Alerts */}
      {stats &&
        (stats.failedPosts > 0 ||
          stats.stuckApprovals > 0 ||
          stats.systemResources?.cpuUsage > 0.9) && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">
              🚨 System Issues Detected
            </AlertTitle>
            <AlertDescription className="text-red-700">
              {stats.failedPosts > 0 &&
                `${stats.failedPosts} failed posts requiring attention. `}
              {stats.stuckApprovals > 0 &&
                `${stats.stuckApprovals} approvals stuck >24h. `}
              {stats.systemResources?.cpuUsage > 0.9 &&
                `High CPU usage detected (${Math.round(stats.systemResources.cpuUsage * 100)}%). `}
              Immediate admin action required.
              <div className="mt-3 flex gap-2">
                {stats.failedPosts > 0 && (
                  <Button
                    onClick={() => setFilter("failed")}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <XCircle className="h-3 w-3 mr-2" />
                    Review Failed Posts
                  </Button>
                )}
                {stats.stuckApprovals > 0 && (
                  <Button
                    onClick={() => setFilter("stuck")}
                    size="sm"
                    variant="outline"
                  >
                    <Clock className="h-3 w-3 mr-2" />
                    Review Stuck Approvals
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="issues">Operational Issues</TabsTrigger>
          <TabsTrigger value="resources">System Resources</TabsTrigger>
          <TabsTrigger value="logs">Logs & Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getHealthColor(stats?.systemHealth || "HEALTHY")}`}
                >
                  {stats?.systemHealth || "HEALTHY"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last checked: {lastUpdated?.toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.failedPosts || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Require immediate action
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.queueStatus?.totalJobs || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Background jobs pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.recentErrors?.filter(
                    (e) => e.level === "ERROR" || e.level === "CRITICAL"
                  ).length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Queue Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Background Job Queues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats?.queueStatus?.emailQueue || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Email Queue</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.queueStatus?.publishQueue || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Publish Queue</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.queueStatus?.mediaQueue || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Media Queue</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.queueStatus?.totalJobs || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          {/* Operational Issues Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Operational Issues</CardTitle>
                <Button onClick={fetchData} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All Issues ({filteredPosts.length})
                </Button>
                <Button
                  variant={filter === "failed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("failed")}
                >
                  Failed ({posts.filter((p) => p.status === "FAILED").length})
                </Button>
                <Button
                  variant={filter === "stuck" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("stuck")}
                >
                  Stuck Approvals (
                  {
                    posts.filter(
                      (p) =>
                        p.approval?.status === "PENDING" &&
                        p.approval?.pendingSince &&
                        Date.now() - p.approval.pendingSince.getTime() >
                          24 * 60 * 60 * 1000
                    ).length
                  }
                  )
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Error Details</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">
                            {post.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            By {post.author}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(
                            post.status === "FAILED" ? "FAILED" : "PENDING"
                          )}
                        >
                          {post.status === "FAILED"
                            ? "Publishing Failed"
                            : "Approval Stuck"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {post.platforms.map((platform, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span>{getPlatformIcon(platform.platform)}</span>
                              {platform.status === "FAILED" && (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs">
                          {post.status === "FAILED"
                            ? post.platforms.find((p) => p.errorMessage)
                                ?.errorMessage || "Unknown error"
                            : `Pending approval from ${post.approval?.approver}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {post.status === "FAILED"
                            ? `Since ${post.scheduledAt.toLocaleDateString()}`
                            : post.approval?.pendingSince
                              ? `${Math.floor((Date.now() - post.approval.pendingSince.getTime()) / (1000 * 60 * 60))}h ago`
                              : "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {post.status === "FAILED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryPost(post.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          {/* System Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(stats?.systemResources?.cpuUsage || 0) > 0.8 ? "text-red-600" : (stats?.systemResources?.cpuUsage || 0) > 0.6 ? "text-yellow-600" : "text-green-600"}`}
                >
                  {Math.round((stats?.systemResources?.cpuUsage || 0) * 100)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${(stats?.systemResources?.cpuUsage || 0) > 0.8 ? "bg-red-600" : (stats?.systemResources?.cpuUsage || 0) > 0.6 ? "bg-yellow-600" : "bg-green-600"}`}
                    style={{
                      width: `${(stats?.systemResources?.cpuUsage || 0) * 100}%`,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(stats?.systemResources?.memoryUsage || 0) > 0.8 ? "text-red-600" : (stats?.systemResources?.memoryUsage || 0) > 0.6 ? "text-yellow-600" : "text-green-600"}`}
                >
                  {Math.round((stats?.systemResources?.memoryUsage || 0) * 100)}
                  %
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${(stats?.systemResources?.memoryUsage || 0) > 0.8 ? "bg-red-600" : (stats?.systemResources?.memoryUsage || 0) > 0.6 ? "bg-yellow-600" : "bg-green-600"}`}
                    style={{
                      width: `${(stats?.systemResources?.memoryUsage || 0) * 100}%`,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <HardDrive className="h-4 w-4" />
                  Disk Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${(stats?.systemResources?.diskUsage || 0) > 0.8 ? "text-red-600" : (stats?.systemResources?.diskUsage || 0) > 0.6 ? "text-yellow-600" : "text-green-600"}`}
                >
                  {Math.round((stats?.systemResources?.diskUsage || 0) * 100)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${(stats?.systemResources?.diskUsage || 0) > 0.8 ? "bg-red-600" : (stats?.systemResources?.diskUsage || 0) > 0.6 ? "bg-yellow-600" : "bg-green-600"}`}
                    style={{
                      width: `${(stats?.systemResources?.diskUsage || 0) * 100}%`,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Database className="h-4 w-4" />
                  DB Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.systemResources?.dbConnections || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active connections
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.recentErrors || []).slice(0, 10).map((error) => (
                    <TableRow key={error.id}>
                      <TableCell>
                        <div className="text-sm">
                          {error.timestamp.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            error.level === "CRITICAL"
                              ? "destructive"
                              : error.level === "ERROR"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {error.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {error.source}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-md truncate">
                          {error.message}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!stats?.recentErrors ||
                    stats.recentErrors.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No recent errors
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Automated Actions Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automated Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.automatedActions || [])
                    .slice(0, 10)
                    .map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div className="text-sm">
                            {action.timestamp.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {action.action}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              action.status === "SUCCESS"
                                ? "outline"
                                : "destructive"
                            }
                            className={
                              action.status === "SUCCESS"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                          >
                            {action.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-md truncate">
                            {action.details}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  {(!stats?.automatedActions ||
                    stats.automatedActions.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No recent automated actions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
