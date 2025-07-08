import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types
interface Notification {
  id: string;
  userId: string;
  teamId?: string;
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

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

interface UseNotificationsOptions {
  teamId?: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  enableRealtime?: boolean;
}

// API functions
const fetchNotifications = async ({
  teamId,
  limit = 20,
  offset = 0,
  unreadOnly = false,
}: Omit<UseNotificationsOptions, 'enableRealtime'>): Promise<NotificationsResponse> => {
  const params = new URLSearchParams();
  if (teamId) params.append('teamId', teamId);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  if (unreadOnly) params.append('unreadOnly', 'true');

  const response = await fetch(`/api/notifications?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
};

const fetchUnreadCount = async (teamId?: string): Promise<{ count: number }> => {
  const params = new URLSearchParams();
  if (teamId) params.append('teamId', teamId);

  const response = await fetch(`/api/notifications/unread-count?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }
  return response.json();
};

const markAsRead = async (notificationId: string): Promise<void> => {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
};

const markAllAsRead = async (teamId?: string): Promise<void> => {
  const params = new URLSearchParams();
  if (teamId) params.append('teamId', teamId);

  const response = await fetch(`/api/notifications/read-all?${params}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
};

// Main hook
export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const {
    teamId,
    limit = 20,
    offset = 0,
    unreadOnly = false,
    enableRealtime = true,
  } = options;

  // Query key
  const queryKey = ['notifications', { teamId, limit, offset, unreadOnly }];
  const unreadCountKey = ['notifications', 'unread-count', { teamId }];

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications({ teamId, limit, offset, unreadOnly }),
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: enableRealtime ? 60000 : false, // Fallback polling every minute
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery({
    queryKey: unreadCountKey,
    queryFn: () => fetchUnreadCount(teamId),
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: enableRealtime ? 30000 : false, // Poll every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: (_, notificationId) => {
      // Update notifications cache
      queryClient.setQueryData<NotificationsResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          ),
        };
      });

      // Update unread count
      queryClient.setQueryData<{ count: number }>(unreadCountKey, (old) => {
        if (!old) return old;
        return { count: Math.max(0, old.count - 1) };
      });
    },
    onError: (error) => {
      toast.error('Failed to mark notification as read');
      console.error('Mark as read error:', error);
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(teamId),
    onSuccess: () => {
      // Update notifications cache
      queryClient.setQueryData<NotificationsResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((notification) => ({
            ...notification,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
        };
      });

      // Update unread count
      queryClient.setQueryData<{ count: number }>(unreadCountKey, () => ({ count: 0 }));
      
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      toast.error('Failed to mark all notifications as read');
      console.error('Mark all as read error:', error);
    },
  });

  // Real-time updates with Pusher (if available)
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    // This would be implemented with Pusher or similar
    // For now, we'll use polling as fallback
    const handleNewNotification = (notification: Notification) => {
      // Add new notification to cache
      queryClient.setQueryData<NotificationsResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: [notification, ...old.notifications],
          total: old.total + 1,
        };
      });

      // Update unread count
      queryClient.setQueryData<{ count: number }>(unreadCountKey, (old) => {
        if (!old) return { count: 1 };
        return { count: old.count + 1 };
      });

      // Show toast notification
      toast(notification.title, {
        description: notification.body,
        action: notification.link
          ? {
              label: 'View',
              onClick: () => window.location.href = notification.link!,
            }
          : undefined,
      });
    };

    const handleNotificationRead = (notificationId: string) => {
      queryClient.setQueryData<NotificationsResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          ),
        };
      });

      queryClient.setQueryData<{ count: number }>(unreadCountKey, (old) => {
        if (!old) return old;
        return { count: Math.max(0, old.count - 1) };
      });
    };

    // TODO: Implement Pusher listeners
    // pusher.subscribe(`user-${user.id}`);
    // pusher.bind('new-notification', handleNewNotification);
    // pusher.bind('notification-read', handleNotificationRead);

    // return () => {
    //   pusher.unsubscribe(`user-${user.id}`);
    // };
  }, [enableRealtime, user?.id, queryClient, queryKey, unreadCountKey]);

  // Helper functions
  const markNotificationAsRead = useCallback(
    (notificationId: string) => {
      markAsReadMutation.mutate(notificationId);
    },
    [markAsReadMutation]
  );

  const markAllNotificationsAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const refreshNotifications = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: unreadCountKey });
  }, [refetch, queryClient, unreadCountKey]);

  return {
    // Data
    notifications: notificationsData?.notifications || [],
    total: notificationsData?.total || 0,
    hasMore: notificationsData?.hasMore || false,
    unreadCount: unreadCountData?.count || 0,

    // Loading states
    isLoading,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,

    // Error states
    error,

    // Actions
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    refresh: refreshNotifications,
  };
};

// Hook for unread count only (lighter weight)
export const useUnreadCount = (teamId?: string) => {
  const { user } = useUser();
  
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count', { teamId }],
    queryFn: () => fetchUnreadCount(teamId),
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  return data?.count || 0;
};