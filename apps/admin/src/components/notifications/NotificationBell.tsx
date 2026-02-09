'use client';

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createNotificationSocket } from '@/lib/realtime/notification-socket';
import { NotificationCenter } from './NotificationCenter';
import { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Fetch initial unread count
    fetch(`${API_URL}/notifications/unread-count`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && typeof data.data?.count === 'number') {
          setUnreadCount(data.data.count);
        }
      })
      .catch(() => {});

    // Connect to notification socket
    const s = createNotificationSocket();
    setSocket(s);

    s.on('notification:count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    s.on('notification:new', () => {
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleMarkAsRead = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationCenter
          socket={socket}
          onClose={() => setIsOpen(false)}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      )}
    </div>
  );
}
