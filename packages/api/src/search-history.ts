/**
 * Search History API functions
 * Migrated to use PostgreSQL directly
 */
import { query, queryOne, queryWithUser } from '@immoflow/database';
import type { Database } from '@immoflow/database';

// Use database generated types
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
  try {
    // First, check if this exact query already exists for this user
    const existing = await queryOne<SearchHistory>(
      'SELECT * FROM search_history WHERE user_id = $1 AND query = $2',
      [search.user_id, search.query]
    );

    if (existing) {
      // Update existing search with new timestamp and results count
      const updated = await queryOne<SearchHistory>(
        `UPDATE search_history
         SET last_searched_at = $1, results_count = $2, criteria = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [
          new Date().toISOString(),
          search.results_count ?? existing.results_count,
          JSON.stringify(search.criteria ?? existing.criteria),
          existing.id,
        ]
      );

      return updated;
    } else {
      // Create new search history entry
      const inserted = await queryOne<SearchHistory>(
        `INSERT INTO search_history (user_id, query, criteria, results_count, last_searched_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          search.user_id,
          search.query,
          JSON.stringify(search.criteria ?? {}),
          search.results_count ?? 0,
          new Date().toISOString(),
        ]
      );

      return inserted;
    }
  } catch (error) {
    console.error('Error saving search history:', error);
    throw new Error(`Failed to save search history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user's search history (most recent first based on last_searched_at)
 */
export async function getUserSearchHistory(
  userId: string,
  limit: number = 10
): Promise<SearchHistory[]> {
  try {
    const results = await query<SearchHistory>(
      `SELECT * FROM search_history
       WHERE user_id = $1
       ORDER BY last_searched_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results;
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw new Error(`Failed to fetch search history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a search from history
 */
export async function deleteSearchHistory(id: string): Promise<void> {
  try {
    await query('DELETE FROM search_history WHERE id = $1', [id]);
  } catch (error) {
    console.error('Error deleting search history:', error);
    throw new Error(`Failed to delete search history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear all search history for a user
 */
export async function clearUserSearchHistory(userId: string): Promise<void> {
  try {
    await query('DELETE FROM search_history WHERE user_id = $1', [userId]);
  } catch (error) {
    console.error('Error clearing search history:', error);
    throw new Error(`Failed to clear search history: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * TODO: Migrate from Supabase Edge Function to local API endpoint
 */
export async function generateSearchProfile(userId: string): Promise<SearchProfile> {
  try {
    // TODO: Implement this using local API endpoint instead of Supabase Edge Function
    // For now, return a basic profile based on search history
    const searchHistory = await getUserSearchHistory(userId, 50);

    // Extract locations and features from search history
    const locations = new Set<string>();
    const features = new Set<string>();
    let totalResults = 0;

    searchHistory.forEach((search) => {
      if (search.criteria) {
        const criteria = typeof search.criteria === 'string'
          ? JSON.parse(search.criteria)
          : search.criteria;

        if (criteria.location) locations.add(criteria.location);
        if (criteria.features) {
          criteria.features.forEach((f: string) => features.add(f));
        }
      }
      totalResults += search.results_count || 0;
    });

    return {
      summary: `Based on ${searchHistory.length} searches with ${totalResults} total results`,
      preferredLocations: Array.from(locations),
      preferredFeatures: Array.from(features),
      recommendations: [
        'Continue exploring properties in your preferred locations',
        'Check out similar properties with your favorite features',
      ],
    };
  } catch (error) {
    console.error('Error in generateSearchProfile:', error);
    throw new Error(`Failed to generate search profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
