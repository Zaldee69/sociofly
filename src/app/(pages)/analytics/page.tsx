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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  RefreshCw,
  TrendingUp,
  Users,
  BarChart3,
  Calendar as CalendarIcon,
  Settings,
  PlayCircle,
  MessageSquare,
  Target,
  FileText,
  Filter,
  Clock,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import type { DateRange } from "react-day-picker";

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
import UpgradeOverlay from "@/components/analytics/upgrade-overlay";

import { trpc } from "@/lib/trpc/client";
import { useTeamContext } from "@/lib/contexts/team-context";
import { Loader2 } from "lucide-react";
import { useTeamFeatureFlag } from "@/lib/hooks/use-team-feature-flag";
import { Feature } from "@/config/feature-flags";

// Components
import AccountSelector from "@/components/analytics/account-selector";

const Analytics: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("INSTAGRAM");
  const [activeSection, setActiveSection] = useState("overview");
  const [isMainNavbarHidden, setIsMainNavbarHidden] = useState(false);
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date Range Filter State
  const [dateRange, setDateRange] = useState<{
    preset: string;
    startDate: Date;
    endDate: Date;
    days: number;
  }>({
    preset: "30days",
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    days: 30,
  });
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  const { currentTeamId } = useTeamContext();

  const { hasFeature } = useTeamFeatureFlag(currentTeamId || undefined);
  const canAccessAdvancedAnalytics = hasFeature(Feature.ADVANCED_ANALYTICS);

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

  // Fetch account-level insights from database (no real-time API calls)
  const {
    data: accountInsight,
    isLoading: isLoadingAccountInsight,
    isFetching: isFetchingAccountInsight,
    refetch: refetchInsights,
  } = trpc.analytics.database.getAccountAnalytics.useQuery(
    { socialAccountId: selectedAccount, days: dateRange.days },
    {
      enabled: !!selectedAccount,
      refetchOnWindowFocus: true,
      refetchInterval: 60000, // Auto-refresh every minute
      staleTime: 30000, // Consider data stale after 30 seconds
    }
  );
  // Fetch collection stats for metrics
  const { data: stats, isLoading: isLoadingStats } =
    trpc.analytics.database.getCollectionStats.useQuery(
      { teamId: currentTeamId!, days: dateRange.days },
      {
        enabled: !!currentTeamId,
        refetchOnWindowFocus: true,
        refetchInterval: 60000, // Auto-refresh every minute
        staleTime: 30000, // Consider data stale after 30 seconds
      }
    );

  // Fetch collection status for selected account from database
  const { data: collectionStatus, isLoading: isLoadingCollectionStatus } =
    trpc.analytics.database.getCollectionStatus.useQuery(
      { socialAccountId: selectedAccount },
      {
        enabled: !!selectedAccount,
        refetchOnWindowFocus: false,
        refetchInterval: 60000, // Refetch every 60 seconds (less frequent since it's from database)
      }
    );

  // Date Range Presets
  const datePresets = [
    { value: "today", label: "Hari Ini", days: 1 },
    { value: "yesterday", label: "Kemarin", days: 1 },
    { value: "7days", label: "7 Hari Terakhir", days: 7 },
    { value: "14days", label: "14 Hari Terakhir", days: 14 },
    { value: "30days", label: "30 Hari Terakhir", days: 30 },
    { value: "thisweek", label: "Minggu Ini", days: 7 },
    { value: "lastweek", label: "Minggu Lalu", days: 7 },
    { value: "thismonth", label: "Bulan Ini", days: 30 },
    { value: "lastmonth", label: "Bulan Lalu", days: 30 },
    { value: "3months", label: "3 Bulan Terakhir", days: 90 },
    { value: "6months", label: "6 Bulan Terakhir", days: 180 },
    { value: "1year", label: "1 Tahun Terakhir", days: 365 },
    { value: "custom", label: "Custom Range", days: 0 },
  ];

  // Handle date range preset change
  const handleDatePresetChange = (preset: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let days: number;

    switch (preset) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        days = 1;
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        days = 1;
        break;
      case "7days":
        startDate = subDays(now, 7);
        days = 7;
        break;
      case "14days":
        startDate = subDays(now, 14);
        days = 14;
        break;
      case "30days":
        startDate = subDays(now, 30);
        days = 30;
        break;
      case "thisweek":
        startDate = subDays(now, now.getDay());
        days = 7;
        break;
      case "lastweek":
        startDate = subDays(now, now.getDay() + 7);
        endDate = subDays(now, now.getDay() + 1);
        days = 7;
        break;
      case "thismonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        days = 30;
        break;
      case "lastmonth":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        days = 30;
        break;
      case "3months":
        startDate = subMonths(now, 3);
        days = 90;
        break;
      case "6months":
        startDate = subMonths(now, 6);
        days = 180;
        break;
      case "1year":
        startDate = subMonths(now, 12);
        days = 365;
        break;
      case "custom":
        if (customDateRange.from && customDateRange.to) {
          startDate = customDateRange.from;
          endDate = customDateRange.to;
          days = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        } else {
          return; // Don't update if custom range is not set
        }
        break;
      default:
        startDate = subDays(now, 7);
        days = 7;
    }

    setDateRange({
      preset,
      startDate,
      endDate,
      days,
    });
  };

  // Handle custom date range change
  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range) {
      setCustomDateRange({ from: range.from, to: range.to });
      if (range.from && range.to) {
        const days = Math.ceil(
          (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
        );
        setDateRange({
          preset: "custom",
          startDate: range.from,
          endDate: range.to,
          days,
        });
        setIsCustomDateOpen(false);
      }
    }
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
              {/* Date Range Filter */}
              {/* {canAccessAdvancedAnalytics && (
                <Card className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Periode:</span>
                    </div>

                    <Select
                      value={dateRange.preset}
                      onValueChange={handleDatePresetChange}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Pilih periode" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                            Quick Select
                          </div>
                          {datePresets.slice(0, 5).map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </div>

                        <div className="p-2 border-t">
                          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                            Weekly & Monthly
                          </div>
                          {datePresets.slice(5, 9).map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </div>

                        <div className="p-2 border-t">
                          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                            Long Term
                          </div>
                          {datePresets.slice(9, 12).map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground border-l pl-3">
                      <Badge variant="secondary" className="text-xs">
                        {dateRange.days} hari
                      </Badge>
                      <span className="text-xs">
                        {format(dateRange.startDate, "MMM dd")} -{" "}
                        {format(dateRange.endDate, "MMM dd")}
                      </span>
                    </div>
                  </div>
                </Card>
              )} */}

              {/* Collection Status */}
              {/* {canAccessAdvancedAnalytics &&
                selectedAccount &&
                collectionStatus && (
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
                )} */}

              {/* Global Coverage Stats */}
              {/* {canAccessAdvancedAnalytics &&
                stats &&
                stats.success &&
                stats.data && (
                  <Card className="px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-muted-foreground">Coverage:</span>
                        <Badge variant="secondary">
                          {stats.data.summary.uniqueAccountsTracked} accounts
                        </Badge>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline">
                          {stats.data.summary.totalAccountCollections}{" "}
                          collections
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )} */}

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
                        Belum ada data analytics untuk akun ini. Data akan
                        dikumpulkan otomatis pada penjadwalan berikutnya (setiap
                        hari pukul 6 pagi).
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
                        ). Data akan diperbarui otomatis pada penjadwalan
                        berikutnya.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

            {/* All Analytics Sections - Always Rendered */}
            {!isLoadingAccountInsight && selectedAccount && (
              <div className="space-y-12">
                {/* Overview & Growth Section - MERGED */}
                <section id="overview" className="scroll-mt-24 space-y-6">
                  <OverviewSection
                    accountInsight={{
                      // Basic metrics
                      totalFollowers: accountInsight?.followersCount,
                      totalPosts: accountInsight?.mediaCount,

                      // Engagement metrics (use available data or defaults)
                      totalLikes: (accountInsight as any)?.totalLikes || 0,
                      totalReactions: 0, // Facebook reactions (not implemented yet)
                      totalComments:
                        (accountInsight as any)?.totalComments || 0,
                      totalShares: (accountInsight as any)?.totalShares || 0,
                      totalSaves: (accountInsight as any)?.totalSaves || 0,
                      totalClicks: (accountInsight as any)?.totalClicks || 0,

                      // Reach & Impressions
                      totalReach: (accountInsight as any)?.totalReach || 0,
                      totalImpressions:
                        (accountInsight as any)?.totalImpressions || 0,
                      avgReachPerPost: accountInsight?.avgReachPerPost,

                      // Calculated metrics
                      engagementRate: accountInsight?.engagementRate,
                      avgEngagementPerPost:
                        (accountInsight as any)?.avgEngagementPerPost || 0,
                      avgClickThroughRate:
                        (accountInsight as any)?.avgClickThroughRate || 0,

                      // Pre-calculated averages from database
                      avgLikesPerPost:
                        (accountInsight as any)?.avgLikesPerPost || 0,
                      avgCommentsPerPost:
                        (accountInsight as any)?.avgCommentsPerPost || 0,
                      avgSharesPerPost:
                        (accountInsight as any)?.avgSharesPerPost || 0,
                      avgSavesPerPost:
                        (accountInsight as any)?.avgSavesPerPost || 0,

                      // Analytics metadata
                      postsAnalyzed:
                        (accountInsight as any)?.postsAnalyzed || 0,
                      totalPostsOnPlatform:
                        (accountInsight as any)?.totalPostsOnPlatform ||
                        accountInsight?.mediaCount ||
                        0,

                      // Growth metrics
                      followerGrowth: accountInsight?.followerGrowth || null,
                      mediaGrowth: accountInsight?.mediaGrowth || null,
                      engagementGrowth:
                        accountInsight?.engagementGrowth || null,
                      reachGrowth: accountInsight?.reachGrowth || null,

                      // Previous period values
                      previousFollowersCount:
                        accountInsight?.followerGrowth?.previous || 0,
                      previousMediaCount:
                        accountInsight?.mediaGrowth?.previous || 0,
                      previousEngagementRate:
                        accountInsight?.engagementGrowth?.previous || 0,
                      previousAvgReachPerPost:
                        accountInsight?.reachGrowth?.previous || 0,

                      // Platform specific
                      platform: selectedPlatform as "INSTAGRAM" | "FACEBOOK",
                      bioLinkClicks:
                        (accountInsight as any)?.bioLinkClicks || 0,
                      storyViews: (accountInsight as any)?.storyViews || 0,
                      profileVisits: accountInsight?.profileVisits,

                      // New fields for post analytics integration
                      socialAccountId: selectedAccount,
                      teamId: currentTeamId!,
                    }}
                    stats={stats}
                    isLoading={isLoadingAccountInsight || isLoadingStats}
                  />
                </section>

                {/* Stories Section - Instagram Only */}
                {selectedPlatform === "INSTAGRAM" && (
                  <section id="stories" className="scroll-mt-24">
                    <UpgradeOverlay
                      title="Stories Performance"
                      description="Analyze your Instagram Stories performance with detailed metrics and engagement insights."
                      features={[
                        "Story views tracking",
                        "Engagement metrics",
                        "Performance trends",
                      ]}
                      showOverlay={!canAccessAdvancedAnalytics}
                    >
                      <StoriesPerformance platform="instagram" />
                    </UpgradeOverlay>
                  </section>
                )}

                {/* Audience Section */}
                <section id="audience" className="scroll-mt-24">
                  <UpgradeOverlay
                    title="Audience Insights"
                    description="Understand your audience demographics, interests, and behavior patterns."
                    features={[
                      "Demographics analysis",
                      "Interest insights",
                      "Behavior patterns",
                    ]}
                    showOverlay={!canAccessAdvancedAnalytics}
                  >
                    <AudienceInsights />
                  </UpgradeOverlay>
                </section>

                {/* Hashtags Section - Instagram Only */}
                {selectedPlatform === "INSTAGRAM" && (
                  <section id="hashtags" className="scroll-mt-24">
                    <UpgradeOverlay
                      title="Hashtag Analytics"
                      description="Optimize your hashtag strategy with performance insights and recommendations."
                      features={[
                        "Hashtag performance",
                        "Reach analysis",
                        "Strategy recommendations",
                      ]}
                      showOverlay={!canAccessAdvancedAnalytics}
                    >
                      <HashtagAnalytics />
                    </UpgradeOverlay>
                  </section>
                )}

                {/* Links Section */}
                <section id="links" className="scroll-mt-24">
                  <UpgradeOverlay
                    title="Link Analytics"
                    description="Track link clicks, traffic sources, and conversion metrics."
                    features={[
                      "Click tracking",
                      "Traffic analysis",
                      "Conversion metrics",
                    ]}
                    showOverlay={!canAccessAdvancedAnalytics}
                  >
                    <LinkAnalytics />
                  </UpgradeOverlay>
                </section>

                {/* Sentiment Section */}
                <section id="sentiment" className="scroll-mt-24">
                  <UpgradeOverlay
                    title="Sentiment Analysis"
                    description="Analyze audience sentiment and emotional responses to your content."
                    features={[
                      "Sentiment tracking",
                      "Emotion analysis",
                      "Content insights",
                    ]}
                    showOverlay={!canAccessAdvancedAnalytics}
                  >
                    <SentimentAnalysis />
                  </UpgradeOverlay>
                </section>

                {/* Optimization Section */}
                <section id="optimization" className="scroll-mt-24">
                  <UpgradeOverlay
                    title="Post Time Optimization"
                    description="Find the best times to post for maximum engagement and reach."
                    features={[
                      "Optimal timing",
                      "Engagement patterns",
                      "Posting recommendations",
                    ]}
                    showOverlay={!canAccessAdvancedAnalytics}
                  >
                    <PostTimeOptimizer
                      socialAccountId={selectedAccount}
                      teamId={currentTeamId!}
                    />
                  </UpgradeOverlay>
                </section>

                {/* Competitors Section */}
                <section id="competitors" className="scroll-mt-24">
                  <UpgradeOverlay
                    title="Competitor Benchmarking"
                    description="Compare your performance against competitors and industry benchmarks."
                    features={[
                      "Competitor analysis",
                      "Industry benchmarks",
                      "Performance comparison",
                    ]}
                    showOverlay={!canAccessAdvancedAnalytics}
                  >
                    <CompetitorBenchmarking
                      platform={selectedPlatform.toLowerCase()}
                    />
                  </UpgradeOverlay>
                </section>

                {/* Custom Reports Section */}
                <section id="custom-reports" className="scroll-mt-24">
                  <UpgradeOverlay
                    title="Custom Reports"
                    description="Create and schedule custom reports tailored to your specific needs."
                    features={[
                      "Custom reporting",
                      "Scheduled reports",
                      "Data export",
                    ]}
                    showOverlay={!canAccessAdvancedAnalytics}
                  >
                    <CustomReports
                      userPlan="enterprise"
                      socialAccountId={selectedAccount || undefined}
                      teamId={currentTeamId || undefined}
                    />
                  </UpgradeOverlay>
                </section>

                {/* Coming Soon Features Section */}
                <section id="coming-soon" className="scroll-mt-24">
                  <ComingSoonFeatures />
                </section>
              </div>
            )}

            {/* No Account Selected State - Only show when accounts loaded but none selected */}
            {!canAccessAdvancedAnalytics &&
              !selectedAccount &&
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
            {!canAccessAdvancedAnalytics &&
              !isLoadingSocialAccount &&
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

            {canAccessAdvancedAnalytics &&
              !selectedAccount &&
              !isLoadingSocialAccount &&
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

            {canAccessAdvancedAnalytics &&
              !isLoadingSocialAccount &&
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
