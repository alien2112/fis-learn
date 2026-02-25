'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/api/client';
import { clearTokens } from '@/lib/auth-storage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION';
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'] as const;
const VALID_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION'] as const;

function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  // Strip HTML tags and trim
  return value.replace(/<[^>]*>/g, '').trim();
}

function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  // Only allow http(s) URLs
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

function sanitizeUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') return null;

  const raw = data as Record<string, unknown>;

  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.email !== 'string' || !raw.email) return null;

  const role = raw.role as string;
  const status = raw.status as string;

  if (!VALID_ROLES.includes(role as any)) return null;
  if (!VALID_STATUSES.includes(status as any)) return null;

  return {
    id: raw.id as string,
    email: sanitizeString(raw.email),
    name: sanitizeString(raw.name),
    role: role as AuthUser['role'],
    status: status as AuthUser['status'],
    avatarUrl: sanitizeUrl(raw.avatarUrl),
    locale: typeof raw.locale === 'string' ? sanitizeString(raw.locale) : undefined,
    timezone: typeof raw.timezone === 'string' ? sanitizeString(raw.timezone) : undefined,
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const payload = response.data;
      setUser(sanitizeUser(payload?.data));
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    clearTokens();

    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore logout errors
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Memoize context value so consumers only re-render when user/isLoading actually changes
  const contextValue = useMemo(
    () => ({ user, isLoading, refreshUser, logout }),
    [user, isLoading, refreshUser, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
