'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useWebSocket } from '../../lib/hooks/use-websocket';
import { useSSENotifications } from '../../lib/hooks/use-sse-notifications';
import { NotificationPayload } from '../../lib/websocket/websocket-server';
import type { SSENotification } from '../../lib/hooks/use-sse-notifications';
import { toast } from 'sonner';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  notifications: (NotificationPayload | SSENotification)[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  joinTeam: (teamId: string) => void;
  leaveTeam: (teamId: string) => void;
  clearNotifications: () => void;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  teamId?: string;
  enableNotifications?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  teamId,
  enableNotifications = true
}) => {
  const { user, isLoaded } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    lastConnected?: Date;
    reconnectAttempts: number;
  }>({
    isConnected: false,
    reconnectAttempts: 0
  });

  const handleNotification = (notification: NotificationPayload | SSENotification) => {
    // Custom notification handling logic
    console.log('📨 WebSocket notification received:', notification);
    
    // You can add custom logic here based on notification type
    switch (notification.type) {
      case 'post_scheduled':
        // Handle post scheduled notification
        break;
      case 'post_published':
        // Handle post published notification
        break;
      case 'post_failed':
        // Handle post failed notification
        toast.error(notification.title, {
          description: notification.message,
          duration: 8000
        });
        break;
      case 'approval_required':
        // Handle approval required notification
        toast(notification.title, {
          description: notification.message,
          action: {
            label: 'Review',
            onClick: () => {
              // Navigate to approval page
              window.location.href = '/approvals';
            }
          },
          duration: 10000
        });
        break;
      case 'system_alert':
        // Handle system alert notification
        toast.warning(notification.title, {
          description: notification.message,
          duration: 12000
        });
        break;
      default:
        // Handle default notification
        break;
    }
  };

  const handleConnect = useCallback(() => {
    console.log('🔌 WebSocket connected successfully');
    setConnectionStatus(prev => {
      // Show connection success toast (only after reconnection)
      if (prev.reconnectAttempts > 0) {
        toast.success('Connection restored', {
          description: 'Real-time notifications are now active',
          duration: 3000
        });
      }
      
      return {
        ...prev,
        isConnected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0
      };
    });
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log('🔌 WebSocket disconnected');
    setConnectionStatus(prev => {
      // Show disconnection warning (only after initial connection)
      if (prev.isConnected) {
        toast.warning('Connection lost', {
          description: 'Attempting to reconnect...',
          duration: 5000
        });
      }
      
      return {
        ...prev,
        isConnected: false,
        reconnectAttempts: prev.reconnectAttempts + 1
      };
    });
  }, []);

  // Try WebSocket first
  const {
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    error: wsError,
    notifications: wsNotifications,
    unreadCount: wsUnreadCount,
    markAsRead: wsMarkAsRead,
    markAllAsRead: wsMarkAllAsRead,
    joinTeam,
    leaveTeam,
    clearNotifications: wsClearNotifications,
    connect: wsConnect,
    disconnect: wsDisconnect
  } = useWebSocket({
    teamId,
    autoConnect: true,
    enableNotifications,
    onNotification: handleNotification,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect
  });

  // Use SSE as fallback (only when WebSocket is not connected)
  const {
    isConnected: sseConnected,
    isConnecting: sseConnecting,
    error: sseError,
    notifications: sseNotifications,
    unreadCount: sseUnreadCount,
    markAsRead: sseMarkAsRead,
    markAllAsRead: sseMarkAllAsRead,
    clearNotifications: sseClearNotifications,
    connect: sseConnect,
    disconnect: sseDisconnect
  } = useSSENotifications({
    enableNotifications: enableNotifications && !wsConnected, // Only enable SSE if WebSocket is not connected
    onNotification: handleNotification,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect
  });

  // Determine which connection to use
  const isConnected = wsConnected || sseConnected;
  const isConnecting = wsConnecting || sseConnecting;
  const error = wsError || sseError;
  const notifications = wsConnected ? wsNotifications : sseNotifications;
  const unreadCount = wsConnected ? wsUnreadCount : sseUnreadCount;
  const markAsRead = wsConnected ? wsMarkAsRead : sseMarkAsRead;
  const markAllAsRead = wsConnected ? wsMarkAllAsRead : sseMarkAllAsRead;
  const clearNotifications = wsConnected ? wsClearNotifications : sseClearNotifications;
  const connect = () => {
    // Try WebSocket first
    wsConnect();
    // SSE will auto-connect if WebSocket fails (handled by enableNotifications condition)
  };
  const disconnect = () => {
    wsDisconnect();
    sseDisconnect();
  };

  // Remove this useEffect as it causes infinite re-render
  // Connection status is now handled in handleConnect/handleDisconnect

  // Show persistent error toast for connection issues
  useEffect(() => {
    if (error && isLoaded && user) {
      const isTimeoutError = error.includes('timeout') || error.includes('TIMEOUT');
      
      toast.error('Connection Error', {
        description: isTimeoutError 
          ? 'Connection timeout. Please check your network and try again.'
          : error,
        duration: isTimeoutError ? 10000 : 8000,
        action: {
          label: 'Retry',
          onClick: () => {
            toast.dismiss();
            connect();
          }
        }
      });
    }
  }, [error, isLoaded, user, connect]);

  // Show loading state for initial connection
  const hasShownInitialToast = useRef(false);
  
  useEffect(() => {
    if (isConnecting && !hasShownInitialToast.current) {
      toast.loading('Connecting to real-time notifications...', {
        id: 'websocket-connecting',
        duration: 5000
      });
      hasShownInitialToast.current = true;
    } else if (!isConnecting) {
      toast.dismiss('websocket-connecting');
    }
  }, [isConnecting]);

  const contextValue: WebSocketContextType = {
    isConnected,
    isConnecting,
    error,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    joinTeam,
    leaveTeam,
    clearNotifications,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
      
      {/* Connection Status Indicator (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300
            ${isConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : isConnecting 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }
          `}>
            <div className="flex items-center gap-2">
              <div className={`
                w-2 h-2 rounded-full
                ${isConnected 
                  ? 'bg-green-500' 
                  : isConnecting 
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }
              `} />
              <span>
                {isConnected 
                  ? 'Connected' 
                  : isConnecting 
                    ? 'Connecting...' 
                    : 'Disconnected'
                }
              </span>

            </div>
          </div>
        </div>
      )}
    </WebSocketContext.Provider>
  );
};

// Hook to use WebSocket context
export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

// Hook to get connection status
export const useWebSocketStatus = () => {
  const { isConnected, isConnecting, error } = useWebSocketContext();
  return { isConnected, isConnecting, error };
};

// Hook to get notifications
export const useWebSocketNotifications = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useWebSocketContext();
  
  return { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  };
};