"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CompetitorBenchmarking from "@/components/analytics/competitor-benchmarking";
import PostTimeOptimizer from "@/components/analytics/post-time-optimizer";
import SentimentAnalysis from "@/components/analytics/sentimen-analysis";
import ContentIdeaGenerator from "@/components/analytics/content-idea-generator";
import PostAnalysis from "@/components/analytics/post-analysis";
import { Instagram, Facebook, Twitter } from "lucide-react";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Monitor engagement metrics, compare against competitors, and optimize your social media strategy.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <button
          onClick={() => setSelectedPlatform("instagram")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedPlatform === "instagram" ? "bg-purple-100 text-purple-600" : "hover:bg-gray-100"
          }`}
        >
          <Instagram className="h-5 w-5" />
          Instagram
        </button>
        <button
          onClick={() => setSelectedPlatform("facebook")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedPlatform === "facebook" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100"
          }`}
        >
          <Facebook className="h-5 w-5" />
          Facebook
        </button>
        <button
          onClick={() => setSelectedPlatform("twitter")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            selectedPlatform === "twitter" ? "bg-sky-100 text-sky-600" : "hover:bg-gray-100"
          }`}
        >
          <Twitter className="h-5 w-5" />
          Twitter
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="post-analysis">Post Analysis</TabsTrigger>
          <TabsTrigger value="competitors">Competitor Analysis</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="content">Content Ideas</TabsTrigger>
          <TabsTrigger value="optimization">Posting Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <CardDescription>Across all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15,800</div>
                <p className="text-xs text-muted-foreground">
                  +8.2% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <CardDescription>Average across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2%</div>
                <p className="text-xs text-muted-foreground">
                  +0.3% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Post Reach</CardTitle>
                <CardDescription>Average per post</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3,450</div>
                <p className="text-xs text-muted-foreground">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>
                Overview of your social media performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center border rounded-md bg-muted/20">
                <p className="text-sm text-muted-foreground">Performance chart will be displayed here</p>
              </div>
            </CardContent>
          </Card>

          <PostTimeOptimizer platform={selectedPlatform} />
        </TabsContent>

        <TabsContent value="post-analysis">
          <PostAnalysis platform={selectedPlatform} />
        </TabsContent>

        <TabsContent value="competitors">
          <CompetitorBenchmarking platform={selectedPlatform} />
        </TabsContent>

        <TabsContent value="sentiment">
          <SentimentAnalysis platform={selectedPlatform} />
        </TabsContent>

        <TabsContent value="content">
          <ContentIdeaGenerator platform={selectedPlatform} />
        </TabsContent>

        <TabsContent value="optimization">
          <PostTimeOptimizer platform={selectedPlatform} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;