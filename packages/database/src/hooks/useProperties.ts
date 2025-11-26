'use client';

/**
 * React hook for fetching properties
 */
import { useEffect, useState } from 'react';
import { supabase, Property } from '../client';

export interface UsePropertiesOptions {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minSqm?: number;
  maxSqm?: number;
  rooms?: number;
  minYield?: number;
  status?: string;
  limit?: number;
}

export interface UsePropertiesResult {
  properties: Property[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProperties(options?: UsePropertiesOptions): UsePropertiesResult {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', options?.status || 'active');

      // Apply filters
      if (options?.location) {
        query = query.ilike('location', `%${options.location}%`);
      }

      if (options?.minPrice !== undefined) {
        query = query.gte('price', options.minPrice);
      }

      if (options?.maxPrice !== undefined) {
        query = query.lte('price', options.maxPrice);
      }

      if (options?.minSqm !== undefined) {
        query = query.gte('sqm', options.minSqm);
      }

      if (options?.maxSqm !== undefined) {
        query = query.lte('sqm', options.maxSqm);
      }

      if (options?.rooms !== undefined) {
        query = query.eq('rooms', options.rooms);
      }

      if (options?.minYield !== undefined) {
        query = query.gte('yield', options.minYield);
      }

      // Apply limit
      if (options?.limit !== undefined) {
        query = query.limit(options.limit);
      }

      // Order by created_at descending (newest first)
      const { data, error: fetchError } = await query.order('created_at', {
        ascending: false,
      });

      if (fetchError) throw fetchError;

      setProperties(data || []);
    } catch (e) {
      setError(e as Error);
      console.error('Error fetching properties:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [
    options?.location,
    options?.minPrice,
    options?.maxPrice,
    options?.minSqm,
    options?.maxSqm,
    options?.rooms,
    options?.minYield,
    options?.status,
    options?.limit,
  ]);

  return { properties, loading, error, refetch: fetchProperties };
}
