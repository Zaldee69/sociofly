import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, ArrowUpRight } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewSectionProps {
  accountInsight?: {
    totalFollowers?: number;
    engagementRate?: number;
    totalPosts?: number;
    avgReachPerPost?: number;
    followerGrowth?: Array<{ name: string; followers: number }>;
    followersGrowthPercent?: number;
    mediaGrowthPercent?: number;
    engagementGrowthPercent?: number;
    reachGrowthPercent?: number;
  };
  stats?: {
    // Add fields based on getCollectionStats response
  };
  isLoading: boolean;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  accountInsight = {
    totalFollowers: 0,
    engagementRate: 0,
    totalPosts: 0,
    avgReachPerPost: 0,
    followerGrowth: [],
    followersGrowthPercent: 0,
    mediaGrowthPercent: 0,
    engagementGrowthPercent: 0,
    reachGrowthPercent: 0,
  },
  stats,
  isLoading,
}) => {
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
        <Skeleton className="h-[300px] w-full" />
      </section>
    );
  }

  return (
    <section id="overview" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-muted-foreground">
          Key performance metrics at a glance
        </p>
      </div>

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
            <p className="text-xs text-muted-foreground">
              +{accountInsight.followersGrowthPercent || 0}% from last month
            </p>
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
            <div className="text-2xl font-bold">
              {accountInsight.engagementRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              +{accountInsight.engagementGrowthPercent || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="18" height="14" x="3" y="5" rx="2" />
              <path d="M21 5H3" />
              <path d="M21 11H3" />
              <path d="M11 19H3" />
              <path d="M21 19h-6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountInsight.totalPosts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{accountInsight.mediaGrowthPercent || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Reach per Post
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.avgReachPerPost || 0).toLocaleString()}%
            </div>
            <p className="text-xs text-muted-foreground">
              +{accountInsight.reachGrowthPercent || 0}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follower Growth</CardTitle>
        </CardHeader>
        {/* <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={accountInsight.followerGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent> */}
      </Card>
    </section>
  );
};

export default OverviewSection;
