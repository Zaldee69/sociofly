'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface RealTimeNotificationsProps {
  userId: string;
  teamId?: string;
}

export function RealTimeNotifications({ userId, teamId }: RealTimeNotificationsProps) {
  const {
    isConnected,
    isConnecting,
    error,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    clearNotifications,
    joinTeam,
    leaveTeam,
  } = useWebSocket();

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (isNotificationsEnabled && userId) {
      connect();
      
      // Join team room if teamId is provided
      if (teamId) {
        joinTeam(teamId);
      }
    } else {
      disconnect();
    }

    return () => {
      if (teamId) {
        leaveTeam(teamId);
      }
      disconnect();
    };
  }, [isNotificationsEnabled, userId, teamId, connect, disconnect, joinTeam, leaveTeam]);

  const toggleNotifications = () => {
    setIsNotificationsEnabled(!isNotificationsEnabled);
    
    if (!isNotificationsEnabled) {
      toast.success('Real-time notifications enabled');
    } else {
      toast.info('Real-time notifications disabled');
    }
  };

  const testNotification = async () => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: 'system_alert',
          title: 'Test Notification',
          message: 'This is a test notification to verify WebSocket functionality.',
          data: {
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        toast.success('Test notification sent!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Error sending test notification');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Real-time Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              WebSocket-powered notifications to reduce Redis load
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Disconnected</span>
                </>
              )}
            </div>
            <Button
              variant={isNotificationsEnabled ? "destructive" : "default"}
              size="sm"
              onClick={toggleNotifications}
            >
              {isNotificationsEnabled ? (
                <>
                  <BellOff className="h-4 w-4 mr-1" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-1" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">
                WebSocket Status: {isConnected ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? 'Receiving real-time notifications'
                  : 'Notifications will be polled from database'
                }
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testNotification}
              disabled={!isConnected}
            >
              Test Notification
            </Button>
          </div>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Total Notifications</p>
              <p className="text-2xl font-bold">{notifications.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Unread Count</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              WebSocket Benefits:
            </h4>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Reduced Redis polling load</li>
              <li>• Instant notification delivery</li>
              <li>• Lower server resource usage</li>
              <li>• Better user experience</li>
              <li>• Real-time team collaboration</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}