/**
 * Supabase client initialization
 * Works in both web (Next.js) and mobile (Expo) environments
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables - works for both Next.js and Expo
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (for web)\n' +
    'or EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (for mobile)'
  );
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Export types for convenience
export type { Database };

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenient type exports for commonly used tables
export type Property = Tables<'properties'>;
export type Agent = Tables<'agents'>;
export type Booking = Tables<'bookings'>;
export type Favorite = Tables<'favorites'>;

export type PropertyInsert = Inserts<'properties'>;
export type AgentInsert = Inserts<'agents'>;
export type BookingInsert = Inserts<'bookings'>;
export type FavoriteInsert = Inserts<'favorites'>;
