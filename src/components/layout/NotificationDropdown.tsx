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
        className="h-9 w-9 relative hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 hover:shadow-sm transition-all duration-200 rounded-lg"
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
          className="h-9 w-9 relative hover:bg-gradient-to-br hover:from-slate-50 hover:to-blue-50 hover:shadow-sm transition-all duration-200 rounded-lg"
        >
          <Bell className="h-4 w-4 text-slate-600 hover:text-slate-700 transition-colors" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white border-2 border-white shadow-lg animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-96 rounded-xl border-0 bg-white/95 backdrop-blur-md shadow-xl ring-1 ring-slate-200/50"
        side="bottom"
        align="end"
        sideOffset={12}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-t-xl border-b border-slate-100">
          <span className="font-semibold text-slate-800">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Bell className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">
              No notifications
            </p>
            <p className="text-xs text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          <ScrollArea className="h-80 px-2">
            <div className="space-y-2 py-2">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-4 cursor-pointer rounded-lg transition-all duration-200 border ${
                      !notification.read
                        ? "bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border-blue-100/50 hover:from-blue-50 hover:to-indigo-50 shadow-sm"
                        : "bg-white/50 border-transparent hover:bg-slate-50/80"
                    }`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex gap-3 w-full">
                      <div
                        className={`p-2 rounded-full flex-shrink-0 w-10 h-10 flex items-center justify-center shadow-sm ${
                          !notification.read
                            ? "bg-gradient-to-br from-blue-100 to-indigo-200"
                            : "bg-gradient-to-br from-slate-100 to-slate-200"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            !notification.read
                              ? "text-blue-600"
                              : "text-slate-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p
                            className={`text-sm font-semibold leading-tight ${
                              !notification.read
                                ? "text-slate-900"
                                : "text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2.5 w-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
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

        <div className="border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-blue-50/30 rounded-b-xl">
          <DropdownMenuItem className="p-4 justify-center text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-colors rounded-b-xl">
            View all notifications
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
