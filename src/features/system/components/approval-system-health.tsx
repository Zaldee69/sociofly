"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthMetrics {
  pendingApprovals: number;
  overduePosts: number;
  stuckApprovals: number;
  expiredTokens: number;
  healthScore: number;
}

interface EdgeCaseReport {
  type: string;
  count: number;
  posts: Array<{
    id: string;
    content: string;
    scheduledAt: Date;
    issue: string;
    action: string;
  }>;
}

export function ApprovalSystemHealth() {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(
    null
  );
  const [edgeCaseReports, setEdgeCaseReports] = useState<EdgeCaseReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch health metrics
  const fetchHealthMetrics = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch("/api/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_system_health",
          apiKey: process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setHealthMetrics(data.result);
        setLastUpdated(new Date());
      } else {
        console.error("Failed to fetch health metrics:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching health metrics:", error);
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  // Process edge cases
  const processEdgeCases = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "process_approval_edge_cases",
          apiKey: process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEdgeCaseReports(data.result.reports);
        // Refresh health metrics after processing
        await fetchHealthMetrics(true);
      }
    } catch (error) {
      console.error("Error processing edge cases:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchHealthMetrics(true);
  };

  // Optimized auto-refresh every 10 minutes to reduce Redis load
  useEffect(() => {
    fetchHealthMetrics();
    const interval = setInterval(fetchHealthMetrics, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Get health score color and status
  const getHealthScoreStatus = (score: number) => {
    if (score >= 80) {
      return {
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        status: "Excellent",
        icon: CheckCircle,
      };
    } else if (score >= 60) {
      return {
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        status: "Good",
        icon: Clock,
      };
    } else if (score >= 30) {
      return {
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        status: "Needs Attention",
        icon: AlertTriangle,
      };
    } else {
      return {
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        status: "Critical",
        icon: XCircle,
      };
    }
  };

  if (isLoading || !healthMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Approval System Health
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

  const healthStatus = getHealthScoreStatus(healthMetrics.healthScore);
  const StatusIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Health Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Approval System Health
            {lastUpdated && (
              <Badge variant="outline" className="ml-auto">
                Updated {lastUpdated.toLocaleTimeString()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border",
              healthStatus.bgColor,
              healthStatus.borderColor
            )}
          >
            <StatusIcon className={cn("h-8 w-8", healthStatus.color)} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  Health Score: {healthMetrics.healthScore}/100
                </h3>
                <Badge
                  variant={
                    healthMetrics.healthScore >= 60 ? "default" : "destructive"
                  }
                >
                  {healthStatus.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                System is {healthStatus.status.toLowerCase()} -{" "}
                {healthMetrics.healthScore >= 80
                  ? "All systems operating normally"
                  : healthMetrics.healthScore >= 60
                    ? "Minor issues detected"
                    : healthMetrics.healthScore >= 30
                      ? "Multiple issues need attention"
                      : "Critical issues require immediate action"}
              </p>
            </div>
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Pending Approvals
                </p>
                <p className="text-2xl font-bold">
                  {healthMetrics.pendingApprovals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Overdue Posts</p>
                <p className="text-2xl font-bold text-orange-600">
                  {healthMetrics.overduePosts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Stuck Approvals</p>
                <p className="text-2xl font-bold text-red-600">
                  {healthMetrics.stuckApprovals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Expired Tokens</p>
                <p className="text-2xl font-bold text-purple-600">
                  {healthMetrics.expiredTokens}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edge Case Processing */}
      <Card>
        <CardHeader>
          <CardTitle>Edge Case Management</CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Automatically detect and handle edge cases in the approval system
            </p>
            <Button onClick={processEdgeCases} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Process Edge Cases
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {edgeCaseReports.length > 0 ? (
            <div className="space-y-4">
              {edgeCaseReports.map((report, index) => (
                <Alert
                  key={index}
                  className={
                    report.count > 0
                      ? "border-orange-200 bg-orange-50"
                      : "border-green-200 bg-green-50"
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="capitalize">
                    {report.type.replace(/_/g, " ")}
                    <Badge
                      variant={report.count > 0 ? "destructive" : "default"}
                      className="ml-2"
                    >
                      {report.count} issues
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {report.count > 0 ? (
                      <div className="mt-2 space-y-2">
                        <p>Found and processed {report.count} issues:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {report.posts.slice(0, 3).map((post, postIndex) => (
                            <li key={postIndex}>
                              <strong>{post.content}</strong> - {post.issue} →{" "}
                              {post.action}
                            </li>
                          ))}
                          {report.posts.length > 3 && (
                            <li className="text-muted-foreground">
                              ...and {report.posts.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      "No issues found in this category."
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Click "Process Edge Cases" to scan for and handle system edge
              cases.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {(healthMetrics.overduePosts > 0 ||
        healthMetrics.stuckApprovals > 0 ||
        healthMetrics.expiredTokens > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">
              ⚠️ Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthMetrics.overduePosts > 0 && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Overdue Posts Detected</AlertTitle>
                  <AlertDescription>
                    {healthMetrics.overduePosts} post(s) have passed their
                    scheduled time while waiting for approval. Consider
                    processing edge cases or manually reviewing these posts.
                  </AlertDescription>
                </Alert>
              )}

              {healthMetrics.stuckApprovals > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Stuck Approvals Need Attention</AlertTitle>
                  <AlertDescription>
                    {healthMetrics.stuckApprovals} approval(s) have been pending
                    for more than 48 hours. These may need to be escalated or
                    reassigned.
                  </AlertDescription>
                </Alert>
              )}

              {healthMetrics.expiredTokens > 0 && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>Social Account Tokens Expired</AlertTitle>
                  <AlertDescription>
                    {healthMetrics.expiredTokens} social account(s) have expired
                    authentication tokens. Users need to reconnect these
                    accounts.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
