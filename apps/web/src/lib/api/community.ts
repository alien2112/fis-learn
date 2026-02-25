'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function mutationHeaders(): Record<string, string> {
  const csrf = getCsrfToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}

export interface CommunityChannel {
  id: string;
  courseId: string;
  name: string;
  slug: string;
  type: 'ANNOUNCEMENTS' | 'QA' | 'DISCUSSION';
  isLocked: boolean;
}

export interface CommunityMessage {
  id: string;
  courseId: string;
  channelId: string;
  author: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string | null;
  };
  body: string;
  status: 'ACTIVE' | 'HIDDEN' | 'DELETED';
  isPinned: boolean;
  isAnswer: boolean;
  isLocked: boolean;
  parentId?: string | null;
  clientId?: string | null;
  createdAt: string;
  _count?: { replies: number };
}

export interface MessagePage {
  data: CommunityMessage[];
  nextCursor: string | null;
}

export const communityApi = {
  getCourseBySlug: async (slug: string) => {
    const response = await fetch(`${API_URL}/courses/slug/${slug}`, {
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to load course');
    }
    return payload.data;
  },

  listChannels: async (courseId: string): Promise<CommunityChannel[]> => {
    const response = await fetch(`${API_URL}/community/courses/${courseId}/channels`, {
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to load channels');
    }
    return payload.data;
  },

  listMessages: async (
    channelId: string,
    params: { cursor?: string; limit?: number; parentId?: string } = {},
  ): Promise<MessagePage> => {
    const query = new URLSearchParams();
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.parentId) query.set('parentId', params.parentId);

    const response = await fetch(
      `${API_URL}/community/channels/${channelId}/messages?${query.toString()}`,
      {
        credentials: 'include',
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to load messages');
    }
    return payload.data;
  },

  createMessage: async (channelId: string, body: string, parentId?: string, clientId?: string) => {
    const response = await fetch(`${API_URL}/community/channels/${channelId}/messages`, {
      method: 'POST',
      headers: mutationHeaders(),
      credentials: 'include',
      body: JSON.stringify({ body, parentId, clientId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.message || 'Failed to send message';
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }
    return payload.data as CommunityMessage;
  },

  pinMessage: async (messageId: string, value: boolean) => {
    const response = await fetch(`${API_URL}/community/messages/${messageId}/pin`, {
      method: 'POST',
      headers: mutationHeaders(),
      credentials: 'include',
      body: JSON.stringify({ value }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to update message');
    }
    return payload.data as CommunityMessage;
  },

  markAnswer: async (messageId: string, value: boolean) => {
    const response = await fetch(`${API_URL}/community/messages/${messageId}/mark-answer`, {
      method: 'POST',
      headers: mutationHeaders(),
      credentials: 'include',
      body: JSON.stringify({ value }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to update answer');
    }
    return payload.data as CommunityMessage;
  },

  lockThread: async (messageId: string, value: boolean) => {
    const response = await fetch(`${API_URL}/community/messages/${messageId}/lock`, {
      method: 'POST',
      headers: mutationHeaders(),
      credentials: 'include',
      body: JSON.stringify({ value }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to update thread');
    }
    return payload.data as CommunityMessage;
  },

  reportMessage: async (messageId: string, reason?: string) => {
    const response = await fetch(`${API_URL}/community/messages/${messageId}/report`, {
      method: 'POST',
      headers: mutationHeaders(),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to report message');
    }
    return payload.data;
  },

  removeMessage: async (messageId: string) => {
    const csrfHeaders = mutationHeaders();
    delete csrfHeaders['Content-Type'];
    const response = await fetch(`${API_URL}/community/messages/${messageId}`, {
      method: 'DELETE',
      headers: csrfHeaders,
      credentials: 'include',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message || 'Failed to remove message');
    }
    return payload.data as CommunityMessage;
  },
};
