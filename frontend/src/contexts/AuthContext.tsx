'use client';

/**
 * Authentication context provider.
 * Manages user state, login/logout, and token persistence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { authAPI } from '@/lib/api';
import type { User, TokenResponse } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Connect to NextAuth global module
  const { data: session, status } = useSession();

  // Load user from backend on mount natively over secure cookies
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Verify token is still valid using backend cookies implicitly
        const response = await authAPI.getProfile();
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch {
        // If profile fetch completely failed, we are cleanly logged out 
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        if (status !== 'loading') {
            setIsLoading(false);
        }
      }
    };
    loadUser();
  }, [status]);

  // Intercept NextAuth successful logins to securely issue backend JWT cookies natively
  useEffect(() => {
    const syncOAuth = async () => {
      if (status === 'authenticated' && session?.user?.email && !user) {
        try {
          setIsLoading(true);
          const response = await authAPI.oauth({
             email: session.user.email,
             name: session.user.name || 'OAuth User',
             provider: 'oauth_platform' 
          });
          
          // Cookies are automatically secured by the browser via the Axios response
          localStorage.setItem('user', JSON.stringify(response.data.user));
          setUser(response.data.user);
        } catch (error) {
           console.error("Critical OAuth translation error:", error);
           await signOut({ redirect: false });
        } finally {
           setIsLoading(false);
        }
      }
    };
    syncOAuth();
  }, [session, status, user]);

  const logout = useCallback(async () => {
    try {
        await authAPI.logout();
    } catch (e) {}
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
