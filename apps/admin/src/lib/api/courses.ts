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

  // Sections
  createSection: async (courseId: string, data: { title: string; description?: string; sortOrder?: number }) => {
    const response = await apiClient.post(`/courses/${courseId}/sections`, data);
    return response.data.data;
  },

  updateSection: async (sectionId: string, data: { title?: string; description?: string; sortOrder?: number }) => {
    const response = await apiClient.put(`/courses/sections/${sectionId}`, data);
    return response.data.data;
  },

  deleteSection: async (sectionId: string) => {
    await apiClient.delete(`/courses/sections/${sectionId}`);
  },

  // Lessons
  createLesson: async (sectionId: string, data: { title: string; contentType: string; sortOrder?: number; isFreePreview?: boolean; duration?: number; youtubeUrl?: string; description?: string }) => {
    const response = await apiClient.post(`/courses/sections/${sectionId}/lessons`, data);
    return response.data.data;
  },

  updateLesson: async (lessonId: string, data: { title?: string; contentType?: string; isFreePreview?: boolean; duration?: number; description?: string; youtubeUrl?: string }) => {
    const response = await apiClient.put(`/courses/lessons/${lessonId}`, data);
    return response.data.data;
  },

  deleteLesson: async (lessonId: string) => {
    await apiClient.delete(`/courses/lessons/${lessonId}`);
  },
};
