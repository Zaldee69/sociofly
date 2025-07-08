import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Using direct API calls since notifications use API routes
import { useNotifications } from "@/lib/hooks/useNotifications";
import { toast } from "sonner";
import { Bell, CheckCircle, AlertTriangle, Calendar, Users } from "lucide-react";

export default function TestNotificationsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications({
    limit: 20,
    enableRealtime: true,
  });

  const createTestNotification = async (type: string, title: string, body: string) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: "user_123", // Replace with actual user ID
          teamId: "team_123", // Replace with actual team ID
          title,
          body,
          type: type as any,
          link: "/dashboard",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create notification');
      }
      
      toast.success("Test notification created!");
       refetch();
    } catch (error) {
      toast.error("Failed to create notification");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const testNotifications = [
    {
      type: "POST_PUBLISHED",
      title: "Post Published Successfully",
      body: "Your post 'Summer Campaign 2024' has been published to Instagram and Facebook.",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: "bg-green-50 border-green-200",
    },
    {
      type: "APPROVAL_REQUEST",
      title: "New Approval Request",
      body: "A new post requires your approval before publishing to social media.",
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      color: "bg-orange-50 border-orange-200",
    },
    {
      type: "POST_FAILED",
      title: "Post Publishing Failed",
      body: "Failed to publish your post to Twitter. Please check your account connection.",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      color: "bg-red-50 border-red-200",
    },
    {
      type: "POST_SCHEDULED",
      title: "Post Scheduled",
      body: "Your post has been scheduled for tomorrow at 9:00 AM across all platforms.",
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50 border-blue-200",
    },
    {
      type: "TEAM_MEMBER_JOINED",
      title: "New Team Member",
      body: "Sarah Johnson has joined your team as a Content Creator.",
      icon: <Users className="h-5 w-5 text-purple-500" />,
      color: "bg-purple-50 border-purple-200",
    },
    {
      type: "APPROVAL_APPROVED",
      title: "Post Approved",
      body: "Your post 'Holiday Special Offer' has been approved and is ready for publishing.",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      color: "bg-green-50 border-green-200",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification System Test</h1>
        <p className="text-gray-600">
          Test the notification system by creating sample notifications and viewing them in the navbar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Test Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Create Test Notifications
            </CardTitle>
            <CardDescription>
              Click the buttons below to create different types of notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {testNotifications.map((notification, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${notification.color} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    {notification.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {notification.body}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isCreating}
                      onClick={() =>
                        createTestNotification(
                          notification.type,
                          notification.title,
                          notification.body
                        )
                      }
                      className="h-7 px-3 text-xs"
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Current Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Current Notifications
              </span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Your current notifications. Check the navbar bell icon for the dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Create some test notifications to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div className="flex gap-2 mb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refresh}
                    className="text-xs"
                  >
                    Refresh
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Mark All Read
                    </Button>
                  )}
                </div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border transition-all ${
                      notification.isRead
                        ? "bg-gray-50 border-gray-200"
                        : "bg-blue-50 border-blue-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4
                        className={`font-semibold text-sm ${
                          notification.isRead ? "text-gray-700" : "text-gray-900"
                        }`}
                      >
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {notification.body}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            Current status of notification system integration with app features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold text-sm text-green-900">Approval Workflow</p>
                <p className="text-xs text-green-700">Integrated ✓</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold text-sm text-green-900">Post Scheduling</p>
                <p className="text-xs text-green-700">Integrated ✓</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-semibold text-sm text-green-900">UI Components</p>
                <p className="text-xs text-green-700">Complete ✓</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}