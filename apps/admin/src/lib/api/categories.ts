import apiClient from './client';
import { Category } from '@/types';

export interface CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ReorderItem {
  id: string;
  displayOrder: number;
}

export const categoriesApi = {
  getAll: async (includeInactive = false): Promise<Category[]> => {
    const response = await apiClient.get('/categories', {
      params: { includeInactive },
    });
    return response.data.data;
  },

  getTree: async (includeInactive = false): Promise<Category[]> => {
    const response = await apiClient.get('/categories/tree', {
      params: { includeInactive },
    });
    return response.data.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data.data;
  },

  create: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await apiClient.post('/categories', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateCategoryDto): Promise<Category> => {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },

  reorder: async (items: ReorderItem[]): Promise<void> => {
    await apiClient.put('/categories/reorder', { items });
  },
};
