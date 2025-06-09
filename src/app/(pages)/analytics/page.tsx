"use client";
import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AnalyticsSidebar from "@/components/analytics/analytics-sidebar";
import OverviewSection from "@/components/analytics/overview-section";
import PostPerformanceSection from "@/components/analytics/post-performance";
import AudienceSection from "./audience";
import CompetitorBenchmarking from "@/components/analytics/competitor-benchmarking";
import PostTimeOptimizer from "@/components/analytics/post-time-optimizer";
import { trpc } from "@/lib/trpc/client";
import { useTeamContext } from "@/lib/contexts/team-context";
import SentimentAnalysis from "@/components/analytics/sentiment-analysis";
import { Loader2 } from "lucide-react";

const Analytics: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");

  const { currentTeamId } = useTeamContext();

  const { data: socialAccounts, isLoading: isLoadingSocialAccount } =
    trpc.onboarding.getSocialAccounts.useQuery(
      { teamId: currentTeamId! },
      {
        enabled: !!currentTeamId,
        refetchOnWindowFocus: false,
      }
    );

  // Fetch account-level insights
  const { data: accountInsight, isLoading: isLoadingAccountInsight } =
    trpc.realAnalytics.getAccountInsights.useQuery(
      { socialAccountId: selectedAccount! },
      { enabled: !!selectedAccount, refetchOnWindowFocus: false }
    );
  // Fetch collection stats for metrics
  const { data: stats, isLoading: isLoadingStats } =
    trpc.realAnalytics.getCollectionStats.useQuery(
      { teamId: currentTeamId!, days: 30 },
      { enabled: !!currentTeamId, refetchOnWindowFocus: false }
    );

  useEffect(() => {
    if (socialAccounts?.length && !selectedAccount) {
      setSelectedAccount(socialAccounts[0].id);
    }
  }, [socialAccounts, selectedAccount]);

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  const handleSectionNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  console.log("accountInsight", accountInsight);

  return (
    <div className="flex h-full">
      {/* Secondary Sidebar */}
      <AnalyticsSidebar
        socialAccounts={socialAccounts || []}
        isLoading={isLoadingSocialAccount}
        selectedAccount={selectedAccount}
        onSelectAccount={handleAccountSelect}
        activeSection={activeSection}
        onNavigateToSection={handleSectionNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-12">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Comprehensive insights for your social media performance
              </p>
            </div>

            {/* Account-level Insights */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isLoadingAccountInsight ? (
                <div className="col-span-full flex justify-center py-6">
                  <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
                </div>
              ) : accountInsight ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Followers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {accountInsight.followersCount.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Media Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {accountInsight.mediaCount.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="col-span-full text-center text-muted-foreground py-6">
                  Select an account to view insights.
                </div>
              )}
            </div>

            <OverviewSection
              accountInsight={{
                totalFollowers: accountInsight?.followersCount,
                totalPosts: accountInsight?.mediaCount,
                engagementRate: accountInsight?.engagementRate,
                avgReachPerPost: accountInsight?.avgReachPerPost,
                followerGrowth: accountInsight?.followerGrowth as any,
              }}
              stats={stats}
              isLoading={isLoadingAccountInsight || isLoadingStats}
            />

            <PostPerformanceSection />

            <AudienceSection />

            <section id="sentiment" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Sentiment Analysis</h2>
                <p className="text-muted-foreground">
                  Monitor brand perception and audience sentiment
                </p>
              </div>
              <SentimentAnalysis />
            </section>

            <section id="optimization" className="space-y-6">
              <PostTimeOptimizer
                socialAccountId={selectedAccount!}
                teamId={currentTeamId!}
              />
            </section>

            <section id="competitors" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Competitor Analysis</h2>
                <p className="text-muted-foreground">
                  See how you stack up against similar accounts
                </p>
              </div>
              <CompetitorBenchmarking />
            </section>

            <section id="custom-reports" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Custom Reports</h2>
                <p className="text-muted-foreground">
                  Create and schedule custom analytics reports
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Report Builder</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create custom reports with the metrics that matter most to
                      you.
                    </p>
                    <Button className="w-full">Build Custom Report</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Export your analytics data to PDF or CSV format.
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full">
                        Export to PDF
                      </Button>
                      <Button variant="outline" className="w-full">
                        Export to CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Schedule regular reports to be sent to your email.
                    </p>
                    <Button className="w-full">Schedule Report</Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Analytics;
