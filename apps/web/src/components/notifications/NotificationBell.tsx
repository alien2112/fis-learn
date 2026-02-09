'use client';

import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createNotificationSocket } from '@/lib/realtime/notification-socket';
import { NotificationCenter } from './NotificationCenter';
import { Socket } from 'socket.io-client';

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

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
