import apiClient from './client';
import { DashboardKPIs, ActivityItem } from '@/types';

export interface TrendDataPoint {
  month: string;
  enrollments?: number;
  users?: number;
}

export interface CourseStats {
  byLevel: { level: string; count: number }[];
  byCategory: { category: string; count: number }[];
  averageCompletionRate: number;
  topEnrolled: { id: string; title: string; slug: string; enrollments: number }[];
}

export const dashboardApi = {
  getKPIs: async (): Promise<DashboardKPIs> => {
    const response = await apiClient.get('/dashboard/kpis');
    return response.data.data;
  },

  getEnrollmentTrend: async (months = 6): Promise<TrendDataPoint[]> => {
    const response = await apiClient.get('/dashboard/enrollment-trend', {
      params: { months },
    });
    return response.data.data;
  },

  getUserGrowth: async (months = 6): Promise<TrendDataPoint[]> => {
    const response = await apiClient.get('/dashboard/user-growth', {
      params: { months },
    });
    return response.data.data;
  },

  getCourseStats: async (): Promise<CourseStats> => {
    const response = await apiClient.get('/dashboard/course-stats');
    return response.data.data;
  },

  getRecentActivity: async (limit = 10): Promise<ActivityItem[]> => {
    const response = await apiClient.get('/dashboard/recent-activity', {
      params: { limit },
    });
    return response.data.data;
  },
};
