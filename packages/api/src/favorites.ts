/**
 * Favorites API functions
 */
import { supabase, Favorite, FavoriteInsert } from '@immoflow/database';

/**
 * Get all favorites for a user (only active properties) with owner data
 */
export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, properties!inner(*)')
    .eq('user_id', userId)
    .eq('properties.status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    throw new Error(`Failed to fetch favorites: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get unique user_ids from properties
  const userIds = [...new Set(
    data
      .map((fav: any) => fav.properties?.user_id)
      .filter((id: string | undefined | null) => id !== undefined && id !== null)
  )] as string[];

  // Fetch owner profiles for all properties
  let ownerProfiles: any[] = [];
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, company, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching owner profiles:', profilesError);
    } else {
      ownerProfiles = profiles || [];
    }
  }

  // Map owner profiles to properties (using user_id as key)
  const profilesMap = new Map(ownerProfiles.map(p => [p.user_id, p]));

  return data.map((fav: any) => ({
    ...fav,
    properties: {
      ...fav.properties,
      owner: fav.properties.user_id ? profilesMap.get(fav.properties.user_id) : null,
    },
  }));
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
