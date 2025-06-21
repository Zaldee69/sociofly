"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Construction, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AnalyticsComparisonPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Analytics
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Analytics Comparison
                </h1>
                <p className="text-muted-foreground mt-1">
                  Compare performance across different time periods
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Construction className="h-16 w-16 text-blue-600" />
                  <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
              <CardTitle className="text-xl">
                ✨ Advanced Comparison Features Coming Soon!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                We're building powerful comparison features with the new
                Enhanced Analytics system (Phase 4). This will include detailed
                trend analysis, growth metrics, and intelligent insights.
              </p>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-left">
                  <h4 className="font-medium text-blue-900 mb-2">
                    🚀 Coming Features:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Side-by-side period comparison</li>
                    <li>• Growth trend visualization</li>
                    <li>• Performance insights & recommendations</li>
                    <li>• Custom date range comparison</li>
                    <li>• Export comparison reports</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/analytics">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Explore Main Analytics (Phase 4 Ready!)
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    The main analytics page already includes Phase 4
                    enhancements with
                    <span className="font-medium text-blue-600">
                      {" "}
                      60-80% faster performance
                    </span>{" "}
                    and advanced insights.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
