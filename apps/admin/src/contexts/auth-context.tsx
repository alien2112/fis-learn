'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { authApi } from '@/lib/api';
import { setTokens, clearTokens } from '@/lib/auth-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }
  }, []);

  // Check auth on mount by calling /auth/me (cookie sent automatically)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshUser();
      } catch {
        // Not authenticated
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    if (response.tokens?.accessToken && response.tokens?.refreshToken) {
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
    }
    setUser(response.user);

    // Check if user has admin access
    if (!['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'].includes(response.user.role)) {
      await logout();
      throw new Error('Access denied. Admin privileges required.');
    }
  };

  const logout = async () => {
    clearTokens();
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
