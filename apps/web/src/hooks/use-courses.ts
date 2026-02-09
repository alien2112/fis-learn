import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

// Single course - cached aggressively
export function useCourse(slug: string) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const { data } = await apiClient.get(`/courses/slug/${slug}`);
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - courses don't change often
    gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime in v4)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Course list - use infinite query for pagination
export function useCourses(searchParams: Record<string, any> = {}) {
  return useInfiniteQuery({
    queryKey: ['courses', searchParams],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get('/courses', {
        params: { ...searchParams, page: pageParam },
      });
      return data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page >= lastPage.meta.totalPages) return undefined;
      return lastPage.meta.page + 1;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

// User's enrolled courses
export function useEnrollments(userId: string) {
  return useQuery({
    queryKey: ['enrollments', userId],
    queryFn: async () => {
      const { data } = await apiClient.get('/courses/enrollments');
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,
    enabled: !!userId,
    refetchOnWindowFocus: false,
  });
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/categories');
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - categories rarely change
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
  });
}
