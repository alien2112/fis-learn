import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
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

// Token refresh state - shared across all requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function processQueue(error: AxiosError | null) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(apiClient(config));
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Don't intercept refresh or login requests, or the initial 'me' check
    const url = originalRequest.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/me')) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    isRefreshing = true;

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
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      if (typeof window !== 'undefined') {
        clearTokens();
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
