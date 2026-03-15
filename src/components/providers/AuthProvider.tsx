'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthenticationError } from '@/lib/errors';

/**
 * Authentication context value
 */
interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider component
 * Manages authentication state across the application
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
      });

      if (response.ok) {
        setAuthenticated(true);
        return true;
      } else {
        setAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthenticated(false);
      return false;
    }
  }, []);

  /**
   * Login with authentication token
   */
  const login = useCallback(async (token: string): Promise<void> => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new AuthenticationError('Invalid authentication token');
      }

      // Store token in localStorage
      localStorage.setItem('auth_token', token);
      setAuthenticated(true);
    } catch (error) {
      setAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout current user
   */
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      localStorage.removeItem('auth_token');
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Logout anyway even if API call fails
      localStorage.removeItem('auth_token');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check auth on mount
   */
  useEffect(() => {
    checkAuth().then(() => setLoading(false));
  }, [checkAuth]);

  const value: AuthContextValue = {
    authenticated,
    loading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
