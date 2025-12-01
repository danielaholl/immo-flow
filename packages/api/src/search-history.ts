/**
 * Search History API functions
 */
import { supabase } from '@immoflow/database';
import type { Database } from '@immoflow/database';

// Use Supabase generated types
export type SearchHistory = Database['public']['Tables']['search_history']['Row'];

export interface SearchHistoryInsert {
  user_id: string;
  query: string;
  criteria?: any;
  results_count?: number;
}

/**
 * Save a search query to history
 * If the same query exists, update last_searched_at and results_count
 */
export async function saveSearchHistory(search: SearchHistoryInsert): Promise<SearchHistory | null> {
  // First, check if this exact query already exists for this user
  // Use maybeSingle() to avoid 406 errors when no record exists
  const { data: existing } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', search.user_id)
    .eq('query', search.query)
    .maybeSingle();

  // maybeSingle() returns null when no record exists (not an error)
  if (existing) {
    // Update existing search with new timestamp and results count
    const { data, error } = await supabase
      .from('search_history')
      .update({
        last_searched_at: new Date().toISOString(),
        results_count: search.results_count,
        criteria: search.criteria as any,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating search history:', error);
      throw new Error(`Failed to update search history: ${error.message}`);
    }

    return data;
  } else {
    // Create new search history entry
    const { data, error } = await supabase
      .from('search_history')
      .insert({
        ...search,
        criteria: search.criteria as any,
        last_searched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving search history:', error);
      throw new Error(`Failed to save search history: ${error.message}`);
    }

    return data;
  }
}

/**
 * Get user's search history (most recent first based on last_searched_at)
 */
export async function getUserSearchHistory(
  userId: string,
  limit: number = 10
): Promise<SearchHistory[]> {
  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', userId)
    .order('last_searched_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching search history:', error);
    throw new Error(`Failed to fetch search history: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete a search from history
 */
export async function deleteSearchHistory(id: string): Promise<void> {
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting search history:', error);
    throw new Error(`Failed to delete search history: ${error.message}`);
  }
}

/**
 * Clear all search history for a user
 */
export async function clearUserSearchHistory(userId: string): Promise<void> {
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing search history:', error);
    throw new Error(`Failed to clear search history: ${error.message}`);
  }
}

export interface SearchProfile {
  summary: string;
  preferredLocations: string[];
  priceRange?: { min?: number; max?: number };
  preferredRooms?: number[];
  preferredFeatures: string[];
  recommendations: string[];
}

/**
 * Generate a personalized search profile based on user's search history
 */
export async function generateSearchProfile(userId: string): Promise<SearchProfile> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-search-profile', {
      body: { userId },
    });

    if (error) {
      console.error('Error calling generate-search-profile function:', error);
      throw new Error(error.message || 'Failed to generate search profile');
    }

    return data.profile as SearchProfile;
  } catch (error) {
    console.error('Error in generateSearchProfile:', error);
    throw error;
  }
}
