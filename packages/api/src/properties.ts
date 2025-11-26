/**
 * Properties API functions
 * Server-side functions for property operations
 */
import { supabase, Property, PropertyInsert } from '@immoflow/database';

export interface GetPropertiesParams {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minSqm?: number;
  maxSqm?: number;
  rooms?: number;
  minYield?: number;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all properties with optional filters
 */
export async function getProperties(params?: GetPropertiesParams): Promise<Property[]> {
  let query = supabase
    .from('properties')
    .select('*')
    .eq('status', params?.status || 'active');

  // Apply filters
  if (params?.location) {
    query = query.ilike('location', `%${params.location}%`);
  }

  if (params?.minPrice !== undefined) {
    query = query.gte('price', params.minPrice);
  }

  if (params?.maxPrice !== undefined) {
    query = query.lte('price', params.maxPrice);
  }

  if (params?.minSqm !== undefined) {
    query = query.gte('sqm', params.minSqm);
  }

  if (params?.maxSqm !== undefined) {
    query = query.lte('sqm', params.maxSqm);
  }

  if (params?.rooms !== undefined) {
    query = query.eq('rooms', params.rooms);
  }

  if (params?.minYield !== undefined) {
    query = query.gte('yield', params.minYield);
  }

  // Pagination
  if (params?.limit !== undefined) {
    query = query.limit(params.limit);
  }

  if (params?.offset !== undefined) {
    query = query.range(params.offset, params.offset + (params?.limit || 20) - 1);
  }

  // Order by
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching properties:', error);
    throw new Error(`Failed to fetch properties: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single property by ID
 */
export async function getPropertyById(id: string): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Property not found
    }
    console.error('Error fetching property:', error);
    throw new Error(`Failed to fetch property: ${error.message}`);
  }

  return data;
}

/**
 * Create a new property
 */
export async function createProperty(property: PropertyInsert): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();

  if (error) {
    console.error('Error creating property:', error);
    throw new Error(`Failed to create property: ${error.message}`);
  }

  return data;
}

/**
 * Update a property
 */
export async function updateProperty(
  id: string,
  updates: Partial<PropertyInsert>
): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating property:', error);
    throw new Error(`Failed to update property: ${error.message}`);
  }

  return data;
}

/**
 * Delete a property
 */
export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id);

  if (error) {
    console.error('Error deleting property:', error);
    throw new Error(`Failed to delete property: ${error.message}`);
  }
}

/**
 * Increment property views
 */
export async function incrementPropertyViews(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_property_views', {
    property_id: id,
  });

  if (error) {
    console.error('Error incrementing property views:', error);
    // Don't throw - views are not critical
  }
}

/**
 * Search properties by query
 */
export async function searchProperties(query: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error searching properties:', error);
    throw new Error(`Failed to search properties: ${error.message}`);
  }

  return data || [];
}
