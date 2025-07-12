'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { NotificationPayload } from '../websocket/websocket-server';

interface UseWebSocketOptions {
  teamId?: string;
  autoConnect?: boolean;
  enableNotifications?: boolean;
  onNotification?: (notification: NotificationPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  notifications: NotificationPayload[];
  unreadCount: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    teamId,
    autoConnect = true,
    enableNotifications = true,
    onNotification,
    onConnect,
    onDisconnect
  } = options;

  const { user, isLoaded } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    notifications: [],
    unreadCount: 0
  });

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (!user?.id || !isLoaded || socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false, 
        error: null 
      }));

      // Authenticate user
      socket.emit('authenticate', {
        userId: user.id,
        teamId
      });

      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false 
      }));

      onDisconnect?.();

      // Auto-reconnect if not intentional disconnect
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false, 
        error: error.message 
      }));

      scheduleReconnect();
    });

    // Authentication events
    socket.on('authenticated', (data) => {
      console.log('✅ WebSocket authenticated:', data);
      
      // Join team room if teamId provided
      if (teamId) {
        socket.emit('join_team', teamId);
      }

      startHeartbeat();
    });

    socket.on('auth_error', (error) => {
      console.error('❌ WebSocket authentication error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Authentication failed' 
      }));
    });

    // Notification events
    socket.on('notification', (notification: NotificationPayload) => {
      console.log('📨 Received notification:', notification);
      
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications].slice(0, 50), // Keep last 50
        unreadCount: prev.unreadCount + (notification.read ? 0 : 1)
      }));

      // Show toast notification if enabled
      if (enableNotifications && !notification.read) {
        toast(notification.title, {
          description: notification.message,
          action: {
            label: 'Mark as read',
            onClick: () => markAsRead(notification.id)
          }
        });
      }

      onNotification?.(notification);
    });

    socket.on('system_notification', (notification: NotificationPayload) => {
      console.log('📢 Received system notification:', notification);
      
      if (enableNotifications) {
        toast(notification.title, {
          description: notification.message,
          duration: 10000 // Longer duration for system notifications
        });
      }
    });

    socket.on('notification_read_ack', (data: { notificationId: string }) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => 
          notif.id === data.notificationId 
            ? { ...notif, read: true }
            : notif
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }));
    });

    // Heartbeat events
    socket.on('heartbeat', () => {
      // Server heartbeat received
    });

    socket.on('pong', () => {
      // Pong response received
    });

  }, [user?.id, isLoaded, teamId, enableNotifications, onNotification, onConnect, onDisconnect]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
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
      console.log('🔄 Attempting to reconnect WebSocket...');
      connect();
    }, 3000);
  }, [connect]);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notification_read', notificationId);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    state.notifications
      .filter(notif => !notif.read)
      .forEach(notif => markAsRead(notif.id));
  }, [state.notifications, markAsRead]);

  // Join team room
  const joinTeam = useCallback((newTeamId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_team', newTeamId);
    }
  }, []);

  // Leave team room
  const leaveTeam = useCallback((teamIdToLeave: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_team', teamIdToLeave);
    }
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0
    }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && user?.id && isLoaded) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user?.id, isLoaded, connect, disconnect]);

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
    joinTeam,
    leaveTeam,
    clearNotifications,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current
  };
};