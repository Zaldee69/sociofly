import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  ArrowUpRight,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MousePointer,
  Eye,
  BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface OverviewSectionProps {
  accountInsight?: {
    // Basic metrics
    totalFollowers?: number;
    followingCount?: number;
    totalPosts?: number;

    // Engagement metrics (comprehensive)
    totalLikes?: number;
    totalReactions?: number; // Facebook reactions
    totalComments?: number;
    totalShares?: number;
    totalSaves?: number; // Instagram saves
    totalClicks?: number;

    // Reach & Impressions
    totalReach?: number;
    totalImpressions?: number;
    avgReachPerPost?: number;

    // Calculated metrics
    engagementRate?: number; // (likes + comments + shares) ÷ reach × 100%
    avgEngagementPerPost?: number;
    avgClickThroughRate?: number;

    // Growth metrics
    followerGrowth?: Array<{ name: string; followers: number }>;
    followersGrowthPercent?: number;
    mediaGrowthPercent?: number;
    engagementGrowthPercent?: number;
    reachGrowthPercent?: number;

    // Platform specific
    platform?: "INSTAGRAM" | "FACEBOOK";
    bioLinkClicks?: number;
    storyViews?: number;
    profileVisits?: number;
  };
  stats?: Record<string, unknown>;
  isLoading: boolean;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  accountInsight = {
    totalFollowers: 0,
    followingCount: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalReactions: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalClicks: 0,
    totalReach: 0,
    totalImpressions: 0,
    avgReachPerPost: 0,
    engagementRate: 0,
    avgEngagementPerPost: 0,
    avgClickThroughRate: 0,
    followerGrowth: [],
    followersGrowthPercent: 0,
    mediaGrowthPercent: 0,
    engagementGrowthPercent: 0,
    reachGrowthPercent: 0,
    bioLinkClicks: 0,
    storyViews: 0,
    profileVisits: 0,
  },
  stats,
  isLoading,
}) => {
  // Calculate engagement rate using the correct formula
  const calculatedEngagementRate = React.useMemo(() => {
    // Use the engagement rate from the API if available, otherwise calculate
    if (accountInsight.engagementRate && accountInsight.engagementRate > 0) {
      return accountInsight.engagementRate;
    }

    const totalEngagements =
      (accountInsight.totalLikes || 0) +
      (accountInsight.totalComments || 0) +
      (accountInsight.totalShares || 0);
    const reach = accountInsight.totalReach || 0;
    return reach > 0 ? (totalEngagements / reach) * 100 : 0;
  }, [
    accountInsight.engagementRate,
    accountInsight.totalLikes,
    accountInsight.totalComments,
    accountInsight.totalShares,
    accountInsight.totalReach,
  ]);

  if (isLoading) {
    return (
      <section id="overview" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[140px] w-full" />
          ))}
        </div>
      </section>
    );
  }

  const getEngagementBadge = (rate: number) => {
    if (rate >= 6)
      return {
        variant: "default" as const,
        label: "Excellent",
        color: "bg-green-500",
      };
    if (rate >= 3)
      return {
        variant: "secondary" as const,
        label: "Good",
        color: "bg-blue-500",
      };
    if (rate >= 1)
      return {
        variant: "outline" as const,
        label: "Average",
        color: "bg-yellow-500",
      };
    return {
      variant: "destructive" as const,
      label: "Low",
      color: "bg-red-500",
    };
  };

  const engagementBadge = getEngagementBadge(calculatedEngagementRate);

  return (
    <section id="overview" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-muted-foreground">
          Comprehensive performance metrics for Instagram & Facebook
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Followers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalFollowers || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Engagement Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {calculatedEngagementRate.toFixed(2)}%
              </div>
              <Badge variant={engagementBadge.variant} className="text-xs">
                {engagementBadge.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalReach || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountInsight.totalPosts || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Likes & Reactions
            </CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                (accountInsight.totalLikes || 0) +
                (accountInsight.totalReactions || 0)
              ).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Likes: {(accountInsight.totalLikes || 0).toLocaleString()}
              </div>
              {accountInsight.platform === "FACEBOOK" && (
                <div>
                  Reactions:{" "}
                  {(accountInsight.totalReactions || 0).toLocaleString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalComments || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg per post:{" "}
              {accountInsight.totalPosts
                ? Math.round(
                    (accountInsight.totalComments || 0) /
                      accountInsight.totalPosts
                  )
                : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Share2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalShares || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {accountInsight.platform === "FACEBOOK"
                ? "Shares"
                : "Story mentions"}
            </p>
          </CardContent>
        </Card>

        {accountInsight.platform === "INSTAGRAM" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saves</CardTitle>
              <Bookmark className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(accountInsight.totalSaves || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Instagram saves only
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalClicks || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalImpressions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Frequency:{" "}
              {accountInsight.totalReach
                ? (
                    (accountInsight.totalImpressions || 0) /
                    accountInsight.totalReach
                  ).toFixed(2)
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Engagement Rate</span>
                <span>{calculatedEngagementRate.toFixed(2)}%</span>
              </div>
              <Progress
                value={Math.min(calculatedEngagementRate * 10, 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Target: 3-6% for good performance
              </p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Reach vs Impressions Ratio</span>
                <span>
                  {accountInsight.totalReach && accountInsight.totalImpressions
                    ? (
                        (accountInsight.totalReach /
                          accountInsight.totalImpressions) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  accountInsight.totalReach && accountInsight.totalImpressions
                    ? Math.min(
                        (accountInsight.totalReach /
                          accountInsight.totalImpressions) *
                          200,
                        100
                      )
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher ratio indicates better unique reach
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default OverviewSection;
