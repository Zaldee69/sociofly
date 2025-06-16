"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
  Timer,
} from "lucide-react";

interface AnalyticsData {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  errorRate: number;
  hourlyStats: Array<{
    hour: string;
    executions: number;
    success: number;
    failed: number;
    avgTime: number;
  }>;
  dailyStats: Array<{
    date: string;
    executions: number;
    success: number;
    failed: number;
    avgTime: number;
  }>;
  statusDistribution: { [key: string]: number };
  jobTypeDistribution: { [key: string]: number };
  queueDistribution: { [key: string]: number };
  performanceMetrics: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  recentTrends: Array<{
    period: string;
    executions: number;
    success: number;
    failed: number;
    avgTime: number;
  }>;
  mostActiveJob: string;
  slowestJob: string;
  fastestJob: string;
  peakHour: string;
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Helper function to get color based on value
  const getPerformanceColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage < 30) return "bg-green-500";
    if (percentage < 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Get top job types (limit to 10)
  const topJobTypes = Object.entries(data.jobTypeDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const maxJobCount = Math.max(...Object.values(data.jobTypeDistribution));

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Executions
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {data.totalExecutions.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">All time total</p>
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
                  {data.successRate.toFixed(1)}%
                </p>
                <Progress value={data.successRate} className="h-2" />
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
                  {data.avgExecutionTime > 1000
                    ? `${(data.avgExecutionTime / 1000).toFixed(1)}s`
                    : `${data.avgExecutionTime.toFixed(0)}ms`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Average execution time
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="h-7 w-7 text-orange-600" />
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
                  {data.errorRate.toFixed(1)}%
                </p>
                <Progress value={data.errorRate} className="h-2" />
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance and Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Percentiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">P50 (Median)</span>
                  <span className="text-sm font-mono">
                    {data.performanceMetrics.p50 > 1000
                      ? `${(data.performanceMetrics.p50 / 1000).toFixed(1)}s`
                      : `${data.performanceMetrics.p50.toFixed(0)}ms`}
                  </span>
                </div>
                <Progress
                  value={
                    (data.performanceMetrics.p50 /
                      data.performanceMetrics.p99) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">P90</span>
                  <span className="text-sm font-mono">
                    {data.performanceMetrics.p90 > 1000
                      ? `${(data.performanceMetrics.p90 / 1000).toFixed(1)}s`
                      : `${data.performanceMetrics.p90.toFixed(0)}ms`}
                  </span>
                </div>
                <Progress
                  value={
                    (data.performanceMetrics.p90 /
                      data.performanceMetrics.p99) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">P95</span>
                  <span className="text-sm font-mono">
                    {data.performanceMetrics.p95 > 1000
                      ? `${(data.performanceMetrics.p95 / 1000).toFixed(1)}s`
                      : `${data.performanceMetrics.p95.toFixed(0)}ms`}
                  </span>
                </div>
                <Progress
                  value={
                    (data.performanceMetrics.p95 /
                      data.performanceMetrics.p99) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">P99</span>
                  <span className="text-sm font-mono">
                    {data.performanceMetrics.p99 > 1000
                      ? `${(data.performanceMetrics.p99 / 1000).toFixed(1)}s`
                      : `${data.performanceMetrics.p99.toFixed(0)}ms`}
                  </span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Most Active Job</span>
                </div>
                <p className="text-sm text-blue-700 font-mono">
                  {data.mostActiveJob || "N/A"}
                </p>
              </div>

              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Timer className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Slowest Job</span>
                </div>
                <p className="text-sm text-red-700 font-mono">
                  {data.slowestJob || "N/A"}
                </p>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Fastest Job</span>
                </div>
                <p className="text-sm text-green-700 font-mono">
                  {data.fastestJob || "N/A"}
                </p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Peak Hour</span>
                </div>
                <p className="text-sm text-orange-700 font-mono">
                  {data.peakHour || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.statusDistribution).map(([status, count]) => {
              const percentage =
                data.totalExecutions > 0
                  ? (count / data.totalExecutions) * 100
                  : 0;

              const getStatusColor = (status: string) => {
                switch (status) {
                  case "completed":
                    return "border-green-500 bg-green-50";
                  case "failed":
                    return "border-red-500 bg-red-50";
                  case "processing":
                    return "border-yellow-500 bg-yellow-50";
                  case "queued":
                    return "border-blue-500 bg-blue-50";
                  default:
                    return "border-gray-500 bg-gray-50";
                }
              };

              return (
                <div
                  key={status}
                  className={`text-center p-4 border-2 rounded-lg ${getStatusColor(status)}`}
                >
                  <div className="text-2xl font-bold mb-1">{count}</div>
                  <div className="text-sm font-medium capitalize mb-2">
                    {status}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {percentage.toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Job Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Top Job Types by Execution Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topJobTypes.map(([jobType, count]) => {
              const percentage = (count / maxJobCount) * 100;
              return (
                <div key={jobType} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate flex-1 mr-4">
                      {jobType.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{count}</span>
                      <Badge variant="outline" className="text-xs">
                        {((count / data.totalExecutions) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Queue Distribution */}
      {Object.keys(data.queueDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Queue Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.queueDistribution).map(([queue, count]) => (
                <div
                  key={queue}
                  className="text-center p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50"
                >
                  <div className="text-2xl font-bold mb-1 text-purple-600">
                    {count}
                  </div>
                  <div className="text-sm font-medium capitalize mb-2">
                    {queue}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {((count / data.totalExecutions) * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Trends (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentTrends.map((trend) => {
              const totalJobs = trend.success + trend.failed;
              const successRate =
                totalJobs > 0 ? (trend.success / totalJobs) * 100 : 0;

              return (
                <div
                  key={trend.period}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{trend.period}</div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium">
                        {trend.success}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-600 font-medium">
                        {trend.failed}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {successRate.toFixed(1)}% success
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      Avg:{" "}
                      {trend.avgTime > 1000
                        ? `${(trend.avgTime / 1000).toFixed(1)}s`
                        : `${trend.avgTime.toFixed(0)}ms`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
