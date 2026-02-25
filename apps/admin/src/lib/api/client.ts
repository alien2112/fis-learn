import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

// Create axios instance with credentials (cookies sent automatically)
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Attach auth token from localStorage and CSRF from cookie
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (config.method && !['get', 'head', 'options'].includes(config.method)) {
      const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
      if (match) {
        config.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
      }
    }
  }
  return config;
});

// Response interceptor - handle token refresh via cookie
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Never intercept auth endpoint errors — let the caller handle them directly
    const url = originalRequest?.url || '';
    if (url.includes('/auth/login') || url.includes('/auth/register') ||
        url.includes('/auth/refresh') || url.includes('/auth/me')) {
      return Promise.reject(error);
    }

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = typeof window !== 'undefined' ? getRefreshToken() : null;
        const res = await apiClient.post<{ data: { accessToken: string; refreshToken: string } }>(
          '/auth/refresh',
          refreshToken ? { refreshToken } : {},
        );
        const tokens = res.data?.data;
        if (tokens?.accessToken && tokens?.refreshToken && typeof window !== 'undefined') {
          setTokens(tokens.accessToken, tokens.refreshToken);
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          clearTokens();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
