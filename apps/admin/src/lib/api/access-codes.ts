import apiClient from './client';
import { AccessCode, PaginatedResponse } from '@/types';

export interface CodeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'COURSE' | 'VIDEO';
  status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  courseId?: string;
  materialId?: string;
  expired?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GenerateCodeDto {
  type: 'COURSE' | 'VIDEO';
  courseId?: string;
  materialId?: string;
  isSingleUse?: boolean;
  maxRedemptions?: number;
  expiresAt?: string;
}

export interface GenerateBulkCodesDto extends GenerateCodeDto {
  quantity: number;
}

export interface CodeStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  redemptionsLast30Days: number;
}

export const accessCodesApi = {
  getAll: async (params: CodeQueryParams = {}): Promise<PaginatedResponse<AccessCode>> => {
    const response = await apiClient.get('/access-codes', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<AccessCode> => {
    const response = await apiClient.get(`/access-codes/${id}`);
    return response.data.data;
  },

  getStats: async (): Promise<CodeStats> => {
    const response = await apiClient.get('/access-codes/stats');
    return response.data.data;
  },

  generate: async (data: GenerateCodeDto): Promise<AccessCode> => {
    const response = await apiClient.post('/access-codes/generate', data);
    return response.data.data;
  },

  generateBulk: async (data: GenerateBulkCodesDto): Promise<{ count: number; codes: AccessCode[] }> => {
    const response = await apiClient.post('/access-codes/generate-bulk', data);
    return response.data.data;
  },

  revoke: async (id: string): Promise<AccessCode> => {
    const response = await apiClient.put(`/access-codes/${id}/revoke`);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/access-codes/${id}`);
  },

  exportCsv: async (params: CodeQueryParams = {}): Promise<Blob> => {
    const response = await apiClient.get('/access-codes/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
