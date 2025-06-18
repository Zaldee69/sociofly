import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Heart,
  Eye,
  FileText,
} from "lucide-react";

interface GrowthMetric {
  current: number;
  previous: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

interface GrowthData {
  socialAccountId: string;
  accountName: string | null;
  platform: string;
  lastUpdated: Date;
  growth: {
    followers: GrowthMetric;
    engagement: GrowthMetric;
    reach: GrowthMetric;
    posts: GrowthMetric;
  };
}

interface GrowthComparisonCardsProps {
  data: GrowthData;
  isLoading?: boolean;
}

const MetricCard = ({
  title,
  icon,
  metric,
  suffix = "",
}: {
  title: string;
  icon: React.ReactNode;
  metric: GrowthMetric;
  suffix?: string;
}) => {
  const formatValue = (value: number) => {
    if (suffix === "%") {
      return value.toFixed(1);
    }
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    switch (metric.trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (metric.trend) {
      case "up":
        return "text-green-600 bg-green-50";
      case "down":
        return "text-red-600 bg-red-50";
      case "stable":
        return "text-gray-600 bg-gray-50";
    }
  };

  const getProgressValue = () => {
    // Convert percentage to a value between 0-100 for progress bar
    const absPercentage = Math.abs(metric.percentage);
    return Math.min(absPercentage, 100);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(metric.current)}
          {suffix}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <Badge variant="secondary" className={getTrendColor()}>
              {metric.percentage > 0 ? "+" : ""}
              {metric.percentage.toFixed(1)}%
            </Badge>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              Previous: {formatValue(metric.previous)}
              {suffix}
            </span>
            <span>
              {metric.trend === "up"
                ? "Growth"
                : metric.trend === "down"
                  ? "Decline"
                  : "Stable"}
            </span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="mt-2">
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const GrowthComparisonCards: React.FC<GrowthComparisonCardsProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No comparison data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Growth Overview</h3>
        <Badge variant="outline">{data.accountName || "Account"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Followers"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.followers}
        />

        <MetricCard
          title="Engagement Rate"
          icon={<Heart className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.engagement}
          suffix="%"
        />

        <MetricCard
          title="Total Reach"
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.reach}
        />

        <MetricCard
          title="Total Posts"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.posts}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span className="capitalize">
                  {data.platform.toLowerCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{data.lastUpdated.toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Overall Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.growth).map(([key, metric]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="capitalize text-muted-foreground">
                    {key.replace("Growth", "")}:
                  </span>
                  <div className="flex items-center space-x-1">
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : metric.trend === "down" ? (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    ) : (
                      <Minus className="h-3 w-3 text-gray-600" />
                    )}
                    <span
                      className={
                        metric.trend === "up"
                          ? "text-green-600"
                          : metric.trend === "down"
                            ? "text-red-600"
                            : "text-gray-600"
                      }
                    >
                      {metric.percentage > 0 ? "+" : ""}
                      {metric.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GrowthComparisonCards;
