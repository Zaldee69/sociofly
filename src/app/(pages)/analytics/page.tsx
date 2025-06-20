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
  MessageSquare,
  Target,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
import ComingSoonFeatures from "@/components/analytics/coming-soon-features";
import CustomReports from "@/components/analytics/custom-reports";
import { GrowthComparisonCards } from "@/components/analytics/growth-comparison-cards";
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
  const [isMainNavbarHidden, setIsMainNavbarHidden] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Handle scroll to hide/show main navbar and detect active section
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const analyticsHeader = document.getElementById("analytics-header");
          const mainNavbar = document.querySelector(
            "[data-main-navbar]"
          ) as HTMLElement;

          // Show main navbar only when at the very top (0-20px)
          // Hide main navbar when scrolled down
          if (currentScrollY <= 20) {
            // At the very top - show main navbar
            if (mainNavbar) {
              mainNavbar.style.transform = "translateY(0)";
              mainNavbar.style.transition = "transform 0.3s ease-in-out";
            }
            if (analyticsHeader) {
              analyticsHeader.style.top = "64px"; // Height of main navbar
            }
            // Update sidebar position and height
            document.documentElement.style.setProperty(
              "--sidebar-top",
              "calc(64px + 80px)"
            );
            document.documentElement.style.setProperty(
              "--sidebar-height",
              "calc(100vh - 144px)"
            );
            setIsMainNavbarHidden(false);
          } else {
            // Scrolled down - hide main navbar
            if (mainNavbar) {
              mainNavbar.style.transform = "translateY(-100%)";
              mainNavbar.style.transition = "transform 0.3s ease-in-out";
            }
            if (analyticsHeader) {
              analyticsHeader.style.top = "0px";
            }
            // Update sidebar position and height
            document.documentElement.style.setProperty("--sidebar-top", "80px");
            document.documentElement.style.setProperty(
              "--sidebar-height",
              "calc(100vh - 80px)"
            );
            setIsMainNavbarHidden(true);
          }

          // Detect active section
          const sections = [
            "overview",
            "comparison",
            "posts",
            "stories",
            "audience",
            "hashtags",
            "links",
            "sentiment",
            "optimization",
            "competitors",
            "custom-reports",
            "coming-soon",
          ];

          const headerHeight = isMainNavbarHidden ? 80 : 144; // Analytics header height
          const offset = headerHeight + 20; // Smaller buffer for more accurate detection

          let newActiveSection = activeSection;
          let minDistance = Infinity;

          // Find the section that is closest to the top of the viewport
          for (const sectionId of sections) {
            const element = document.getElementById(sectionId);
            if (element) {
              const rect = element.getBoundingClientRect();
              const elementTop = rect.top;
              const elementBottom = rect.bottom;

              // Check if section is visible in viewport
              if (elementBottom > 0 && elementTop < window.innerHeight) {
                // Calculate distance from the offset point
                const distanceFromOffset = Math.abs(elementTop - offset);

                // If this section is closer to the offset than previous ones
                if (distanceFromOffset < minDistance) {
                  minDistance = distanceFromOffset;
                  newActiveSection = sectionId;
                }
              }
            }
          }

          // Only update if there's a change and it's not manual navigation
          if (newActiveSection !== activeSection && !isManualNavigation) {
            setActiveSection(newActiveSection);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    // Run on mount to set initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeSection, isMainNavbarHidden, isManualNavigation]);

  // Fetch account-level insights
  const {
    data: accountInsight,
    isLoading: isLoadingAccountInsight,
    isFetching: isFetchingAccountInsight,
    refetch: refetchInsights,
  } = trpc.realAnalytics.getAccountInsights.useQuery(
    { socialAccountId: selectedAccount },
    {
      enabled: !!selectedAccount,
      refetchOnWindowFocus: false,
      refetchInterval: 30000, // Auto-refresh every 30 seconds
      staleTime: 25000, // Consider data stale after 25 seconds
    }
  );
  // Fetch collection stats for metrics
  const { data: stats, isLoading: isLoadingStats } =
    trpc.realAnalytics.getCollectionStats.useQuery(
      { teamId: currentTeamId!, days: 30 },
      {
        enabled: !!currentTeamId,
        refetchOnWindowFocus: false,
        refetchInterval: 60000, // Auto-refresh every 60 seconds
        staleTime: 55000, // Consider data stale after 55 seconds
      }
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

  // Fetch growth comparison data
  const { data: growthData, isLoading: isLoadingGrowth } =
    trpc.analyticsComparison.getGrowthSummary.useQuery(
      { socialAccountId: selectedAccount },
      {
        enabled: !!selectedAccount,
        refetchOnWindowFocus: false,
        refetchInterval: 45000, // Auto-refresh every 45 seconds
        staleTime: 40000, // Consider data stale after 40 seconds
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

  const handleNavigateToSection = (sectionId: string) => {
    // Set manual navigation flag to prevent scroll detection interference
    setIsManualNavigation(true);
    setActiveSection(sectionId);

    // Reset manual navigation flag after scroll animation completes
    setTimeout(() => {
      setIsManualNavigation(false);
    }, 1000); // Give enough time for smooth scroll to complete
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ scrollBehavior: "smooth" }}
    >
      {/* Header */}
      <div
        className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40 transition-transform duration-300"
        id="analytics-header"
      >
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

              {/* Auto-refresh Indicator */}
              {isFetchingAccountInsight && !isLoadingAccountInsight && (
                <Card className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-muted-foreground">
                      Refreshing data...
                    </span>
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

      <div className="w-full">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <AnalyticsSidebar
              socialAccounts={socialAccounts || []}
              isLoading={isLoadingSocialAccount}
              selectedAccount={selectedAccount}
              onSelectAccount={(accountId) => {
                const account = socialAccounts?.find(
                  (acc) => acc.id === accountId
                );
                if (account) {
                  handleAccountChange(accountId, account.platform);
                }
              }}
              activeSection={activeSection}
              onNavigateToSection={handleNavigateToSection}
              disableTransition={isManualNavigation}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 px-6 py-6 overflow-x-hidden">
            {/* Unified Loading State */}
            {(isLoadingSocialAccount ||
              (isLoadingAccountInsight && selectedAccount) ||
              (isLoadingStats && selectedAccount)) && (
              <div className="space-y-8">
                {/* Loading Header */}
                <div className="text-center py-8">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="relative">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {isLoadingSocialAccount
                          ? "Loading Your Accounts"
                          : "Loading Analytics Data"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isLoadingSocialAccount
                          ? "Fetching your connected social media accounts..."
                          : "Fetching insights for your selected account..."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show skeleton only when loading analytics data */}
                {!isLoadingSocialAccount &&
                  (isLoadingAccountInsight || isLoadingStats) && (
                    <div className="space-y-8">
                      {/* Overview Section Skeleton */}
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-32" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className="relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-4 w-4 rounded" />
                                </div>
                              </CardHeader>
                              <CardContent>
                                <Skeleton className="h-8 w-20 mb-3" />
                                <div className="space-y-2">
                                  <Skeleton className="h-3 w-16" />
                                  <Skeleton className="h-2 w-full" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Comparison Section Skeleton */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-6 w-40" />
                          </div>
                          <Skeleton className="h-8 w-32" />
                        </div>
                        <Card className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-3">
                                  <Skeleton className="h-16 w-full" />
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Additional Sections Skeleton */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Card key={i} className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                            <CardHeader>
                              <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                              <Skeleton className="h-32 w-full mb-4" />
                              <div className="space-y-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

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

            {/* All Analytics Sections - Always Rendered */}
            {!isLoadingAccountInsight && selectedAccount && (
              <div className="space-y-12">
                {/* Overview Section */}
                <section id="overview" className="scroll-mt-24">
                  <OverviewSection
                    accountInsight={{
                      // Basic metrics
                      totalFollowers:
                        accountInsight?.totalFollowers ||
                        accountInsight?.followersCount,
                      totalPosts:
                        accountInsight?.totalPosts ||
                        accountInsight?.mediaCount,

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
                      avgEngagementPerPost:
                        accountInsight?.avgEngagementPerPost,
                      avgClickThroughRate: accountInsight?.avgClickThroughRate,

                      // Growth metrics
                      followerGrowth: accountInsight?.followerGrowth as any,
                      followersGrowthPercent:
                        accountInsight?.followersGrowthPercent || 0,
                      mediaGrowthPercent:
                        accountInsight?.mediaGrowthPercent || 0,
                      engagementGrowthPercent:
                        accountInsight?.engagementGrowthPercent || 0,
                      reachGrowthPercent:
                        accountInsight?.reachGrowthPercent || 0,

                      // Platform specific
                      platform: selectedPlatform as "INSTAGRAM" | "FACEBOOK",
                      bioLinkClicks: accountInsight?.bioLinkClicks,
                      storyViews: accountInsight?.storyViews,
                      profileVisits: accountInsight?.profileVisits,
                    }}
                    stats={stats}
                    isLoading={isLoadingAccountInsight || isLoadingStats}
                  />
                </section>

                {/* Comparison Section */}
                <section id="comparison" className="scroll-mt-24">
                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-semibold">
                          Growth Comparison
                        </h2>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/analytics/comparison">
                          View Detailed Analysis
                        </Link>
                      </Button>
                    </div>
                    {isLoadingGrowth ? (
                      <div className="text-center py-8">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading growth comparison...</span>
                        </div>
                      </div>
                    ) : growthData ? (
                      <GrowthComparisonCards
                        data={growthData as any}
                        isLoading={false}
                        comparisonType="day"
                      />
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No Growth Data Available
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Growth comparison data will appear here once analytics
                          are collected
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Posts Section */}
                <section id="posts" className="scroll-mt-24">
                  <PostPerformance
                    socialAccountId={selectedAccount}
                    teamId={currentTeamId || undefined}
                  />
                </section>

                {/* Stories Section - Instagram Only */}
                {selectedPlatform === "INSTAGRAM" && (
                  <section id="stories" className="scroll-mt-24">
                    <StoriesPerformance platform="instagram" />
                  </section>
                )}

                {/* Audience Section */}
                <section id="audience" className="scroll-mt-24">
                  <AudienceInsights />
                </section>

                {/* Hashtags Section - Instagram Only */}
                {selectedPlatform === "INSTAGRAM" && (
                  <section id="hashtags" className="scroll-mt-24">
                    <HashtagAnalytics />
                  </section>
                )}

                {/* Links Section */}
                <section id="links" className="scroll-mt-24">
                  <LinkAnalytics />
                </section>

                {/* Sentiment Section */}
                <section id="sentiment" className="scroll-mt-24">
                  <SentimentAnalysis />
                </section>

                {/* Optimization Section */}
                <section id="optimization" className="scroll-mt-24">
                  <PostTimeOptimizer
                    socialAccountId={selectedAccount}
                    teamId={currentTeamId!}
                  />
                </section>

                {/* Competitors Section */}
                <section id="competitors" className="scroll-mt-24">
                  <CompetitorBenchmarking
                    platform={selectedPlatform.toLowerCase()}
                  />
                </section>

                {/* Custom Reports Section */}
                <section id="custom-reports" className="scroll-mt-24">
                  <CustomReports
                    userPlan="enterprise"
                    socialAccountId={selectedAccount || undefined}
                    teamId={currentTeamId || undefined}
                  />
                </section>

                {/* Coming Soon Features Section */}
                <section id="coming-soon" className="scroll-mt-24">
                  <ComingSoonFeatures />
                </section>
              </div>
            )}

            {/* No Account Selected State - Only show when accounts loaded but none selected */}
            {!selectedAccount &&
              !isLoadingSocialAccount &&
              !isLoadingAccountInsight &&
              socialAccounts &&
              socialAccounts.length > 0 && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center max-w-md mx-auto">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <BarChart3 className="h-20 w-20 mx-auto text-primary relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-foreground">
                      Welcome to Analytics Dashboard
                    </h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      Get powerful insights into your social media performance.
                      Select a social media account from the sidebar to start
                      exploring your analytics data and audience insights.
                    </p>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Real-time data updates</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Comprehensive performance metrics</span>
                      </div>
                      <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Growth tracking & comparisons</span>
                      </div>
                    </div>
                    <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        👈 Select from {socialAccounts.length} connected account
                        {socialAccounts.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* No Social Accounts Found State */}
            {!isLoadingSocialAccount &&
              socialAccounts &&
              socialAccounts.length === 0 && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center max-w-md mx-auto">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <Users className="h-20 w-20 mx-auto text-orange-500 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-foreground">
                      No Social Accounts Connected
                    </h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      You need to connect at least one social media account to
                      view analytics. Head to the onboarding or settings to
                      connect your accounts.
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/onboarding">Connect Social Accounts</Link>
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
