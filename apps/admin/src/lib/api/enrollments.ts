import apiClient from './client';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  progress: number;
  completedAt: string | null;
  expiresAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  course: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    category: {
      name: string;
    };
  };
}

export interface EnrollmentsResponse {
  enrollments: Enrollment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EnrollmentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
}

export interface GetEnrollmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EnrollmentStatus | 'ALL';
}

export const enrollmentsApi = {
  // Get all enrollments with pagination and filters
  getAllEnrollments: async (params?: GetEnrollmentsParams): Promise<EnrollmentsResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'ALL') queryParams.append('status', params.status);

    const response = await apiClient.get(
      `/courses/enrollments/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data.data;
  },

  // Get enrollment stats
  getStats: async (): Promise<EnrollmentStats> => {
    const response = await apiClient.get('/courses/enrollments/stats');
    return response.data.data;
  },

  // Get single enrollment details
  getEnrollment: async (id: string): Promise<Enrollment> => {
    const response = await apiClient.get(`/courses/enrollments/${id}`);
    return response.data.data;
  },
};
