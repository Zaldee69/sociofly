"use client";
import React, { useState } from "react";
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

const Analytics: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<string | null>("1");
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

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    console.log("Selected account:", accountId);
  };

  const handleSectionNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
  };

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

            <OverviewSection />

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
              <div>
                <h2 className="text-2xl font-bold">Optimization Tips</h2>
                <p className="text-muted-foreground">
                  Data-driven recommendations to improve performance
                </p>
              </div>
              {/* {selectedAccount && currentTeamId && ( */}
              <PostTimeOptimizer
                socialAccountId={selectedAccount!}
                teamId={currentTeamId!}
              />
              {/* )} */}
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
