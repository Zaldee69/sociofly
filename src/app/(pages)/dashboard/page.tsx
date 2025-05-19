"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Calendar,
  ChevronUp,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Instagram,
  MessageSquare,
  Plus,
  Settings,
  ThumbsUp,
  TrendingUp,
  Twitter,
  Facebook,
  Users,
  UserCog,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { useState } from "react";
import Link from "next/link";

// Mock data for teams
const teams = [
  {
    id: 1,
    name: "Marketing Team",
    members: 5,
    accounts: 3,
    role: "ADMIN",
    lastActive: new Date(2025, 3, 20),
  },
  {
    id: 2,
    name: "Sales Department",
    members: 8,
    accounts: 4,
    role: "EDITOR",
    lastActive: new Date(2025, 3, 21),
  },
  {
    id: 3,
    name: "Support Team",
    members: 3,
    accounts: 2,
    role: "VIEWER",
    lastActive: new Date(2025, 3, 22),
  },
  {
    id: 4,
    name: "Product Development",
    members: 6,
    accounts: 1,
    role: "ADMIN",
    lastActive: new Date(2025, 3, 23),
  },
];

// Mock data for social accounts
const socialAccounts = [
  {
    id: 1,
    name: "Company Twitter",
    platform: "twitter",
    username: "@companyofficial",
    team: "Marketing Team",
    followers: 12500,
    engagement: "+5.2%",
  },
  {
    id: 2,
    name: "Company Instagram",
    platform: "instagram",
    username: "@companyofficial",
    team: "Marketing Team",
    followers: 45700,
    engagement: "+8.7%",
  },
  {
    id: 3,
    name: "Sales Facebook",
    platform: "facebook",
    username: "Company Sales",
    team: "Sales Department",
    followers: 32100,
    engagement: "-1.3%",
  },
  {
    id: 4,
    name: "Support Twitter",
    platform: "twitter",
    username: "@companysupport",
    team: "Support Team",
    followers: 8750,
    engagement: "+2.1%",
  },
];

// Mock data for recent activities
const recentActivities = [
  {
    id: 1,
    user: "John Doe",
    action: "scheduled a post",
    target: "Company Twitter",
    time: new Date(2025, 3, 22, 14, 35),
  },
  {
    id: 2,
    user: "Jane Smith",
    action: "edited a draft",
    target: "Sales Facebook",
    time: new Date(2025, 3, 22, 13, 20),
  },
  {
    id: 3,
    user: "Mike Johnson",
    action: "published a post",
    target: "Company Instagram",
    time: new Date(2025, 3, 22, 11, 45),
  },
  {
    id: 4,
    user: "Sarah Williams",
    action: "approved a comment",
    target: "Support Twitter",
    time: new Date(2025, 3, 22, 10, 15),
  },
];

// Mock notifications for each role
const notifications = {
  ADMIN: [
    {
      id: 1,
      message: "New team member request pending approval",
      urgent: true,
    },
    { id: 2, message: "Billing information needs to be updated", urgent: true },
    { id: 3, message: "Usage limits approaching threshold", urgent: false },
  ],
  EDITOR: [
    { id: 1, message: "2 posts waiting for your review", urgent: true },
    {
      id: 2,
      message: "Instagram API access token expiring soon",
      urgent: false,
    },
  ],
  VIEWER: [
    { id: 1, message: "Weekly analytics report is available", urgent: false },
  ],
};

// Platform icons
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "twitter":
      return <Twitter size={16} className="text-[#1DA1F2]" />;
    case "instagram":
      return <Instagram size={16} className="text-[#E1306C]" />;
    case "facebook":
      return <Facebook size={16} className="text-[#4267B2]" />;
    default:
      return <Twitter size={16} className="text-[#1DA1F2]" />;
  }
};

// Role badge styling
const getRoleBadge = (role: string) => {
  switch (role) {
    case "ADMIN":
      return <Badge className="bg-purple-600">Admin</Badge>;
    case "EDITOR":
      return <Badge className="bg-blue-600">Editor</Badge>;
    case "VIEWER":
      return <Badge variant="outline">Viewer</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRole, setSelectedRole] = useState("ADMIN"); // For demonstration, we'll show ADMIN view by default

  const currentUserNotifications =
    notifications[selectedRole as keyof typeof notifications] || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center">
              <Bell size={18} className="mr-2" />
              Notifications
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentUserNotifications.length > 0 ? (
            <div className="space-y-4">
              {currentUserNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-md border ${notification.urgent ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {notification.urgent && (
                        <Badge variant="destructive" className="mr-2">
                          Urgent
                        </Badge>
                      )}
                      <p>{notification.message}</p>
                    </div>
                    <Button size="sm" variant="ghost">
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No new notifications
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">{teams.length}</div>
              <Badge variant="outline" className="bg-purple-50">
                <Users size={12} className="mr-1" />
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Social Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">{socialAccounts.length}</div>
              <div className="flex space-x-1">
                <Twitter size={16} className="text-[#1DA1F2]" />
                <Instagram size={16} className="text-[#E1306C]" />
                <Facebook size={16} className="text-[#4267B2]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">12</div>
              <Badge variant="outline" className="bg-green-50">
                <Calendar size={12} className="mr-1" />
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">3.2%</div>
              <Badge variant="outline" className="bg-green-50">
                <ChevronUp className="h-3 w-3 text-green-500 mr-1" /> 1.2%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Recent activities summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.slice(0, 3).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {activity.user} {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      on {activity.target}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(activity.time, "h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="#activity">View all activities</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                asChild
                className="h-20 flex flex-col items-center justify-center"
              >
                <Link href="/schedule-post">
                  <Plus size={24} className="mb-1" />
                  <span className="text-sm">New Post</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-20 flex flex-col items-center justify-center"
              >
                <Link href="/calendar">
                  <Calendar size={24} className="mb-1" />
                  <span className="text-sm">Calendar</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-20 flex flex-col items-center justify-center"
              >
                <Link href="/analytics">
                  <BarChart size={24} className="mb-1" />
                  <span className="text-sm">Analytics</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-20 flex flex-col items-center justify-center"
              >
                <Link href="/team">
                  <Users size={24} className="mb-1" />
                  <span className="text-sm">Team</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
