"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Users,
  Calendar,
  BarChart,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { trpc } from "@/lib/trpc/client";
import { NotificationType } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const utils = trpc.useUtils();

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications({
      limit: 10,
      enableRealtime: true,
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (open) {
      utils.notification.getAll.invalidate();
    }
  }, [open, utils]);

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      POST_SCHEDULED: <Calendar className="h-5 w-5 text-blue-500" />,
      POST_PUBLISHED: <CheckCircle className="h-5 w-5 text-green-500" />,
      POST_FAILED: <AlertTriangle className="h-5 w-5 text-red-500" />,
      COMMENT_RECEIVED: <MessageSquare className="h-5 w-5 text-purple-500" />,
      APPROVAL_NEEDED: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      APPROVAL_REQUEST: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      APPROVAL_APPROVED: <CheckCircle className="h-5 w-5 text-green-500" />,
      APPROVAL_REJECTED: <AlertTriangle className="h-5 w-5 text-red-500" />,
      TOKEN_EXPIRED: <AlertTriangle className="h-5 w-5 text-red-500" />,
      ACCOUNT_DISCONNECTED: <AlertTriangle className="h-5 w-5 text-red-500" />,
      TEAM_MEMBER_JOINED: <Users className="h-5 w-5 text-blue-500" />,
      TEAM_MEMBER_LEFT: <Users className="h-5 w-5 text-gray-500" />,
      TEAM_INVITATION: <Users className="h-5 w-5 text-purple-500" />,
      WORKFLOW_ASSIGNED: <Calendar className="h-5 w-5 text-amber-500" />,
      ANALYTICS_READY: <BarChart className="h-5 w-5 text-blue-500" />,
      SYSTEM_MAINTENANCE: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    };

    return iconMap[type] || <Bell className="h-5 w-5 text-gray-500" />;
  };

  // Get background color based on notification type
  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) return "bg-gray-50 dark:bg-gray-800/50";

    const bgMap: Record<string, string> = {
      POST_SCHEDULED: "bg-blue-50 dark:bg-blue-900/20",
      POST_PUBLISHED: "bg-green-50 dark:bg-green-900/20",
      POST_FAILED: "bg-red-50 dark:bg-red-900/20",
      COMMENT_RECEIVED: "bg-purple-50 dark:bg-purple-900/20",
      APPROVAL_NEEDED: "bg-amber-50 dark:bg-amber-900/20",
      APPROVAL_REQUEST: "bg-orange-50 dark:bg-orange-900/20",
      APPROVAL_APPROVED: "bg-green-50 dark:bg-green-900/20",
      APPROVAL_REJECTED: "bg-red-50 dark:bg-red-900/20",
      TOKEN_EXPIRED: "bg-red-50 dark:bg-red-900/20",
      ACCOUNT_DISCONNECTED: "bg-red-50 dark:bg-red-900/20",
      TEAM_MEMBER_JOINED: "bg-blue-50 dark:bg-blue-900/20",
      TEAM_MEMBER_LEFT: "bg-gray-50 dark:bg-gray-800/50",
      TEAM_INVITATION: "bg-purple-50 dark:bg-purple-900/20",
      WORKFLOW_ASSIGNED: "bg-amber-50 dark:bg-amber-900/20",
      ANALYTICS_READY: "bg-blue-50 dark:bg-blue-900/20",
      SYSTEM_MAINTENANCE: "bg-amber-50 dark:bg-amber-900/20",
    };

    return bgMap[type] || "bg-gray-50 dark:bg-gray-800/50";
  };

  // Handle notification click
  const handleNotificationClick = (notification: {
    id: string;
    type: NotificationType;
    link: string | null;
    metadata: JsonValue;
  }) => {
    markAsRead(notification.id);

    const metadata = notification.metadata
      ? ((typeof notification.metadata === "string"
          ? JSON.parse(notification.metadata)
          : notification.metadata) as Record<string, any>)
      : null;

    console.log("metadata", metadata);

    // Handle routing based on notification type
    switch (notification.type) {
      case "APPROVAL_NEEDED":
      case "APPROVAL_REQUEST":
        if (metadata?.assignmentId) {
          router.push(`/approvals?assignment=${metadata.assignmentId}`);
        }
        break;
      case "POST_PUBLISHED":
      case "POST_FAILED":
      case "APPROVAL_APPROVED":
      case "APPROVAL_REJECTED":
        if (metadata?.postId) {
          router.push(`/posts/${metadata.postId}`);
        }
        break;
      case "TEAM_INVITATION":
        if (metadata?.teamId) {
          router.push(`/teams/${metadata.teamId}`);
        }
        break;
      default:
        // Fallback to link if provided
        if (notification.link) {
          router.push(notification.link);
        }
    }

    setOpen(false);
  };

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
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
          <div className="max-h-80 overflow-y-auto px-2">
            <div className="space-y-2 py-2">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "p-4 cursor-pointer rounded-lg transition-all duration-200 border",
                    getNotificationBgColor(
                      notification.type,
                      notification.isRead
                    )
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3 w-full">
                    <div className="p-2 rounded-full flex-shrink-0 w-10 h-10 flex items-center justify-center shadow-sm bg-white dark:bg-slate-800">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p
                          className={cn(
                            "text-sm font-semibold leading-tight",
                            notification.isRead
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-900 dark:text-white"
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2.5 w-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex-shrink-0 mt-1 shadow-sm" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-2 dark:text-slate-400">
                        {notification.body}
                      </p>
                      <p className="text-xs text-slate-400 font-medium dark:text-slate-500">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
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
