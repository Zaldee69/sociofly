'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useWebSocket } from '../../lib/hooks/use-websocket';
import { NotificationPayload } from '../../lib/websocket/websocket-server';
import { toast } from 'sonner';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  notifications: NotificationPayload[];
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

  const handleNotification = (notification: NotificationPayload) => {
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

  const handleConnect = () => {
    console.log('🔌 WebSocket connected successfully');
    setConnectionStatus(prev => ({
      ...prev,
      isConnected: true,
      lastConnected: new Date(),
      reconnectAttempts: 0
    }));

    // Show connection success toast (only after reconnection)
    if (connectionStatus.reconnectAttempts > 0) {
      toast.success('Connection restored', {
        description: 'Real-time notifications are now active',
        duration: 3000
      });
    }
  };

  const handleDisconnect = () => {
    console.log('🔌 WebSocket disconnected');
    setConnectionStatus(prev => ({
      ...prev,
      isConnected: false,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    // Show disconnection warning (only after initial connection)
    if (connectionStatus.isConnected) {
      toast.warning('Connection lost', {
        description: 'Attempting to reconnect...',
        duration: 5000
      });
    }
  };

  const {
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
  } = useWebSocket({
    teamId,
    autoConnect: true,
    enableNotifications,
    onNotification: handleNotification,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect
  });

  // Update connection status when WebSocket state changes
  useEffect(() => {
    setConnectionStatus(prev => ({
      ...prev,
      isConnected
    }));
  }, [isConnected]);

  // Show persistent error toast for connection issues
  useEffect(() => {
    if (error && isLoaded && user) {
      toast.error('Connection Error', {
        description: error,
        duration: 8000,
        action: {
          label: 'Retry',
          onClick: connect
        }
      });
    }
  }, [error, isLoaded, user, connect]);

  // Show loading state for initial connection
  useEffect(() => {
    if (isConnecting && connectionStatus.reconnectAttempts === 0) {
      toast.loading('Connecting to real-time notifications...', {
        id: 'websocket-connecting',
        duration: 5000
      });
    } else {
      toast.dismiss('websocket-connecting');
    }
  }, [isConnecting, connectionStatus.reconnectAttempts]);

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
              {unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
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