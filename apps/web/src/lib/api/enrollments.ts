import apiClient from './client';

export interface Enrollment {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
  progressPercent: number;
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    level: string;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    instructors: Array<{
      id: string;
      name: string;
      avatarUrl: string | null;
    }>;
  };
  stats: {
    totalLessons: number;
    completedLessons: number;
    lastActivityAt: string;
    lastLessonId: string | null;
  };
}

export const enrollmentsApi = {
  getMyEnrollments: async (): Promise<{ data: Enrollment[] }> => {
    const response = await apiClient.get('/courses/enrollments/my');
    return response.data.data;
  },
};
