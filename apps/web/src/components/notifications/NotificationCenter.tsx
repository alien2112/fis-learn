'use client';

import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { X, CheckCheck } from 'lucide-react';
import { NotificationItem, Notification } from './NotificationItem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';

interface NotificationCenterProps {
  socket: Socket | null;
  onClose: () => void;
  onMarkAsRead: () => void;
  onMarkAllAsRead: () => void;
}

export function NotificationCenter({
  socket,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/notifications?page=${pageNum}&limit=20`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data?.success) {
        const newNotifications = data.data.notifications || [];
        if (pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications((prev) => [...prev, ...newNotifications]);
        }
        setHasMore(newNotifications.length === 20);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);

    // Listen for new notifications
    socket?.on('notification:new', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socket?.off('notification:new');
    };
  }, [socket]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      onMarkAsRead();
    } catch {
      // Silent fail
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/v1/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onMarkAllAsRead();
    } catch {
      // Silent fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/v1/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Silent fail
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Notifications
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllAsRead}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Mark all as read"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && notifications.length > 0 && (
          <button
            onClick={loadMore}
            className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Load more
          </button>
        )}

        {loading && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
