'use client';

import { useRouter } from 'next/navigation';
import {
  BookOpen,
  MessageCircle,
  Video,
  Award,
  CheckCircle,
  Info,
  Trash2,
} from 'lucide-react';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  COURSE_ENROLLED: <BookOpen className="w-4 h-4" />,
  COURSE_COMPLETED: <CheckCircle className="w-4 h-4" />,
  COURSE_UPDATED: <BookOpen className="w-4 h-4" />,
  COMMUNITY_REPLY: <MessageCircle className="w-4 h-4" />,
  COMMUNITY_MENTION: <MessageCircle className="w-4 h-4" />,
  MESSAGE_PINNED: <MessageCircle className="w-4 h-4" />,
  LIVE_CLASS_STARTING: <Video className="w-4 h-4" />,
  LIVE_CLASS_REMINDER: <Video className="w-4 h-4" />,
  SUBMISSION_GRADED: <CheckCircle className="w-4 h-4" />,
  ASSIGNMENT_FEEDBACK: <CheckCircle className="w-4 h-4" />,
  SYSTEM_ANNOUNCEMENT: <Info className="w-4 h-4" />,
  ACHIEVEMENT_UNLOCKED: <Award className="w-4 h-4" />,
  STREAK_MILESTONE: <Award className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  COURSE_ENROLLED: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  COURSE_COMPLETED: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  COURSE_UPDATED: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  COMMUNITY_REPLY: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  COMMUNITY_MENTION: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  MESSAGE_PINNED: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
  LIVE_CLASS_STARTING: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
  LIVE_CLASS_REMINDER: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  SUBMISSION_GRADED: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
  ASSIGNMENT_FEEDBACK: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
  SYSTEM_ANNOUNCEMENT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  ACHIEVEMENT_UNLOCKED: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
  STREAK_MILESTONE: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
};

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const router = useRouter();
  const icon = typeIcons[notification.type] || <Info className="w-4 h-4" />;
  const colorClass = typeColors[notification.type] || 'bg-gray-100 text-gray-600';

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification data
    if (notification.data?.courseSlug) {
      router.push(`/courses/${notification.data.courseSlug}`);
    } else if (notification.data?.channelId) {
      router.push(`/courses/${notification.data.courseId}/community`);
    } else if (notification.data?.liveClassId) {
      router.push(`/stream/${notification.data.roomId || notification.data.liveClassId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        notification.isRead
          ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
          : 'bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30'
      }`}
    >
      {!notification.isRead && (
        <span className="absolute left-1 top-4 w-2 h-2 rounded-full bg-blue-500" />
      )}
      <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Delete notification"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
