import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BarChart3, Activity, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getAdminStats() {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get post stats
    const [
      publishedToday,
      scheduledPosts,
      failedPosts,
      pendingApprovals,
      overdueApprovals,
      totalPosts,
    ] = await Promise.all([
      // Published today
      prisma.postSocialAccount.count({
        where: {
          publishedAt: {
            gte: today,
            lt: tomorrow,
          },
          status: "PUBLISHED",
        },
      }),

      // Scheduled posts
      prisma.post.count({
        where: {
          status: "SCHEDULED",
        },
      }),

      // Failed posts
      prisma.postSocialAccount.count({
        where: {
          status: "FAILED",
        },
      }),

      // Pending approvals
      prisma.approvalInstance.count({
        where: {
          status: "IN_PROGRESS",
        },
      }),

      // Overdue approvals (>24h)
      prisma.approvalInstance.count({
        where: {
          status: "IN_PROGRESS",
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total posts
      prisma.post.count(),
    ]);

    return {
      publishedToday,
      scheduledPosts,
      failedPosts,
      pendingApprovals,
      overdueApprovals,
      totalPosts,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    // Return fallback data if database is unavailable
    return {
      publishedToday: 0,
      scheduledPosts: 0,
      failedPosts: 0,
      pendingApprovals: 0,
      overdueApprovals: 0,
      totalPosts: 0,
    };
  }
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Quick system overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 text-green-600" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall</span>
                <Badge
                  variant="secondary"
                  className={
                    stats.failedPosts === 0
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {stats.failedPosts === 0 ? "Healthy" : "Warning"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Posts
                </span>
                <span className="text-sm font-medium">{stats.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Issues
                </span>
                <span className="text-sm font-medium text-red-600">
                  {stats.failedPosts}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval System */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Approval System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Health Score
                </span>
                <span className="text-sm font-medium text-green-600">
                  {stats.overdueApprovals === 0 ? "95/100" : "75/100"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium">
                  {stats.pendingApprovals}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overdue</span>
                <span className="text-sm font-medium text-orange-600">
                  {stats.overdueApprovals}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-purple-600" />
              Post Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Published Today
                </span>
                <span className="text-sm font-medium">
                  {stats.publishedToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scheduled</span>
                <span className="text-sm font-medium">
                  {stats.scheduledPosts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="text-sm font-medium text-red-600">
                  {stats.failedPosts}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Critical</span>
                <span className="text-sm font-medium text-red-600">
                  {stats.failedPosts > 5 ? 1 : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Warning</span>
                <span className="text-sm font-medium text-yellow-600">
                  {stats.failedPosts > 0 || stats.overdueApprovals > 0 ? 1 : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Info</span>
                <span className="text-sm font-medium">
                  {stats.scheduledPosts > 0 ? 1 : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/admin/cron">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Cron Jobs</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/system-health">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">System Health</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/post-monitoring">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Post Monitoring</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors opacity-50">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-sm font-medium">View Alerts</p>
              <p className="text-xs text-muted-foreground mt-1">Coming Soon</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
