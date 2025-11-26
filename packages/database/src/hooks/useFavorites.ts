'use client';

/**
 * React hook for managing favorites
 */
import { useEffect, useState } from 'react';
import { supabase, Favorite } from '../client';

export interface UseFavoritesResult {
  favorites: Favorite[];
  loading: boolean;
  error: Error | null;
  addFavorite: (propertyId: string) => Promise<void>;
  removeFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  refetch: () => Promise<void>;
}

export function useFavorites(userId?: string): UseFavoritesResult {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFavorites = async () => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFavorites(data || []);
    } catch (e) {
      setError(e as Error);
      console.error('Error fetching favorites:', e);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (propertyId: string) => {
    if (!userId) {
      throw new Error('User must be logged in to add favorites');
    }

    try {
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({ property_id: propertyId, user_id: userId });

      if (insertError) throw insertError;

      // Refetch to update the list
      await fetchFavorites();
    } catch (e) {
      console.error('Error adding favorite:', e);
      throw e;
    }
  };

  const removeFavorite = async (propertyId: string) => {
    if (!userId) {
      throw new Error('User must be logged in to remove favorites');
    }

    try {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('property_id', propertyId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Refetch to update the list
      await fetchFavorites();
    } catch (e) {
      console.error('Error removing favorite:', e);
      throw e;
    }
  };

  const isFavorite = (propertyId: string): boolean => {
    return favorites.some(fav => fav.property_id === propertyId);
  };

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
