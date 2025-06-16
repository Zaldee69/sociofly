"use client";

import * as React from "react";
import {
  Bell,
  Check,
  Clock,
  AlertCircle,
  MessageSquare,
  Calendar,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Mock notification data - replace with real data from your API
const mockNotifications = [
  {
    id: "1",
    type: "post_published",
    title: "Post published successfully",
    message: "Your Instagram post about summer collection has been published.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
    icon: MessageSquare,
  },
  {
    id: "2",
    type: "post_scheduled",
    title: "Post scheduled",
    message: "Your Facebook post is scheduled for tomorrow at 2:00 PM.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    read: false,
    icon: Calendar,
  },
  {
    id: "3",
    type: "team_invitation",
    title: "New team member",
    message: "John Doe has joined your team as Content Creator.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: true,
    icon: UserPlus,
  },
  {
    id: "4",
    type: "approval_required",
    title: "Approval required",
    message: "A new post is waiting for your approval.",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    read: false,
    icon: AlertCircle,
  },
];

export function NotificationDropdown() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [notifications, setNotifications] = React.useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by showing consistent state until mounted
  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 relative hover:bg-slate-100"
        disabled
      >
        <Bell className="h-4 w-4 text-slate-600" />
      </Button>
    );
  }

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative hover:bg-slate-100"
        >
          <Bell className="h-4 w-4 text-slate-600" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-medium"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-3 cursor-pointer hover:bg-slate-50 focus:bg-slate-50"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3 w-full">
                      <div
                        className={`p-1.5 rounded-full ${
                          !notification.read ? "bg-blue-100" : "bg-slate-100"
                        }`}
                      >
                        <Icon
                          className={`h-3 w-3 ${
                            !notification.read
                              ? "text-blue-600"
                              : "text-slate-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              !notification.read
                                ? "text-slate-900"
                                : "text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-3 justify-center text-sm font-medium text-slate-600 hover:text-slate-900">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
