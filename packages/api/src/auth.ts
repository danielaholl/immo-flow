/**
 * Authentication API functions
 */
import { supabase } from '@immoflow/database';
import type { User } from '@supabase/supabase-js';

export interface SignUpParams {
  email: string;
  password: string;
  name?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUp({ email, password, name }: SignUpParams): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    console.error('Error signing up:', error);
    throw new Error(`Failed to sign up: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned from sign up');
  }

  return data.user;
}

/**
 * Sign in an existing user
 */
export async function signIn({ email, password }: SignInParams): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error);
    throw new Error(`Failed to sign in: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned from sign in');
  }

  return data.user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw new Error(`Failed to sign out: ${error.message}`);
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }

  return user;
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    console.error('Error resetting password:', error);
    throw new Error(`Failed to reset password: ${error.message}`);
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error updating password:', error);
    throw new Error(`Failed to update password: ${error.message}`);
  }
}
