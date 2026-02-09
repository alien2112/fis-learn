import apiClient from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  features: string[];
  maxCourses: number | null;
  maxStorage: number | null; // in bytes
  supportLevel: 'BASIC' | 'PRIORITY' | 'PREMIUM';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

export interface CreatePlanDto {
  name: string;
  description: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  features: string[];
  maxCourses?: number;
  maxStorage?: number;
  supportLevel: 'BASIC' | 'PRIORITY' | 'PREMIUM';
  isActive?: boolean;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  totalSubscribers: number;
  monthlyRevenue: number;
}

export const subscriptionsApi = {
  // Get all plans (admin)
  getAllPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/subscriptions/admin/plans');
    return response.data.data;
  },

  // Get plan stats
  getStats: async (): Promise<PlanStats> => {
    const response = await apiClient.get('/subscriptions/admin/stats');
    return response.data.data;
  },

  // Create plan
  createPlan: async (data: CreatePlanDto): Promise<SubscriptionPlan> => {
    const response = await apiClient.post('/subscriptions/plans', data);
    return response.data.data;
  },

  // Update plan
  updatePlan: async (id: string, data: UpdatePlanDto): Promise<SubscriptionPlan> => {
    const response = await apiClient.patch(`/subscriptions/plans/${id}`, data);
    return response.data.data;
  },

  // Delete plan
  deletePlan: async (id: string): Promise<void> => {
    await apiClient.delete(`/subscriptions/plans/${id}`);
  },

  // Toggle plan active status
  togglePlanStatus: async (id: string, isActive: boolean): Promise<SubscriptionPlan> => {
    const response = await apiClient.patch(`/subscriptions/plans/${id}`, { isActive });
    return response.data.data;
  },
};
