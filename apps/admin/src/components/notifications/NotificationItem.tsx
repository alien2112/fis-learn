import { useRouter } from 'next/navigation';
import {
  BookOpen,
  MessageCircle,
  Video,
  Award,
  CheckCircle,
  Info,
  Trash2,
  User,
  GraduationCap,
  FileCheck,
  AlertCircle,
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
  COURSE_ENROLLED: <BookOpen className="h-4 w-4" />,
  COURSE_COMPLETED: <CheckCircle className="h-4 w-4" />,
  COURSE_UPDATED: <BookOpen className="h-4 w-4" />,
  COMMUNITY_REPLY: <MessageCircle className="h-4 w-4" />,
  COMMUNITY_MENTION: <MessageCircle className="h-4 w-4" />,
  MESSAGE_PINNED: <MessageCircle className="h-4 w-4" />,
  LIVE_CLASS_STARTING: <Video className="h-4 w-4" />,
  LIVE_CLASS_REMINDER: <Video className="h-4 w-4" />,
  SUBMISSION_GRADED: <CheckCircle className="h-4 w-4" />,
  ASSIGNMENT_FEEDBACK: <FileCheck className="h-4 w-4" />,
  SYSTEM_ANNOUNCEMENT: <AlertCircle className="h-4 w-4" />,
  ACHIEVEMENT_UNLOCKED: <Award className="h-4 w-4" />,
  STREAK_MILESTONE: <Award className="h-4 w-4" />,
  NEW_USER: <User className="h-4 w-4" />,
  COURSE_APPROVAL: <GraduationCap className="h-4 w-4" />,
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
  NEW_USER: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  COURSE_APPROVAL: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
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
  const icon = typeIcons[notification.type] || <Info className="h-4 w-4" />;
  const colorClass = typeColors[notification.type] || 'bg-muted text-muted-foreground';

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification data
    if (notification.data?.courseId) {
      router.push(`/courses/${notification.data.courseId}`);
    } else if (notification.data?.userId) {
      router.push(`/users/${notification.data.userId}`);
    } else if (notification.data?.assessmentId) {
      router.push(`/assessments/${notification.data.assessmentId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        notification.isRead
          ? 'hover:bg-muted/50'
          : 'bg-accent/50 hover:bg-accent'
      }`}
    >
      {!notification.isRead && (
        <span className="absolute left-1 top-4 h-2 w-2 rounded-full bg-blue-500" />
      )}
      <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Delete notification"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
