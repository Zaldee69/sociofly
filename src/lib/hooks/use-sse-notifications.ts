'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface SSENotification {
  id: string;
  userId: string;
  type: "post_scheduled" | "post_published" | "post_failed" | "approval_required" | "system_alert";
  title: string;
  message: string;
  data?: any;
  read: boolean;
  timestamp: string | Date;
}

interface UseSSENotificationsOptions {
  enableNotifications?: boolean;
  onNotification?: (notification: SSENotification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  notifications: SSENotification[];
  unreadCount: number;
}

export const useSSENotifications = (options: UseSSENotificationsOptions = {}) => {
  const {
    enableNotifications = true,
    onNotification,
    onConnect,
    onDisconnect
  } = options;

  const { user, isLoaded } = useUser();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs for callbacks to avoid dependency changes
  const onNotificationRef = useRef(onNotification);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  
  // Update refs when callbacks change
  useEffect(() => {
    onNotificationRef.current = onNotification;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  });

  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    notifications: [],
    unreadCount: 0
  });

  // Connect to SSE stream
  const connect = useCallback(async () => {
    if (!user?.id || !isLoaded || eventSourceRef.current) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const eventSource = new EventSource('/api/notifications/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('📡 SSE connection opened');
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false, 
          error: null 
        }));
        onConnectRef.current?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected') {
            console.log('✅ SSE authenticated and connected');
          } else if (data.type === 'heartbeat') {
            // Handle heartbeat - just keep connection alive
          } else if (data.type === 'notification') {
            console.log('📨 SSE notification received:', data);
            
            const notification: SSENotification = {
              id: data.id,
              userId: data.userId || user?.id || '',
              type: data.type,
              title: data.title,
              message: data.message,
              data: data.data,
              read: data.read || false,
              timestamp: data.timestamp
            };
            
            setState(prev => ({
              ...prev,
              notifications: [notification, ...prev.notifications].slice(0, 50), // Keep last 50
              unreadCount: prev.unreadCount + (notification.read ? 0 : 1)
            }));

            // Toast notification is handled by websocket-provider.tsx to avoid duplication
            // if (enableNotifications && !notification.read) {
            //   toast(notification.title, {
            //     description: notification.message,
            //     action: {
            //       label: 'Mark as read',
            //       onClick: () => markAsRead(notification.id)
            //     }
            //   });
            // }

            onNotificationRef.current?.(notification);
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('📡 SSE connection error:', error);
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false, 
          error: 'SSE connection failed' 
        }));
        
        onDisconnectRef.current?.();
        
        // Auto-reconnect
        scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to setup SSE connection:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to setup SSE connection' 
      }));
    }
  }, [user?.id, isLoaded, enableNotifications]);

  // Disconnect SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
  }, []);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Attempting to reconnect SSE...');
      connect();
    }, 3000);
  }, [connect]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1)
    }));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(notif => ({ ...notif, read: true })),
      unreadCount: 0
    }));
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0
    }));
  }, []);

  // Auto-connect when user is loaded
  useEffect(() => {
    if (isLoaded && user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isLoaded, user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    
    // Notifications
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    
    // Actions
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
};