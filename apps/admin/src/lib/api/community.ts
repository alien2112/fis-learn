import apiClient from './client';

// Author interface
export interface Author {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

// Channel interface
export interface Channel {
  id: string;
  name: string;
}

// Community Message interface
export interface CommunityMessage {
  id: string;
  content: string;
  isPinned: boolean;
  isThreadLocked: boolean;
  author: Author;
  channel: Channel;
  createdAt: string;
  updatedAt: string;
}

// Report interface
export interface CommunityReport {
  id: string;
  messageId: string;
  reason: string;
  reportedAt: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  reporter: Author;
  message: CommunityMessage;
}

// API response wrappers
interface ApiResponse<T> {
  data: T;
}

export const communityApi = {
  // Get all unresolved reports
  getReportedMessages: async (): Promise<CommunityReport[]> => {
    const response = await apiClient.get<ApiResponse<CommunityReport[]>>(
      '/community/admin/reported-messages'
    );
    return response.data.data;
  },

  // Get all pinned messages
  getPinnedMessages: async (): Promise<CommunityMessage[]> => {
    const response = await apiClient.get<ApiResponse<CommunityMessage[]>>(
      '/community/admin/pinned-messages'
    );
    return response.data.data;
  },

  // Get all locked threads
  getLockedThreads: async (): Promise<CommunityMessage[]> => {
    const response = await apiClient.get<ApiResponse<CommunityMessage[]>>(
      '/community/admin/locked-threads'
    );
    return response.data.data;
  },

  // Pin/unpin a message
  pinMessage: async (messageId: string, value: boolean): Promise<CommunityMessage> => {
    const response = await apiClient.post<ApiResponse<CommunityMessage>>(
      `/community/messages/${messageId}/pin`,
      { value }
    );
    return response.data.data;
  },

  // Lock/unlock a thread
  lockThread: async (messageId: string, value: boolean): Promise<CommunityMessage> => {
    const response = await apiClient.post<ApiResponse<CommunityMessage>>(
      `/community/messages/${messageId}/lock`,
      { value }
    );
    return response.data.data;
  },

  // Hide a message (delete)
  hideMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/community/messages/${messageId}`);
  },

  // Restore a hidden message
  restoreMessage: async (messageId: string): Promise<CommunityMessage> => {
    const response = await apiClient.post<ApiResponse<CommunityMessage>>(
      `/community/messages/${messageId}/restore`
    );
    return response.data.data;
  },

  // Resolve a report (mark as ignored/dismissed)
  resolveReport: async (reportId: string): Promise<void> => {
    await apiClient.patch(`/community/admin/reports/${reportId}/resolve`);
  },
};
