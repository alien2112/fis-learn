import apiClient from './client';
import { User, PaginatedResponse } from '@/types';

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

export interface UpdateUserDto {
  name?: string;
  avatarUrl?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  locale?: string;
  timezone?: string;
}

export const usersApi = {
  getAll: async (params: UserQueryParams = {}): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users', { params });
    return response.data.data;
  },

  getStudents: async (params: UserQueryParams = {}): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users/students', { params });
    return response.data.data;
  },

  getInstructors: async (params: UserQueryParams = {}): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users/instructors', { params });
    return response.data.data;
  },

  getAdmins: async (params: UserQueryParams = {}): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users/admins', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data.data;
  },

  updateRole: async (id: string, role: string): Promise<User> => {
    const response = await apiClient.put(`/users/${id}/role`, { role });
    return response.data.data;
  },

  updateStatus: async (id: string, status: string): Promise<User> => {
    const response = await apiClient.put(`/users/${id}/status`, { status });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
