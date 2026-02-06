import apiClient from './client';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  coverImageUrl?: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  tags: { id: string; name: string; slug: string }[];
  publishedAt: string;
  createdAt: string;
}

export interface BlogQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  tag?: string;
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

export const blogApi = {
  getPosts: async (params: BlogQueryParams = {}): Promise<PaginatedResponse<BlogPost>> => {
    const response = await apiClient.get('/blog', { params });
    return response.data.data;
  },

  getPostBySlug: async (slug: string): Promise<BlogPost> => {
    const response = await apiClient.get(`/blog/${slug}`);
    return response.data.data;
  },

  getRecentPosts: async (limit = 5): Promise<BlogPost[]> => {
    const response = await apiClient.get('/blog', { params: { limit, page: 1 } });
    return response.data.data.data;
  },
};
