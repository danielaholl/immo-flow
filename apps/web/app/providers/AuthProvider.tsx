'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, User, Session } from '@immoflow/database';
import { signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut } from '@immoflow/api';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  global_address_consent: boolean;
  consent_given_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user) return;

    try {
      const profileData = await fetchUserProfile(user.id);
      // Only update if component is still mounted (checked via useEffect cleanup)
      setProfile(profileData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout | null = null;
    let currentProfileFetch: Promise<UserProfile | null> | null = null;

    // Listen for auth changes - this is the source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('[AuthProvider] Auth state changed:', event, { hasSession: !!session, hasUser: !!session?.user });

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('[AuthProvider] Fetching user profile for:', session.user.id);

        // Cancel any previous profile fetch by not using its result
        const fetchPromise = fetchUserProfile(session.user.id);
        currentProfileFetch = fetchPromise;

        try {
          const profileData = await fetchPromise;

          // Only update state if this is still the current fetch and component is mounted
          if (mounted && currentProfileFetch === fetchPromise) {
            setProfile(profileData);
            console.log('[AuthProvider] Profile loaded:', !!profileData);
          }
        } catch (error) {
          if (mounted && currentProfileFetch === fetchPromise) {
            console.error('[AuthProvider] Error loading profile:', error);
            setProfile(null);
          }
        }
      } else {
        // Clear any pending profile fetch
        currentProfileFetch = null;
        if (mounted) {
          setProfile(null);
        }
      }

      // Clear any pending loading timeout
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }

      // Set loading to false:
      // - Immediately if we have a session (user is logged in)
      // - Immediately for SIGNED_OUT event
      // - After a delay for INITIAL_SESSION with no session (to wait for potential SIGNED_IN event)
      if (session || event === 'SIGNED_OUT') {
        if (mounted) {
          setLoading(false);
          console.log('[AuthProvider] Auth loading complete after event:', event);
        }
      } else if (event === 'INITIAL_SESSION') {
        // No session on initial load - wait 500ms for potential SIGNED_IN event
        // This handles the case where session is being restored from localStorage
        console.log('[AuthProvider] INITIAL_SESSION with no session, waiting for potential SIGNED_IN...');
        loadingTimeout = setTimeout(() => {
          if (mounted) {
            console.log('[AuthProvider] No SIGNED_IN event after 500ms, setting loading to false');
            setLoading(false);
          }
        }, 500);
      } else {
        if (mounted) {
          setLoading(false);
          console.log('[AuthProvider] Auth loading complete after event:', event);
        }
      }
    });

    // Trigger initial session check - this will fire INITIAL_SESSION event
    console.log('[AuthProvider] Initializing auth...');
    supabase.auth.getSession();

    return () => {
      mounted = false;
      currentProfileFetch = null;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      await apiSignIn({ email, password });
      // Auth state will be updated by onAuthStateChange listener
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      await apiSignUp({ email, password, firstName, lastName });
      // Note: The profile will be auto-created by the database trigger
      // Auth state will be updated by onAuthStateChange listener
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await apiSignOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
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
