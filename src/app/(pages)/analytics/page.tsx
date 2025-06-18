"use client";
import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  Settings,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";

import AnalyticsSidebar from "@/components/analytics/analytics-sidebar";
import OverviewSection from "@/components/analytics/overview-section";
import PostPerformance from "@/components/analytics/post-performance";
import StoriesPerformance from "@/components/analytics/stories-performance";
import AudienceInsights from "@/components/analytics/audience-insights";
import HashtagAnalytics from "@/components/analytics/hashtag-analytics";
import LinkAnalytics from "@/components/analytics/link-analytics";
import SentimentAnalysis from "@/components/analytics/sentiment-analysis";
import PostTimeOptimizer from "@/components/analytics/post-time-optimizer";
import CompetitorBenchmarking from "@/components/analytics/competitor-benchmarking";
import { trpc } from "@/lib/trpc/client";
import { useTeamContext } from "@/lib/contexts/team-context";
import { Loader2 } from "lucide-react";

// Components
import AccountSelector from "@/components/analytics/account-selector";

const Analytics: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("INSTAGRAM");
  const [activeSection, setActiveSection] = useState("overview");
  const [isCollecting, setIsCollecting] = useState(false);

  const { currentTeamId } = useTeamContext();

  const { data: socialAccounts, isLoading: isLoadingSocialAccount } =
    trpc.onboarding.getSocialAccounts.useQuery(
      { teamId: currentTeamId! },
      {
        enabled: !!currentTeamId,
        refetchOnWindowFocus: false,
      }
    );

  // Auto-select first social account when accounts are loaded
  useEffect(() => {
    if (socialAccounts && socialAccounts.length > 0 && !selectedAccount) {
      const firstAccount = socialAccounts[0];
      setSelectedAccount(firstAccount.id);
      setSelectedPlatform(firstAccount.platform);
    }
  }, [socialAccounts, selectedAccount]);

  // Fetch account-level insights
  const {
    data: accountInsight,
    isLoading: isLoadingAccountInsight,
    refetch: refetchInsights,
  } = trpc.realAnalytics.getAccountInsights.useQuery(
    { socialAccountId: selectedAccount },
    { enabled: !!selectedAccount, refetchOnWindowFocus: false }
  );
  // Fetch collection stats for metrics
  const { data: stats, isLoading: isLoadingStats } =
    trpc.realAnalytics.getCollectionStats.useQuery(
      { teamId: currentTeamId!, days: 30 },
      { enabled: !!currentTeamId, refetchOnWindowFocus: false }
    );

  // Fetch collection status for selected account
  const { data: collectionStatus, isLoading: isLoadingCollectionStatus } =
    trpc.realAnalytics.getCollectionStatus.useQuery(
      { socialAccountId: selectedAccount },
      {
        enabled: !!selectedAccount,
        refetchOnWindowFocus: false,
        refetchInterval: 10000, // Refetch every 10 seconds to check status
      }
    );

  // Mutations
  const triggerCollection =
    trpc.realAnalytics.triggerAccountAnalyticsCollection.useMutation({
      onSuccess: (data) => {
        toast.success(data.message);
        // Refetch data after collection
        setTimeout(() => {
          refetchInsights();
        }, 5000); // Wait 5 seconds for collection to complete
      },
      onError: (error) => {
        toast.error(`Failed to trigger collection: ${error.message}`);
      },
      onSettled: () => {
        setIsCollecting(false);
      },
    });

  const handleTriggerCollection = async () => {
    if (!currentTeamId) {
      toast.error("No team selected");
      return;
    }

    setIsCollecting(true);
    triggerCollection.mutate({ teamId: currentTeamId });
  };

  const handleAccountChange = (accountId: string, platform: string) => {
    setSelectedAccount(accountId);
    setSelectedPlatform(platform);
  };

  const renderActiveSection = () => {
    if (!selectedAccount) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Pilih Akun untuk Melihat Analytics
            </h3>
            <p className="text-muted-foreground">
              Pilih akun media sosial untuk melihat data analytics dan insights
            </p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case "overview":
        return (
          <OverviewSection
            accountInsight={{
              // Basic metrics
              totalFollowers:
                accountInsight?.totalFollowers ||
                accountInsight?.followersCount,
              totalPosts:
                accountInsight?.totalPosts || accountInsight?.mediaCount,

              // Engagement metrics (comprehensive)
              totalLikes: accountInsight?.totalLikes,
              totalReactions: 0, // Facebook reactions (not implemented yet)
              totalComments: accountInsight?.totalComments,
              totalShares: accountInsight?.totalShares,
              totalSaves: accountInsight?.totalSaves,
              totalClicks: accountInsight?.totalClicks,

              // Reach & Impressions
              totalReach: accountInsight?.totalReach,
              totalImpressions: accountInsight?.totalImpressions,
              avgReachPerPost: accountInsight?.avgReachPerPost,

              // Calculated metrics
              engagementRate: accountInsight?.engagementRate,
              avgEngagementPerPost: accountInsight?.avgEngagementPerPost,
              avgClickThroughRate: accountInsight?.avgClickThroughRate,

              // Growth metrics
              followerGrowth: accountInsight?.followerGrowth as any,
              followersGrowthPercent:
                accountInsight?.followersGrowthPercent || 0,
              mediaGrowthPercent: accountInsight?.mediaGrowthPercent || 0,
              engagementGrowthPercent:
                accountInsight?.engagementGrowthPercent || 0,
              reachGrowthPercent: accountInsight?.reachGrowthPercent || 0,

              // Platform specific
              platform: selectedPlatform as "INSTAGRAM" | "FACEBOOK",
              bioLinkClicks: accountInsight?.bioLinkClicks,
              storyViews: accountInsight?.storyViews,
              profileVisits: accountInsight?.profileVisits,
            }}
            stats={stats}
            isLoading={isLoadingAccountInsight || isLoadingStats}
          />
        );
      case "posts":
        return <PostPerformance />;
      case "stories":
        return selectedPlatform === "INSTAGRAM" ? (
          <StoriesPerformance />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Stories analytics hanya tersedia untuk Instagram
          </div>
        );
      case "audience":
        return <AudienceInsights />;
      case "hashtags":
        return selectedPlatform === "INSTAGRAM" ? (
          <HashtagAnalytics />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Hashtag analytics hanya tersedia untuk Instagram
          </div>
        );
      case "links":
        return <LinkAnalytics />;
      default:
        return (
          <OverviewSection
            accountInsight={{
              // Basic metrics
              totalFollowers:
                accountInsight?.totalFollowers ||
                accountInsight?.followersCount,
              totalPosts:
                accountInsight?.totalPosts || accountInsight?.mediaCount,

              // Engagement metrics (comprehensive)
              totalLikes: accountInsight?.totalLikes,
              totalReactions: 0, // Facebook reactions (not implemented yet)
              totalComments: accountInsight?.totalComments,
              totalShares: accountInsight?.totalShares,
              totalSaves: accountInsight?.totalSaves,
              totalClicks: accountInsight?.totalClicks,

              // Reach & Impressions
              totalReach: accountInsight?.totalReach,
              totalImpressions: accountInsight?.totalImpressions,
              avgReachPerPost: accountInsight?.avgReachPerPost,

              // Calculated metrics
              engagementRate: accountInsight?.engagementRate,
              avgEngagementPerPost: accountInsight?.avgEngagementPerPost,
              avgClickThroughRate: accountInsight?.avgClickThroughRate,

              // Growth metrics
              followerGrowth: accountInsight?.followerGrowth as any,
              followersGrowthPercent:
                accountInsight?.followersGrowthPercent || 0,
              mediaGrowthPercent: accountInsight?.mediaGrowthPercent || 0,
              engagementGrowthPercent:
                accountInsight?.engagementGrowthPercent || 0,
              reachGrowthPercent: accountInsight?.reachGrowthPercent || 0,

              // Platform specific
              platform: selectedPlatform as "INSTAGRAM" | "FACEBOOK",
              bioLinkClicks: accountInsight?.bioLinkClicks,
              storyViews: accountInsight?.storyViews,
              profileVisits: accountInsight?.profileVisits,
            }}
            stats={stats}
            isLoading={isLoadingAccountInsight || isLoadingStats}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Analytics & Insights
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor performa konten dan audience insights
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Collection Status */}
              {selectedAccount && collectionStatus && (
                <Card className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      {collectionStatus.status === "collecting" ? (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      ) : collectionStatus.status === "ready" ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      ) : collectionStatus.status === "stale" ? (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      )}
                      <span className="text-muted-foreground">
                        {collectionStatus.status === "collecting"
                          ? "Mengumpulkan data..."
                          : collectionStatus.status === "ready"
                            ? "Data terbaru"
                            : collectionStatus.status === "stale"
                              ? "Data lama"
                              : "Belum ada data"}
                      </span>
                      {collectionStatus.lastCollected && (
                        <Badge variant="secondary" className="text-xs">
                          {new Date(
                            collectionStatus.lastCollected
                          ).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Global Coverage Stats */}
              {stats && (
                <Card className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-muted-foreground">Coverage:</span>
                      <Badge variant="secondary">
                        {Math.round(stats.coveragePercentage)}%
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}

              {/* Trigger Collection Button */}
              <Button
                onClick={handleTriggerCollection}
                disabled={isCollecting || !currentTeamId}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isCollecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {isCollecting ? "Mengumpulkan..." : "Update Data"}
              </Button>

              {/* Account Selector */}
              {/* <AccountSelector
                accounts={(socialAccounts || []).map((acc) => ({
                  id: acc.id,
                  name: acc.name || "Unknown",
                  username: acc.name || "unknown",
                  platform: acc.platform.toLowerCase() as any,
                  profileImage: acc.profilePicture || undefined,
                }))}
                selectedAccount={selectedAccount}
                onSelectAccount={(accountId) => {
                  const account = socialAccounts?.find(
                    (a) => a.id === accountId
                  );
                  if (account) {
                    handleAccountChange(accountId, account.platform);
                  }
                }}
              /> */}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <AnalyticsSidebar
              socialAccounts={socialAccounts || []}
              isLoading={isLoadingSocialAccount}
              selectedAccount={selectedAccount}
              onSelectAccount={(accountId) =>
                handleAccountChange(accountId, selectedPlatform)
              }
              activeSection={activeSection}
              onNavigateToSection={setActiveSection}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Loading State */}
            {isLoadingAccountInsight ||
              (isLoadingStats && selectedAccount && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-3">
                          <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-8 w-16 mb-2" />
                          <Skeleton className="h-3 w-20" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-64 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ))}

            {/* Collection Status Info */}
            {!isLoadingAccountInsight &&
              selectedAccount &&
              collectionStatus && (
                <>
                  {collectionStatus.status === "collecting" && (
                    <Alert>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertDescription>
                        Data analytics sedang dikumpulkan di background. Halaman
                        akan otomatis terupdate dalam beberapa menit.
                      </AlertDescription>
                    </Alert>
                  )}

                  {collectionStatus.status === "pending" && (
                    <Alert>
                      <AlertDescription>
                        Belum ada data analytics untuk akun ini. Data sedang
                        dikumpulkan di background setelah akun ditautkan. Klik
                        "Update Data" jika ingin memperbarui sekarang.
                      </AlertDescription>
                    </Alert>
                  )}

                  {collectionStatus.status === "stale" && (
                    <Alert>
                      <AlertDescription>
                        Data analytics sudah lama (terakhir:{" "}
                        {new Date(
                          collectionStatus.lastCollected!
                        ).toLocaleString()}
                        ). Klik "Update Data" untuk mengumpulkan data terbaru.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

            {/* Content */}
            {!isLoadingAccountInsight && (
              <div className="space-y-6">{renderActiveSection()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
