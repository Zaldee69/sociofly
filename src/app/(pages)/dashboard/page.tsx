"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Calendar,
  ChevronUp,
  Clock,
  Users,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

// Mock data (can be replaced with actual API calls)
const teams = [{ id: 1 }, { id: 2 }, { id: 3 }];
const socialAccounts = [{ id: 1 }, { id: 2 }, { id: 3 }];
// Using static timestamps to prevent hydration mismatch
const recentActivities = [
  {
    id: 1,
    user: "John Doe",
    action: "scheduled a post",
    target: "Company Twitter",
    time: new Date("2024-01-15T14:30:00Z"),
  },
  {
    id: 2,
    user: "Jane Smith",
    action: "edited a draft",
    target: "Sales Facebook",
    time: new Date("2024-01-15T13:45:00Z"),
  },
  {
    id: 3,
    user: "Mike Johnson",
    action: "published a post",
    target: "Company Instagram",
    time: new Date("2024-01-15T12:20:00Z"),
  },
];
// Notifications data removed - no longer used

import { LucideProps } from "lucide-react";
import React from "react";

// Type definitions
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<LucideProps>;
  trend?: string;
  color: string;
}



// Notification types removed - no longer used

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
}) => (
  <Card className={`border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <div className={`p-3 rounded-xl bg-gradient-to-br from-${color}-100 to-${color}-200 shadow-sm`}>
          <Icon className={`w-5 h-5 text-${color}-700`} />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-2xl font-bold text-slate-900 mb-2">{value}</div>
      {trend && (
        <p className="text-xs text-slate-500 flex items-center">
          <ChevronUp className="h-3 w-3 text-emerald-500 mr-1" />
          {trend} from last month
        </p>
      )}
    </CardContent>
  </Card>
);



// NotificationAlert component removed - no longer used

import WelcomeBanner from "./components/welcome-banner";
import UpcomingPosts from "./components/upcoming-posts";
import PerformanceChart from "./components/performance-chart";
import TeamAndAccountStats from "./components/team-and-account-stats";

const Dashboard = () => {
  const { user } = useUser();
  // Notifications functionality removed

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <WelcomeBanner />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-8 space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Your Teams"
                value={teams.length}
                icon={Users}
                color="purple"
              />
              <StatCard
                title="Social Accounts"
                value={socialAccounts.length}
                icon={LayoutDashboard}
                color="indigo"
              />
              <StatCard
                title="Scheduled Posts"
                value="12"
                icon={Calendar}
                color="green"
              />
              <StatCard
                title="Engagement Rate"
                value="3.2%"
                icon={BarChart}
                trend="+1.2%"
                color="blue"
              />
            </div>

            {/* Performance Chart */}
            <div className="w-full">
              <PerformanceChart />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            <TeamAndAccountStats />
            <UpcomingPosts />
            {/* Notifications card removed - no longer used */}

            {/* Recent Activities */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-200">
                    <Clock size={18} className="text-emerald-700" />
                  </div>
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50/50 transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-sm"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800 leading-relaxed">
                          <span className="font-semibold text-slate-900">{activity.user}</span>{" "}
                          {activity.action} on{" "}
                          <span className="font-semibold text-indigo-600">
                            {activity.target}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(activity.time, "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-4 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                  asChild
                >
                  <Link href="#activity">
                    View all activities
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
