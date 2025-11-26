/**
 * Favorites API functions
 */
import { supabase, Favorite, FavoriteInsert } from '@immoflow/database';

/**
 * Get all favorites for a user
 */
export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, properties(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    throw new Error(`Failed to fetch favorites: ${error.message}`);
  }

  return data || [];
}

/**
 * Add a favorite
 */
export async function addFavorite(favorite: FavoriteInsert): Promise<Favorite> {
  const { data, error } = await supabase
    .from('favorites')
    .insert(favorite)
    .select()
    .single();

  if (error) {
    // If it's a duplicate, just return existing
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', favorite.user_id)
        .eq('property_id', favorite.property_id)
        .single();

      if (existing) return existing;
    }

    console.error('Error adding favorite:', error);
    throw new Error(`Failed to add favorite: ${error.message}`);
  }

  return data;
}

/**
 * Remove a favorite
 */
export async function removeFavorite(userId: string, propertyId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error removing favorite:', error);
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }
}

/**
 * Check if a property is favorited by a user
 */
export async function isFavorite(userId: string, propertyId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false; // Not found
    }
    console.error('Error checking favorite:', error);
    return false;
  }

  return !!data;
}
