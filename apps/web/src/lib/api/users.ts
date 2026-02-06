export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  locale: string;
  timezone: string;
  subscriptionTier: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    enrollments: number;
  };
}

export interface UpdateProfileDto {
  name?: string;
  avatarUrl?: string;
  locale?: string;
  timezone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

import apiClient from './client';

export const usersApi = {
  getMe: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/users/me');
    return response.data.data;
  },

  updateMe: async (dto: UpdateProfileDto): Promise<UserProfile> => {
    const response = await apiClient.put('/users/me', dto);
    return response.data.data;
  },

  changePassword: async (dto: ChangePasswordDto): Promise<{ message: string }> => {
    const response = await apiClient.put('/users/me/password', dto);
    return response.data.data;
  },
};
