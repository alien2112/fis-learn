import apiClient from './client';

/**
 * Streaming API Client for Admin Dashboard
 *
 * BACKEND STATUS:
 * - GET /streaming/active - EXISTS (active streams)
 * - GET /streaming/my-streams - EXISTS (user's streams)
 * - POST /streaming - EXISTS (create stream)
 * - PATCH /streaming/:id - EXISTS (update stream)
 * - DELETE /streaming/:id - EXISTS (delete stream)
 *
 * ADMIN ENDPOINTS NEEDED (fallbacks implemented):
 * - GET /streaming/admin/all - NEEDS TO BE ADDED (list all streams for admin)
 * - GET /streaming/admin/stats - NEEDS TO BE ADDED (streaming statistics)
 *
 * Note: The API currently uses fallback methods to aggregate data from
 * existing endpoints. For better performance, consider adding dedicated
 * admin endpoints in streaming.controller.ts
 */

export type StreamStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface Stream {
  id: string;
  roomId: string;
  courseId: string;
  instructorId: string;
  title: string;
  status: StreamStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  viewerCount: number;
  streamId: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    slug: string;
  };
  instructor?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  _count?: {
    viewers: number;
  };
}

export interface CreateStreamDto {
  courseId: string;
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  maxParticipants?: number;
}

export interface UpdateStreamDto {
  title?: string;
  description?: string;
  status?: StreamStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  maxParticipants?: number;
}

export interface StreamStats {
  totalStreams: number;
  liveNow: number;
  scheduled: number;
  totalViewersToday: number;
}

// NOTE: Backend may need additional admin endpoints
// Currently using existing endpoints from streaming.controller.ts
export const streamingApi = {
  // Get all streams (admin view)
  // Note: This endpoint may need to be added to the backend as GET /streaming/admin/all
  // For now, we'll use the existing endpoints
  getAllStreams: async (): Promise<Stream[]> => {
    try {
      // Try admin endpoint first (may not exist yet)
      const response = await apiClient.get('/streaming/admin/all');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback: Get active streams and user streams
        // This is a workaround until proper admin endpoint is added
        console.warn('Admin endpoint not found, using fallback method');
        const [activeResponse, myStreamsResponse] = await Promise.all([
          apiClient.get('/streaming/active'),
          apiClient.get('/streaming/my-streams'),
        ]);
        return [...activeResponse.data.data, ...myStreamsResponse.data.data];
      }
      throw error;
    }
  },

  // Get streaming statistics
  getStats: async (): Promise<StreamStats> => {
    try {
      const response = await apiClient.get('/streaming/admin/stats');
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Fallback: Calculate stats from all streams
        console.warn('Stats endpoint not found, calculating from streams list');
        const streams = await streamingApi.getAllStreams();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return {
          totalStreams: streams.length,
          liveNow: streams.filter(s => s.status === 'LIVE').length,
          scheduled: streams.filter(s => s.status === 'SCHEDULED').length,
          totalViewersToday: streams
            .filter(s => new Date(s.createdAt) >= today)
            .reduce((sum, s) => sum + (s._count?.viewers || 0), 0),
        };
      }
      throw error;
    }
  },

  // Create stream
  createStream: async (data: CreateStreamDto): Promise<Stream> => {
    const response = await apiClient.post('/streaming', {
      courseId: data.courseId,
      title: data.title,
      scheduledAt: data.scheduledStart ? new Date(data.scheduledStart).toISOString() : undefined,
    });
    return response.data.data;
  },

  // Update stream
  updateStream: async (id: string, data: UpdateStreamDto): Promise<Stream> => {
    const updatePayload: any = {};
    if (data.title) updatePayload.title = data.title;
    if (data.status) updatePayload.status = data.status;
    if (data.scheduledStart) {
      updatePayload.scheduledAt = new Date(data.scheduledStart).toISOString();
    }

    const response = await apiClient.patch(`/streaming/${id}`, updatePayload);
    return response.data.data;
  },

  // Delete stream
  deleteStream: async (id: string): Promise<void> => {
    await apiClient.delete(`/streaming/${id}`);
  },

  // Start stream (update status to LIVE)
  startStream: async (id: string): Promise<Stream> => {
    return streamingApi.updateStream(id, { status: 'LIVE' });
  },

  // End stream (update status to ENDED)
  endStream: async (id: string): Promise<Stream> => {
    return streamingApi.updateStream(id, { status: 'ENDED' });
  },

  // Cancel stream (update status to CANCELLED)
  cancelStream: async (id: string): Promise<Stream> => {
    return streamingApi.updateStream(id, { status: 'CANCELLED' });
  },

  // Get active streams
  getActiveStreams: async (): Promise<Stream[]> => {
    const response = await apiClient.get('/streaming/active');
    return response.data.data;
  },

  // Get user streams
  getUserStreams: async (): Promise<Stream[]> => {
    const response = await apiClient.get('/streaming/my-streams');
    return response.data.data;
  },
};
