import apiClient from './client';
import { Course, PaginatedResponse } from '@/types';

export interface CourseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  level?: string;
  categoryId?: string;
  pricingModel?: string;
  isFeatured?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCourseDto {
  title: string;
  description?: string;
  language?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  pricingModel?: 'FREE' | 'PAID' | 'ACCESS_CODE_ONLY';
  price?: number;
  categoryId?: string;
  coverImageUrl?: string;
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {
  isFeatured?: boolean;
}

export const coursesApi = {
  getAll: async (params: CourseQueryParams = {}): Promise<PaginatedResponse<Course>> => {
    const response = await apiClient.get('/courses/all', { params });
    return response.data.data;
  },

  getPublished: async (params: CourseQueryParams = {}): Promise<PaginatedResponse<Course>> => {
    const response = await apiClient.get('/courses', { params });
    return response.data.data;
  },

  getPending: async (params: CourseQueryParams = {}): Promise<PaginatedResponse<Course>> => {
    const response = await apiClient.get('/courses/pending', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<Course> => {
    const response = await apiClient.get(`/courses/${id}`);
    return response.data.data;
  },

  create: async (data: CreateCourseDto): Promise<Course> => {
    const response = await apiClient.post('/courses', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCourseDto): Promise<Course> => {
    const response = await apiClient.put(`/courses/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/courses/${id}`);
  },

  submit: async (id: string): Promise<Course> => {
    const response = await apiClient.post(`/courses/${id}/submit`);
    return response.data.data;
  },

  approve: async (id: string): Promise<Course> => {
    const response = await apiClient.put(`/courses/${id}/approve`);
    return response.data.data;
  },

  reject: async (id: string, feedback: string): Promise<Course> => {
    const response = await apiClient.put(`/courses/${id}/reject`, { feedback });
    return response.data.data;
  },
};
