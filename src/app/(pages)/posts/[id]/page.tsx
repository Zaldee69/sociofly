"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  Globe,
  User,
  BarChart3,
  TrendingUp,
  Target,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useTeamContext } from "@/lib/contexts/team-context";
import { format } from "date-fns";
import { PostPreview } from "@/features/scheduling/components/post-calendar/post-dialog/components/post-preview";
import { DetailedApprovalStatus } from "@/features/approval/components/detailed-approval-status";
import { AddPostDialog } from "@/features/scheduling/components/post-calendar/post-dialog";
import { FileWithStablePreview } from "@/features/scheduling/components/post-calendar/post-dialog/hooks/use-media-files";
import { SocialPlatform } from "@prisma/client";
import { processInsights, InsightSummary } from "@/lib/insightProcessor";

// Platform icons and colors
const platformConfig: Record<
  SocialPlatform,
  { icon: string; color: string; name: string; bgGradient: string }
> = {
  INSTAGRAM: {
    icon: "📷",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    name: "Instagram",
    bgGradient: "from-purple-500 to-pink-500",
  },
  TWITTER: {
    icon: "🐦",
    color: "bg-blue-500",
    name: "Twitter",
    bgGradient: "from-blue-400 to-blue-600",
  },
  FACEBOOK: {
    icon: "📘",
    color: "bg-blue-600",
    name: "Facebook",
    bgGradient: "from-blue-500 to-blue-700",
  },
  LINKEDIN: {
    icon: "💼",
    color: "bg-blue-700",
    name: "LinkedIn",
    bgGradient: "from-blue-600 to-blue-800",
  },
  TIKTOK: {
    icon: "🎵",
    color: "bg-black",
    name: "TikTok",
    bgGradient: "from-gray-800 to-black",
  },
  YOUTUBE: {
    icon: "📺",
    color: "bg-red-600",
    name: "YouTube",
    bgGradient: "from-red-500 to-red-700",
  },
};

// Status configurations
const statusConfig = {
  DRAFT: {
    icon: <Edit className="w-4 h-4" />,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    label: "Draft",
    dotColor: "bg-gray-400",
  },
  SCHEDULED: {
    icon: <Clock className="w-4 h-4" />,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Scheduled",
    dotColor: "bg-blue-500",
  },
  PUBLISHED: {
    icon: <CheckCircle className="w-4 h-4" />,
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Published",
    dotColor: "bg-green-500",
  },
  FAILED: {
    icon: <XCircle className="w-4 h-4" />,
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Failed",
    dotColor: "bg-red-500",
  },
};

// Analytics Components
const MetricCard = ({
  icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
}) => (
  <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md min-h-[120px] flex flex-col justify-between">
    <div className="items-start justify-between mb-2">
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-between">
        <span className="text-sm font-medium text-gray-600 truncate">
          {label}
        </span>
        <div className="flex-shrink-0">{icon}</div>
      </div>
      <div className="text-xl xl:text-2xl font-bold text-gray-900 truncate">
        {value}
      </div>
      {change && (
        <div className="flex-shrink-0">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
              trend === "up"
                ? "text-green-700 bg-green-100"
                : trend === "down"
                  ? "text-red-700 bg-red-100"
                  : "text-gray-700 bg-gray-100"
            }`}
          >
            {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"} {change}
          </span>
        </div>
      )}
    </div>
  </div>
);

const AccountAnalytics = ({
  account,
  platform,
  analytics,
  isLoading,
  error,
  postStatus,
}: {
  account: any;
  platform: SocialPlatform;
  analytics?: any;
  isLoading?: boolean;
  error?: string;
  postStatus?: string;
}) => {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [insights, setInsights] = useState<InsightSummary | null>(null);

  // Process analytics data when available
  useEffect(() => {
    async function processAnalytics() {
      if (!analytics) return;

      const insightData = {
        platforms: [
          {
            platform: platform,
            socialAccountName: account.name,
            overview: {
              impressions:
                platform === "FACEBOOK"
                  ? (analytics.richInsights?.impressions ?? 0)
                  : analytics.overview.views,
              reach: analytics.overview.reach,
              engagement:
                platform === "INSTAGRAM"
                  ? Math.min(
                      100,
                      Math.max(0, analytics.overview.engagement * 100)
                    )
                  : analytics.overview.engagement,
              clicks: analytics.richInsights?.clicks ?? 0,
            },
            richInsights: {
              impressionsPaid: analytics.richInsights?.impressionsPaid ?? 0,
              impressionsOrganic:
                analytics.richInsights?.impressionsOrganic ?? 0,
            },
          },
        ],
      };

      setIsGeneratingAI(true);
      try {
        const result = await processInsights(insightData, true);
        setInsights(result);
      } catch (error) {
        console.error("Error processing insights:", error);
      } finally {
        setIsGeneratingAI(false);
      }
    }

    processAnalytics();
  }, [analytics, platform, account.name]);

  // Only show analytics if we have real data
  if (!analytics) {
    return (
      <div className="space-y-8">
        {postStatus !== "PUBLISHED" ? (
          <div className="text-center py-8">
            <div className="text-amber-500 mb-2">⏳ Post not yet published</div>
            <div className="text-sm text-muted-foreground">
              Analytics will be available after publishing
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              📊 No analytics data available
            </div>
            <div className="text-sm text-muted-foreground">
              Analytics data will appear once collection is completed
            </div>
          </div>
        )}
      </div>
    );
  }

  // SAFETY: fallback for richInsights and its nested properties
  const { overview, historical, demographics } = analytics;
  const richInsights = analytics.richInsights ?? {};
  const reactions = richInsights.reactions ?? {};
  const engagementMetrics = richInsights.engagementMetrics ?? {};

  return (
    <div className="space-y-8">
      {/* Show loading state if analytics are being fetched */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-sm text-muted-foreground">
            Loading analytics data...
          </div>
        </div>
      )}

      {/* Show error state */}
      {error && !isLoading && (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️ Failed to load analytics</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Loading Analytics
          </Button>
        </div>
      )}

      {/* Show success message for real data */}
      {!isLoading && (
        <div className="text-center py-2">
          <div className="text-xs text-green-600 bg-green-50 inline-block px-3 py-1 rounded-full">
            ✅ Real analytics data loaded
          </div>
        </div>
      )}

      {/* Insights Summary Card */}
      {/* <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Performance Summary
            </h4>
            {isGeneratingAI && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Generating AI insights...
              </div>
            )}
          </div>
          <div className="prose prose-sm max-w-none text-gray-600">
            {insights?.narrative || "Generating insights..."}
          </div>
        </div>
      </Card> */}

      {/* Enhanced Overview Metrics */}
      <div className="space-y-6">
        {/* Primary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
          <MetricCard
            icon={<Eye className="w-5 h-5 text-blue-500" />}
            label={platform === "FACEBOOK" ? "Impressions" : "Views"}
            value={
              platform === "FACEBOOK"
                ? (richInsights.impressions ?? 0).toLocaleString()
                : overview.views.toLocaleString()
            }
            change="+12%"
            trend="up"
          />
          <MetricCard
            icon={<Heart className="w-5 h-5 text-red-500" />}
            label="Reactions"
            value={(engagementMetrics.totalReactions ?? 0).toLocaleString()}
            change="+8%"
            trend="up"
          />
          <MetricCard
            icon={<MessageCircle className="w-5 h-5 text-green-500" />}
            label="Comments"
            value={overview.comments}
            change="+15%"
            trend="up"
          />
          <MetricCard
            icon={<Share2 className="w-5 h-5 text-purple-500" />}
            label="Shares"
            value={overview.shares}
            change="-2%"
            trend="down"
          />
          <MetricCard
            icon={<Users className="w-5 h-5 text-orange-500" />}
            label="Reach"
            value={overview.reach.toLocaleString()}
            change="+5%"
            trend="up"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
            label="Engagement"
            value={`${overview.engagement}%`}
            change="+0.3%"
            trend="up"
          />
        </div>

        {/* Rich Insights Section for Facebook */}
        {platform === "FACEBOOK" && richInsights && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Detailed Reactions Breakdown */}
            <Card className="p-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  Reaction Details
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      name: "Like",
                      emoji: "👍",
                      value: reactions.like ?? 0,
                      color: "bg-blue-500",
                    },
                    {
                      name: "Love",
                      emoji: "❤️",
                      value: reactions.love ?? 0,
                      color: "bg-red-500",
                    },
                    {
                      name: "Wow",
                      emoji: "😮",
                      value: reactions.wow ?? 0,
                      color: "bg-yellow-500",
                    },
                    {
                      name: "Haha",
                      emoji: "😂",
                      value: reactions.haha ?? 0,
                      color: "bg-orange-500",
                    },
                    {
                      name: "Sad",
                      emoji: "😢",
                      value: reactions.sad ?? 0,
                      color: "bg-gray-500",
                    },
                    {
                      name: "Angry",
                      emoji: "😠",
                      value: reactions.angry ?? 0,
                      color: "bg-red-700",
                    },
                  ]
                    .filter((reaction) => reaction.value > 0)
                    .map((reaction, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{reaction.emoji}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {reaction.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${reaction.color}`}
                              style={{
                                width: `${(reaction.value / Math.max(1, engagementMetrics.totalReactions ?? 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-8 text-right">
                            {reaction.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  {(engagementMetrics.totalReactions ?? 0) === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No reactions yet
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Impressions Breakdown (Paid vs Organic) */}
            <Card className="p-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Impressions Breakdown
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Total Impressions
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {(richInsights.impressions ?? 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Organic
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {(
                            richInsights.impressionsOrganic ?? 0
                          ).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(richInsights.impressions ?? 0) > 0
                            ? Math.round(
                                ((richInsights.impressionsOrganic ?? 0) /
                                  (richInsights.impressions ?? 1)) *
                                  100
                              )
                            : 0}
                          %
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Paid
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {(richInsights.impressionsPaid ?? 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(richInsights.impressions ?? 0) > 0
                            ? Math.round(
                                ((richInsights.impressionsPaid ?? 0) /
                                  (richInsights.impressions ?? 1)) *
                                  100
                              )
                            : 0}
                          %
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Advanced Metrics */}
            <Card className="p-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Advanced Metrics
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Unique Impressions
                      </div>
                      <div className="text-xs text-gray-500">
                        Unique people reached
                      </div>
                    </div>
                    <div className="text-lg font-bold text-blue-700">
                      {(richInsights.impressionsUnique ?? 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Post Clicks
                      </div>
                      <div className="text-xs text-gray-500">
                        Link & content clicks
                      </div>
                    </div>
                    <div className="text-lg font-bold text-green-700">
                      {(richInsights.clicks ?? 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        Frequency
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg times seen per person
                      </div>
                    </div>
                    <div className="text-lg font-bold text-purple-700">
                      {(richInsights.impressionsUnique ?? 0) > 0
                        ? (
                            (richInsights.impressions ?? 0) /
                            (richInsights.impressionsUnique ?? 1)
                          ).toFixed(1)
                        : "0"}
                      x
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Historical Performance Chart - Enhanced */}
      <Card className="p-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            7-Day Performance Trend
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {historical.map((day: any, index: number) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-500 mb-2">{day.date}</div>
                <div className="bg-gray-100 rounded-lg h-24 flex items-end justify-center p-1 relative group">
                  <div
                    className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-full transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                    style={{
                      height: `${(day.views / Math.max(...historical.map((d: any) => d.views || 1))) * 100}%`,
                    }}
                  ></div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day.views} views
                    <br />
                    {day.likes} likes
                    <br />
                    {day.engagement}% eng.
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-700 mt-2">
                  {(platform === "FACEBOOK"
                    ? day.impressions
                    : day.views
                  ).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {day.engagement}% eng.
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Demographics Section - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Age Groups */}
        <Card className="p-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Age Groups
            </h4>
            <div className="space-y-3">
              {demographics.ageGroups.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.range}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Gender Distribution */}
        <Card className="p-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Gender Distribution
            </h4>
            <div className="space-y-3">
              {demographics.gender.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.type}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          item.type === "Female"
                            ? "bg-gradient-to-r from-pink-500 to-pink-400"
                            : item.type === "Male"
                              ? "bg-gradient-to-r from-blue-500 to-blue-400"
                              : "bg-gradient-to-r from-gray-500 to-gray-400"
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Top Locations */}
        <Card className="p-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-600" />
              Top Locations
            </h4>
            <div className="space-y-3">
              {demographics.topLocations
                .slice(0, 5)
                .map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {item.country === "Indonesia"
                          ? "🇮🇩"
                          : item.country === "Malaysia"
                            ? "🇲🇾"
                            : item.country === "Singapore"
                              ? "🇸🇬"
                              : item.country === "Thailand"
                                ? "🇹🇭"
                                : "🌍"}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {item.country}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-10 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentTeamId } = useTeamContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const postId = params.id as string;

  // Fetch post data
  const {
    data: post,
    isLoading,
    error,
    refetch,
  } = trpc.post.getById.useQuery({ id: postId }, { enabled: !!postId });

  // Fetch analytics data for published posts
  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
  } = trpc.post.getAnalytics.useQuery(
    { postId },
    {
      enabled: !!postId && !!post && post.status === "PUBLISHED",
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: 1000,
    }
  );

  // Debug logging
  React.useEffect(() => {
    console.log("Analytics Debug:", {
      postId,
      postStatus: post?.status,
      postTeamId: post?.teamId,
      currentTeamId,
      isQueryEnabled: !!postId && !!post && post.status === "PUBLISHED",
      isAnalyticsLoading,
      analyticsData,
      analyticsError: analyticsError?.message,
      analyticsErrorCode: analyticsError?.data?.code,
      postSocialAccountsCount: post?.postSocialAccounts?.length,
    });
  }, [
    postId,
    post?.status,
    post?.teamId,
    currentTeamId,
    isAnalyticsLoading,
    analyticsData,
    analyticsError,
  ]);

  // Fetch approval instances
  const { data: approvalInstances } = trpc.post.getApprovalInstances.useQuery(
    { postId },
    { enabled: !!postId }
  );

  // Delete mutation
  const deletePostMutation = trpc.post.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted successfully!");
      router.push("/posts");
    },
    onError: (error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });

  // Retry failed post mutation
  const retryPostMutation = trpc.post.retry.useMutation({
    onSuccess: () => {
      toast.success("Post retry initiated successfully!");
      refetch(); // Refresh post data to show updated status
    },
    onError: (error: any) => {
      toast.error(`Failed to retry post: ${error.message}`);
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleRetry = () => {
    if (post?.id) {
      retryPostMutation.mutate({ id: post.id });
    }
  };

  // Manual analytics collection
  const [isCollectingAnalytics, setIsCollectingAnalytics] = useState(false);

  const handleCollectAnalytics = async () => {
    if (!post?.id) return;

    setIsCollectingAnalytics(true);
    try {
      const response = await fetch(
        "/api/scheduled-tasks/collect-post-analytics",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId: post.id,
            teamId: post.teamId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Analytics collected successfully! ${result.results.successCount} platforms updated.`
        );
        // Refetch analytics data to show the latest results
        setTimeout(() => {
          window.location.reload(); // Force reload to get fresh analytics data
        }, 1000);
      } else {
        toast.error(
          `Analytics collection failed: ${result.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error("Failed to collect analytics:", error);
      toast.error("Failed to collect analytics. Please try again.");
    } finally {
      setIsCollectingAnalytics(false);
    }
  };

  const confirmDelete = () => {
    if (post?.id) {
      deletePostMutation.mutate({ id: post.id });
    }
    setIsDeleteDialogOpen(false);
  };

  const handlePostSave = (updatedPost: any) => {
    // Refetch the post data to get the latest updates
    refetch();
    toast.success("Post updated successfully!");
  };

  const handlePostDelete = (postId: string) => {
    // This is called from the edit dialog if user deletes from there
    deletePostMutation.mutate({ id: postId });
  };

  // Convert mediaUrls to selectedFiles format for preview
  const selectedFiles = useMemo((): FileWithStablePreview[] => {
    if (!post?.mediaUrls?.length) return [];

    return post.mediaUrls.map((url, index) => {
      const fileName = url.split("/").pop() || `media-${index + 1}`;
      const fileType = url.match(/\.(jpg|jpeg|png|gif)$/i)
        ? `image/${url.match(/\.([^.]+)$/)?.[1] || "jpeg"}`
        : url.match(/\.(mp4|mov|avi)$/i)
          ? `video/${url.match(/\.([^.]+)$/)?.[1] || "mp4"}`
          : "image/jpeg";

      // Create a mock File object with required properties
      const mockFile = new File([], fileName, { type: fileType });

      // Add the additional properties needed for FileWithStablePreview
      return Object.assign(mockFile, {
        preview: url,
        stableId: `media-${index}-${Date.now()}`,
      }) as FileWithStablePreview;
    });
  }, [post?.mediaUrls]);

  // Check if post has any failed platforms
  const hasFailedPlatforms = post?.postSocialAccounts?.some(
    (psa) => psa.status === "FAILED"
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-6">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="container mx-auto p-4 md:p-6 max-w-2xl">
          <Card className="border-red-200 shadow-lg">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-red-800 mb-3">
                  Post Not Found
                </h3>
                <p className="text-red-600 mb-6 max-w-md">
                  The post you're looking for doesn't exist or has been deleted.
                </p>
                <Button
                  onClick={() => router.push("/posts")}
                  variant="outline"
                  size="lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Posts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[post.status] || statusConfig.DRAFT;
  const hasApprovalWorkflow = approvalInstances && approvalInstances.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Improved Proportional Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Section - Navigation & Title */}
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/posts")}
                className="hover:bg-gray-100 mt-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Post Details
                  </h1>
                  <Badge className={`${statusInfo.color} border px-2.5 py-1`}>
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor} mr-1.5`}
                    ></div>
                    {statusInfo.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Created by {post.user.name || post.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(
                        new Date(post.createdAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Scheduled for{" "}
                      {format(
                        new Date(post.scheduledAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-3 lg:flex-shrink-0">
              {/* Analytics Collection Button - Only show for published posts */}
              {post.status === "PUBLISHED" && (
                <Button
                  onClick={handleCollectAnalytics}
                  disabled={isCollectingAnalytics}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <BarChart3
                    className={`w-4 h-4 mr-2 ${isCollectingAnalytics ? "animate-spin" : ""}`}
                  />
                  {isCollectingAnalytics ? "Collecting..." : "Update Analytics"}
                </Button>
              )}

              <Button
                onClick={handleEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Post
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {hasFailedPlatforms && (
                    <DropdownMenuItem
                      onClick={handleRetry}
                      disabled={retryPostMutation.isPending}
                      className="text-blue-600 focus:text-blue-600"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${retryPostMutation.isPending ? "animate-spin" : ""}`}
                      />
                      {retryPostMutation.isPending
                        ? "Retrying..."
                        : "Retry Failed Posts"}
                    </DropdownMenuItem>
                  )}
                  {hasFailedPlatforms && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Post Preview */}
          <div className="lg:col-span-2">
            {/* Failed Posts Alert */}
            {hasFailedPlatforms && (
              <Card className="bg-red-50 border-red-200 shadow-sm mb-6">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 mb-1">
                        Publication Failed
                      </h3>
                      <p className="text-sm text-red-700 mb-3">
                        This post failed to publish to some platforms. Check the
                        platform details below and try again.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleRetry}
                          disabled={retryPostMutation.isPending}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <RefreshCw
                            className={`w-4 h-4 mr-2 ${retryPostMutation.isPending ? "animate-spin" : ""}`}
                          />
                          {retryPostMutation.isPending
                            ? "Retrying..."
                            : "Retry All Failed"}
                        </Button>
                        <span className="text-xs text-red-600">
                          or retry individual platforms below
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Post Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4">
                  <PostPreview
                    description={post.content}
                    selectedFiles={selectedFiles}
                    accountPostPreview={
                      post.postSocialAccounts[0]?.socialAccount || undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Info & Actions */}
          <div className="space-y-6">
            {/* Schedule Info */}
            <Card className="bg-white gap-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {format(new Date(post.scheduledAt), "EEEE, MMM d, yyyy")}
                  </div>
                  <div className="text-gray-500">
                    {format(new Date(post.scheduledAt), "h:mm a")}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Publishing Platforms Summary */}
            <Card className="bg-white gap-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-green-600" />
                    Platforms
                  </CardTitle>
                  {hasFailedPlatforms && (
                    <Badge variant="destructive" className="text-xs">
                      {
                        post.postSocialAccounts.filter(
                          (psa) => psa.status === "FAILED"
                        ).length
                      }{" "}
                      Failed
                    </Badge>
                  )}
                </div>
                {hasFailedPlatforms && (
                  <p className="text-xs text-gray-600 mt-1">
                    Some platforms failed to publish. Click retry to try again.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {post.postSocialAccounts.map((psa) => {
                    const account = psa.socialAccount;
                    if (!account) return null;

                    const config = platformConfig[account.platform];
                    // Get real analytics data for this platform
                    const platformAnalytics = analyticsData?.platforms?.find(
                      (p: any) => p.socialAccountId === account.id
                    );

                    return (
                      <div
                        key={psa.id}
                        className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 ${
                          psa.status === "FAILED"
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-r ${config.bgGradient} flex items-center justify-center text-white text-lg relative flex-shrink-0`}
                        >
                          {config.icon}
                          {psa.status === "FAILED" && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                              <XCircle className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 mb-1">
                            {account.name}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-600">
                              {config.name}
                            </div>
                            {psa.status === "PUBLISHED" && (
                              <div className="text-xs text-blue-600 font-medium">
                                {isAnalyticsLoading
                                  ? "Loading..."
                                  : platformAnalytics
                                    ? `${platformAnalytics.overview.views.toLocaleString()} views`
                                    : "No data"}
                              </div>
                            )}
                            {psa.status === "FAILED" && (
                              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                Failed to publish
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant={
                              psa.status === "PUBLISHED"
                                ? "default"
                                : psa.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs font-medium"
                          >
                            {psa.status}
                          </Badge>
                          {psa.status === "FAILED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleRetry}
                              disabled={retryPostMutation.isPending}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                              title="Retry publishing to this platform"
                            >
                              <RefreshCw
                                className={`w-4 h-4 ${retryPostMutation.isPending ? "animate-spin" : ""}`}
                              />
                              <span className="sr-only">Retry</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Approval Workflow */}
            {hasApprovalWorkflow && (
              <Card className="bg-white gap-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Approval Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailedApprovalStatus postId={postId} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Full-Width Analytics Section */}
        <Card className="bg-white shadow-sm mt-8">
          <CardHeader className="border-b">
            <CardTitle className="text-xl flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Analytics & Performance
              <Badge variant="secondary" className="ml-auto">
                {post.postSocialAccounts.length} Platform
                {post.postSocialAccounts.length > 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs
              defaultValue={post.postSocialAccounts[0]?.socialAccount?.id}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 mb-8 h-auto p-1 gap-2">
                {post.postSocialAccounts.map((psa) => {
                  const account = psa.socialAccount;
                  if (!account) return null;

                  const config = platformConfig[account.platform];
                  // Get real analytics data for this platform
                  const platformAnalytics = analyticsData?.platforms?.find(
                    (p: any) => p.socialAccountId === account.id
                  );

                  return (
                    <TabsTrigger
                      key={account.id}
                      value={account.id}
                      className="flex flex-col items-center gap-2 p-3 h-auto data-[state=active]:bg-blue-50 min-h-[100px] justify-center"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-r ${config.bgGradient} flex items-center justify-center text-white text-sm flex-shrink-0`}
                      >
                        {config.icon}
                      </div>
                      <div className="text-center w-full">
                        <div className="font-medium text-sm">{config.name}</div>
                        <div className="text-xs text-gray-500">
                          {isAnalyticsLoading
                            ? "Loading..."
                            : platformAnalytics
                              ? `${platformAnalytics.overview.views.toLocaleString()} views`
                              : "No data"}
                        </div>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {post.postSocialAccounts.map((psa) => {
                const account = psa.socialAccount;
                if (!account) return null;

                return (
                  <TabsContent
                    key={account.id}
                    value={account.id}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-r ${platformConfig[account.platform].bgGradient} flex items-center justify-center text-white text-xl`}
                        >
                          {platformConfig[account.platform].icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {account.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {platformConfig[account.platform].name} Performance
                            Analytics
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            psa.status === "PUBLISHED" ? "default" : "secondary"
                          }
                          className="px-3 py-1"
                        >
                          {psa.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>

                    <AccountAnalytics
                      account={account}
                      platform={account.platform}
                      analytics={analyticsData?.platforms?.find(
                        (p: any) => p.socialAccountId === account.id
                      )}
                      isLoading={isAnalyticsLoading}
                      error={analyticsError?.message}
                      postStatus={post.status}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Post Dialog */}
        <AddPostDialog
          post={post || null}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handlePostSave}
          onDelete={handlePostDelete}
          hideViewDetailsButton={true}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Delete Post
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be
                undone.
                {post?.status === "PUBLISHED" && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-red-800 text-sm">
                        <div className="font-semibold mb-1">
                          Warning: Post sudah dipublikasikan
                        </div>
                        <div className="space-y-1">
                          <p>
                            • Post ini sudah dipublikasikan ke platform sosial
                            media
                          </p>
                          <p>
                            • Menghapus hanya akan menghilangkan dari database
                            internal
                          </p>
                          <p>• Post akan tetap ada di platform sosial media</p>
                          <p>
                            • Anda perlu menghapus manual dari setiap platform
                            jika diperlukan
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deletePostMutation.isPending}
              >
                {deletePostMutation.isPending ? "Deleting..." : "Delete Post"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
