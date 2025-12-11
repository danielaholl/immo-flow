'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { initializeSocket, disconnectSocket } from '@/lib/socket';

interface User {
  id: string;
  email: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  global_address_consent: boolean;
  user_type: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile using tRPC (wait for auth init to complete)
  const { data: profile, refetch: refetchProfile } = trpc.auth.getProfile.useQuery(undefined, {
    enabled: !loading && !!user,
    retry: false,
  });

  // Auth mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);

          // IMPORTANT: Set cookie for SSR/middleware when restoring from localStorage
          document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

          // Set user first, then loading false in next tick to ensure state is updated
          setUser(parsedUser);
          console.log('[AuthProvider] Restored session from localStorage:', parsedUser.email);

          // Use setTimeout to ensure user state is set before marking loading as false
          await new Promise(resolve => setTimeout(resolve, 0));
        } catch (error) {
          console.error('[AuthProvider] Error parsing user data:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Initialize Socket.io when user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (user && token) {
      console.log('[AuthProvider] Initializing Socket.io for user:', user.email);
      initializeSocket(token);
    } else {
      console.log('[AuthProvider] Disconnecting Socket.io');
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      if (!user) {
        disconnectSocket();
      }
    };
  }, [user]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AuthProvider] Signing in:', email);
      const result = await loginMutation.mutateAsync({ email, password });

      // Store token in both localStorage (for client-side) and cookie (for SSR/middleware)
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user_data', JSON.stringify(result.user));

      // Set cookie for SSR and middleware
      document.cookie = `auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      setUser(result.user);
      console.log('[AuthProvider] Sign in successful');
    } catch (error) {
      console.error('[AuthProvider] Sign in error:', error);
      throw error;
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('[AuthProvider] Signing up:', email);
      const result = await registerMutation.mutateAsync({
        email,
        password,
        firstName,
        lastName,
      });

      // Store token in both localStorage (for client-side) and cookie (for SSR/middleware)
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user_data', JSON.stringify(result.user));

      // Set cookie for SSR and middleware
      document.cookie = `auth_token=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      setUser(result.user);
      console.log('[AuthProvider] Sign up successful');
    } catch (error) {
      console.error('[AuthProvider] Sign up error:', error);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');

      // Clear cookie
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      setUser(null);
      console.log('[AuthProvider] Sign out successful');
    } catch (error) {
      console.error('[AuthProvider] Sign out error:', error);
      throw error;
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!user) return;
    try {
      await refetchProfile();
    } catch (error) {
      console.error('[AuthProvider] Error refreshing profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    profile: profile || null,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
