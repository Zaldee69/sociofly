'use client';

import React, { useState } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, Calendar, Share2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useWebSocketNotifications } from '../providers/websocket-provider';
import { NotificationPayload } from '../../lib/websocket/websocket-server';
import type { SSENotification } from '../../lib/hooks/use-sse-notifications';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface NotificationItemProps {
  notification: NotificationPayload | SSENotification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const getNotificationIcon = (type: NotificationPayload['type']) => {
    switch (type) {
      case 'post_scheduled':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'post_published':
        return <Share2 className="h-4 w-4 text-green-500" />;
      case 'post_failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'approval_required':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: NotificationPayload['type']) => {
    switch (type) {
      case 'post_scheduled':
        return 'border-l-blue-500';
      case 'post_published':
        return 'border-l-green-500';
      case 'post_failed':
        return 'border-l-red-500';
      case 'approval_required':
        return 'border-l-yellow-500';
      case 'system_alert':
        return 'border-l-orange-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className={`
      p-3 border-l-4 ${getNotificationColor(notification.type)}
      ${notification.read ? 'bg-gray-50' : 'bg-white'}
      hover:bg-gray-50 transition-colors duration-200
      cursor-pointer group
    `}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`
                text-sm font-medium
                ${notification.read ? 'text-gray-600' : 'text-gray-900'}
              `}>
                {notification.title}
              </h4>
              <p className={`
                text-sm mt-1
                ${notification.read ? 'text-gray-500' : 'text-gray-700'}
              `}>
                {notification.message}
              </p>
            </div>
            
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(
                notification.timestamp instanceof Date 
                  ? notification.timestamp 
                  : new Date(notification.timestamp), 
                { 
                  addSuffix: true,
                  locale: id 
                }
              )}
            </span>
            
            {notification.read && (
              <Check className="h-3 w-3 text-green-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  } = useWebSocketNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearNotifications();
    setIsOpen(false);
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 p-0"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifikasi</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs h-7 px-2"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Tandai Semua
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3 mr-1" />
                  Hapus Semua
                </Button>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {unreadCount} notifikasi belum dibaca
            </p>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Tidak ada notifikasi</p>
              <p className="text-xs text-gray-500 mt-1">
                Notifikasi akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Unread notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                </div>
              )}
              
              {/* Separator if both unread and read exist */}
              {unreadNotifications.length > 0 && readNotifications.length > 0 && (
                <DropdownMenuSeparator />
              )}
              
              {/* Read notifications */}
              {readNotifications.length > 0 && (
                <div>
                  {readNotifications.slice(0, 10).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  ))}
                  
                  {readNotifications.length > 10 && (
                    <div className="p-3 text-center border-t">
                      <p className="text-xs text-gray-500">
                        +{readNotifications.length - 10} notifikasi lainnya
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                // Navigate to full notifications page
                window.location.href = '/notifications';
                setIsOpen(false);
              }}
            >
              Lihat Semua Notifikasi
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;