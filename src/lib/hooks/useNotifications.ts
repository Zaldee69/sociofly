import { trpc } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { toast } from "sonner";

// Types
interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface UseNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  enableRealtime?: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    total: number;
  };
}

// Main hook
export const useNotifications = ({
  limit = 20,
  offset = 0,
  unreadOnly = false,
  enableRealtime = true,
}: UseNotificationsOptions = {}) => {
  const utils = trpc.useUtils();
  const { user } = useUser();

  const { data, isLoading, error } = trpc.notification.getAll.useQuery(
    {
      limit,
      offset,
      unreadOnly,
    },
    {
      enabled: !!user,
    }
  );

  const { data: unreadCount } = trpc.notification.getUnreadCount.useQuery(
    undefined,
    {
      enabled: !!user,
    }
  );

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getAll.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getAll.invalidate();
      utils.notification.getUnreadCount.invalidate();
      toast.success("Semua notifikasi telah ditandai sebagai dibaca");
    },
  });

  const markAsRead = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync({ notificationId });
  };

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  return {
    notifications: data?.notifications ?? [],
    pagination: data?.pagination,
    unreadCount: unreadCount?.count ?? 0,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  };
};

// Hook for unread count only (lighter weight)
export const useUnreadNotificationsCount = () => {
  const { user } = useUser();

  const { data } = trpc.notification.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
  });

  return data?.count || 0;
};
