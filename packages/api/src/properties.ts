/**
 * Properties API functions
 * Server-side functions for property operations
 */
import { supabase, Property, PropertyInsert } from '@immoflow/database';

export interface PropertyOwner {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface PropertyWithOwner extends Property {
  owner?: PropertyOwner | null;
}

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
 * Get a single property by ID with owner profile data
 */
export async function getPropertyWithOwner(id: string): Promise<PropertyWithOwner | null> {
  // First get the property
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (propertyError) {
    if (propertyError.code === 'PGRST116') {
      return null; // Property not found
    }
    console.error('Error fetching property:', propertyError);
    throw new Error(`Failed to fetch property: ${propertyError.message}`);
  }

  // Then get the owner profile if user_id exists
  let owner: PropertyOwner | null = null;
  if (property.user_id) {
    const { data: ownerData, error: ownerError } = await supabase
      .from('user_profiles')
      .select('id, user_id, first_name, last_name, phone, company, avatar_url, bio')
      .eq('user_id', property.user_id)
      .single();

    if (!ownerError && ownerData) {
      owner = ownerData;
    }
  }

  return {
    ...property,
    owner,
  } as PropertyWithOwner;
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

/**
 * Get properties by user ID
 */
export async function getPropertiesByUserId(userId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user properties:', error);
    throw new Error(`Failed to fetch user properties: ${error.message}`);
  }

  return data || [];
}

/**
 * Deactivate a property (set status to 'archived')
 */
export async function deactivateProperty(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating property:', error);
    throw new Error(`Failed to deactivate property: ${error.message}`);
  }

  return data;
}

/**
 * Activate a property (set status to 'active')
 */
export async function activateProperty(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .update({ status: 'active' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error activating property:', error);
    throw new Error(`Failed to activate property: ${error.message}`);
  }

  return data;
}

export interface AISearchCriteria {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minSqm?: number;
  maxSqm?: number;
  features?: string[];
}

export interface AISearchResponse {
  properties: Property[];
  criteria: AISearchCriteria;
  query: string;
  count: number;
}

/**
 * Search properties using AI-powered natural language query
 * Example: "3 Zimmer Wohnung in München mit Balkon unter 500000€"
 */
export async function searchPropertiesWithAI(query: string): Promise<AISearchResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-property-search', {
      body: { query },
    });

    if (error) {
      console.error('Error calling ai-property-search function:', error);
      throw new Error(error.message || 'Failed to search properties with AI');
    }

    return data as AISearchResponse;
  } catch (error) {
    console.error('Error in searchPropertiesWithAI:', error);
    throw error;
  }
}
