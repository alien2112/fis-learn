import apiClient from './client';

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  level: string;
  pricingModel: string;
  price?: number | null;
  category?: { id: string; name: string; slug: string } | null;
  instructors: Array<{
    id: string;
    isPrimary: boolean;
    user: {
      id: string;
      name: string;
      avatarUrl?: string | null;
    };
  }>;
  _count?: {
    sections?: number;
    enrollments?: number;
  };
}

export interface CourseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  level?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const coursesApi = {
  getPublished: async (
    params: CourseQueryParams = {},
  ): Promise<PaginatedResponse<CourseListItem>> => {
    const response = await apiClient.get('/courses', { params });
    return response.data.data;
  },
};

export const enrollmentApi = {
  enroll: async (courseId: string): Promise<any> => {
    const response = await apiClient.post(`/courses/${courseId}/enroll`);
    return response.data.data;
  },

  getProgress: async (courseId: string): Promise<any> => {
    const response = await apiClient.get(`/courses/${courseId}/progress`);
    return response.data.data;
  },

  getLessonContent: async (courseId: string, lessonId: string): Promise<any> => {
    const response = await apiClient.get(`/courses/${courseId}/lessons/${lessonId}`);
    return response.data.data;
  },

  completeLesson: async (courseId: string, lessonId: string): Promise<any> => {
    const response = await apiClient.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
    return response.data.data;
  },
};
