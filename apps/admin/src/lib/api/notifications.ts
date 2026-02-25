import apiClient from './client';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type RecipientGroup = 'ALL_USERS' | 'ALL_STUDENTS' | 'ALL_INSTRUCTORS' | 'ALL_ADMINS' | 'CUSTOM';
export type BulkNotificationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BulkNotification {
  id: string;
  subject: string;
  message: string;
  type: NotificationType;
  recipientGroup: RecipientGroup;
  recipientIds: string[] | null;
  recipientCount: number;
  deliveredCount: number;
  status: BulkNotificationStatus;
  scheduledFor: string | null;
  sentAt: string | null;
  sentBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SendBulkNotificationDto {
  subject: string;
  message: string;
  type: NotificationType;
  recipientGroup: RecipientGroup;
  recipientIds?: string[];
  scheduledFor?: string;
}

export interface BulkNotificationResponse {
  id: string;
  recipientCount: number;
  status: BulkNotificationStatus;
  message: string;
}

export interface BulkHistoryResponse {
  data: BulkNotification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NotificationStats {
  totalSentToday: number;
  totalRecipientsToday: number;
  deliveryRate: number;
  pending: number;
}

export const notificationsApi = {
  // Send bulk notification
  sendBulk: async (data: SendBulkNotificationDto): Promise<BulkNotificationResponse> => {
    const response = await apiClient.post('/notifications/send-bulk', data);
    return response.data.data;
  },

  // Get bulk notification history
  getBulkHistory: async (page = 1, limit = 20): Promise<BulkHistoryResponse> => {
    const response = await apiClient.get('/notifications/bulk-history', {
      params: { page, limit },
    });
    return response.data.data;
  },

  // Calculate stats from history (client-side calculation)
  calculateStats: (history: BulkNotification[]): NotificationStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNotifications = history.filter((n) => {
      if (!n.sentAt) return false;
      const sentDate = new Date(n.sentAt);
      sentDate.setHours(0, 0, 0, 0);
      return sentDate.getTime() === today.getTime();
    });

    const totalSentToday = todayNotifications.length;
    const totalRecipientsToday = todayNotifications.reduce(
      (sum, n) => sum + n.recipientCount,
      0
    );
    const totalDelivered = todayNotifications.reduce(
      (sum, n) => sum + n.deliveredCount,
      0
    );
    const deliveryRate = totalRecipientsToday > 0
      ? (totalDelivered / totalRecipientsToday) * 100
      : 0;
    const pending = history.filter(
      (n) => n.status === 'PENDING' || n.status === 'PROCESSING'
    ).length;

    return {
      totalSentToday,
      totalRecipientsToday,
      deliveryRate,
      pending,
    };
  },
};
