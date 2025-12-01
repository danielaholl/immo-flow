/**
 * Recommendation System API
 * TikTok-style personalized property recommendations
 */
import { supabase } from '@immoflow/database';
import type { Database } from '@immoflow/database';

// =====================================================
// TYPES
// =====================================================

// Use Supabase generated types
export type PropertyInteraction = Database['public']['Tables']['property_interactions']['Row'];
export type PropertyInteractionInsert = Database['public']['Tables']['property_interactions']['Insert'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

// Custom types for parsed JSON fields
export interface UserPreferencesParsed {
  id: string;
  user_id: string;
  preferred_locations: Array<{ location: string; weight: number }>;
  price_range: { min?: number; max?: number; avg?: number };
  preferred_rooms: Array<{ rooms: number; weight: number }>;
  preferred_features: Array<{ feature: string; weight: number }>;
  interaction_count: number;
  last_updated: string;
}

export interface PropertyWithScore {
  property: any;
  match_score: number;
  score_breakdown: {
    location_score: number;
    price_score: number;
    rooms_score: number;
    features_score: number;
    similarity_score: number;
  };
}

// =====================================================
// INTERACTION TRACKING
// =====================================================

/**
 * Track a user interaction with a property
 */
export async function trackInteraction(
  userId: string,
  propertyId: string,
  interactionType: 'view' | 'favorite' | 'unfavorite' | 'search_click' | 'share' | 'booking',
  options?: {
    dwellTimeSeconds?: number;
    source?: string;
    metadata?: Record<string, any>;
  }
): Promise<PropertyInteraction> {
  const { data, error } = await supabase
    .from('property_interactions')
    .insert({
      user_id: userId,
      property_id: propertyId,
      interaction_type: interactionType,
      dwell_time_seconds: options?.dwellTimeSeconds || 0,
      source: options?.source,
      metadata: options?.metadata as any || {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error tracking interaction:', error);
    throw new Error(`Failed to track interaction: ${error.message}`);
  }

  return data;
}

/**
 * Get user's interaction history
 */
export async function getUserInteractions(
  userId: string,
  limit: number = 50
): Promise<PropertyInteraction[]> {
  const { data, error } = await supabase
    .from('property_interactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching interactions:', error);
    throw new Error(`Failed to fetch interactions: ${error.message}`);
  }

  return data || [];
}

// =====================================================
// USER PREFERENCES
// =====================================================

/**
 * Calculate and update user preferences based on their interactions
 */
export async function updateUserPreferences(userId: string): Promise<void> {
  const { error } = await supabase.rpc('calculate_user_preferences', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error updating user preferences:', error);
    throw new Error(`Failed to update user preferences: ${error.message}`);
  }
}

/**
 * Get user's preference profile
 */
export async function getUserPreferences(userId: string): Promise<UserPreferencesParsed | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user preferences:', error);
    throw new Error(`Failed to fetch user preferences: ${error.message}`);
  }

  if (!data) return null;

  // Parse JSON fields
  return {
    id: data.id,
    user_id: data.user_id,
    preferred_locations: (data.preferred_locations as any) || [],
    price_range: (data.price_range as any) || {},
    preferred_rooms: (data.preferred_rooms as any) || [],
    preferred_features: (data.preferred_features as any) || [],
    interaction_count: data.interaction_count || 0,
    last_updated: data.last_updated || new Date().toISOString(),
  };
}

// =====================================================
// MATCHING ALGORITHM
// =====================================================

/**
 * Calculate match score between user preferences and a property
 * Returns a score from 0-100
 */
export function calculateMatchScore(
  property: any,
  preferences: UserPreferencesParsed | null
): PropertyWithScore {
  // Default score for new users or users without preferences
  if (!preferences || preferences.interaction_count === 0) {
    return {
      property,
      match_score: 50, // Neutral score for new users
      score_breakdown: {
        location_score: 0,
        price_score: 0,
        rooms_score: 0,
        features_score: 0,
        similarity_score: 0,
      },
    };
  }

  let totalScore = 0;
  const weights = {
    location: 0.3, // 30%
    price: 0.25, // 25%
    rooms: 0.15, // 15%
    features: 0.2, // 20%
    similarity: 0.1, // 10%
  };

  // 1. Location Match (30%)
  let locationScore = 0;
  const preferredLocs = preferences.preferred_locations || [];
  const locationMatch = preferredLocs.find(
    (loc: any) => property.location?.toLowerCase().includes(loc.location?.toLowerCase())
  );
  if (locationMatch) {
    locationScore = locationMatch.weight * 100;
  }

  // 2. Price Match (25%)
  let priceScore = 0;
  if (preferences.price_range?.min && preferences.price_range?.max) {
    const { min, max, avg } = preferences.price_range;
    const propertyPrice = property.price;

    if (propertyPrice >= min && propertyPrice <= max) {
      // Perfect match if within range
      // Higher score if closer to average
      const distanceFromAvg = avg ? Math.abs(propertyPrice - avg) : 0;
      const maxDistance = Math.max(Math.abs(max - (avg || 0)), Math.abs((avg || 0) - min));
      priceScore = maxDistance > 0 ? (1 - distanceFromAvg / maxDistance) * 100 : 100;
    } else if (propertyPrice < min) {
      // Below range - partial score based on how close
      const gap = min - propertyPrice;
      const range = max - min;
      priceScore = Math.max(0, (1 - gap / range) * 50);
    } else {
      // Above range - partial score based on how close
      const gap = propertyPrice - max;
      const range = max - min;
      priceScore = Math.max(0, (1 - gap / range) * 50);
    }
  }

  // 3. Rooms Match (15%)
  let roomsScore = 0;
  const preferredRooms = preferences.preferred_rooms || [];
  const roomMatch = preferredRooms.find((r: any) => r.rooms === property.rooms);
  if (roomMatch) {
    roomsScore = roomMatch.weight * 100;
  } else {
    // Partial score for nearby room counts
    const closestRoom = preferredRooms.reduce((closest: any, current: any) => {
      if (!closest) return current;
      return Math.abs(current.rooms - property.rooms) < Math.abs(closest.rooms - property.rooms)
        ? current
        : closest;
    }, null);
    if (closestRoom) {
      const distance = Math.abs(closestRoom.rooms - property.rooms);
      roomsScore = distance <= 1 ? closestRoom.weight * 50 : 0;
    }
  }

  // 4. Features Match (20%)
  let featuresScore = 0;
  const preferredFeatures = preferences.preferred_features || [];
  const propertyFeatures = property.features || [];

  if (preferredFeatures.length > 0 && propertyFeatures.length > 0) {
    let matchedWeight = 0;
    let totalWeight = 0;

    preferredFeatures.forEach((pref: any) => {
      totalWeight += pref.weight;
      if (propertyFeatures.includes(pref.feature)) {
        matchedWeight += pref.weight;
      }
    });

    featuresScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  }

  // 5. Similarity Score (10%) - Based on AI score if available
  let similarityScore = 0;
  if (property.ai_score) {
    similarityScore = property.ai_score;
  }

  // Calculate weighted total score
  totalScore =
    locationScore * weights.location +
    priceScore * weights.price +
    roomsScore * weights.rooms +
    featuresScore * weights.features +
    similarityScore * weights.similarity;

  return {
    property,
    match_score: Math.round(totalScore),
    score_breakdown: {
      location_score: Math.round(locationScore),
      price_score: Math.round(priceScore),
      rooms_score: Math.round(roomsScore),
      features_score: Math.round(featuresScore),
      similarity_score: Math.round(similarityScore),
    },
  };
}

// =====================================================
// PERSONALIZED FEED
// =====================================================

/**
 * Get personalized property recommendations for a user
 * Returns properties sorted by match score
 */
export async function getPersonalizedFeed(
  userId: string,
  options?: {
    limit?: number;
    excludeViewed?: boolean;
    diversityFactor?: number; // 0-1, higher = more diversity
  }
): Promise<PropertyWithScore[]> {
  const limit = options?.limit || 50;
  const diversityFactor = options?.diversityFactor ?? 0.3;

  // 1. Get user preferences
  const preferences = await getUserPreferences(userId);

  // 2. Fetch active properties
  let query = supabase
    .from('properties')
    .select('*')
    .eq('status', 'active');

  // Optionally exclude already viewed properties
  if (options?.excludeViewed) {
    const { data: viewedProperties } = await supabase
      .from('property_interactions')
      .select('property_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'view');

    if (viewedProperties && viewedProperties.length > 0) {
      const viewedIds = viewedProperties.map((v) => v.property_id);
      query = query.not('id', 'in', `(${viewedIds.join(',')})`);
    }
  }

  // Fetch more properties than needed for diversity balancing
  const fetchLimit = Math.min(limit * 3, 150);
  query = query.limit(fetchLimit);

  const { data: properties, error } = await query;

  if (error) {
    console.error('Error fetching properties:', error);
    throw new Error(`Failed to fetch properties: ${error.message}`);
  }

  if (!properties || properties.length === 0) {
    return [];
  }

  // 3. Calculate match scores for all properties
  const scoredProperties = properties.map((property) =>
    calculateMatchScore(property, preferences)
  );

  // 4. Sort by match score (descending)
  scoredProperties.sort((a, b) => b.match_score - a.match_score);

  // 5. Apply diversity balancing
  // Ensure we don't show too many properties from the same location
  const diversifiedProperties: PropertyWithScore[] = [];
  const locationCounts: Record<string, number> = {};
  const maxPerLocation = Math.max(2, Math.floor(limit / 5)); // Max 20% from same location

  for (const scoredProp of scoredProperties) {
    const location = scoredProp.property.location || 'unknown';
    const currentCount = locationCounts[location] || 0;

    // Apply diversity factor: sometimes skip perfect matches for diversity
    const shouldSkipForDiversity =
      currentCount >= maxPerLocation && Math.random() < diversityFactor;

    if (!shouldSkipForDiversity || diversifiedProperties.length >= limit) {
      diversifiedProperties.push(scoredProp);
      locationCounts[location] = currentCount + 1;
    }

    if (diversifiedProperties.length >= limit) {
      break;
    }
  }

  // 6. Add some random "exploration" properties (10% of feed)
  const explorationCount = Math.floor(limit * 0.1);
  if (diversifiedProperties.length < limit && properties.length > diversifiedProperties.length) {
    const remainingProperties = scoredProperties.filter(
      (sp) => !diversifiedProperties.includes(sp)
    );

    // Shuffle and take random properties
    const shuffled = remainingProperties.sort(() => Math.random() - 0.5);
    diversifiedProperties.push(...shuffled.slice(0, explorationCount));
  }

  return diversifiedProperties.slice(0, limit);
}

/**
 * Get trending properties (most viewed recently)
 */
export async function getTrendingProperties(limit: number = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .order('views', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending properties:', error);
    throw new Error(`Failed to fetch trending properties: ${error.message}`);
  }

  return data || [];
}

/**
 * Get similar properties based on a property ID
 */
export async function getSimilarProperties(
  propertyId: string,
  limit: number = 10
): Promise<any[]> {
  // Get the reference property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propError || !property) {
    console.error('Error fetching property:', propError);
    throw new Error(`Failed to fetch property: ${propError?.message}`);
  }

  // Find similar properties based on location, price range, and rooms
  const priceMin = property.price * 0.8;
  const priceMax = property.price * 1.2;

  const { data: similarProps, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .neq('id', propertyId)
    .eq('location', property.location)
    .gte('price', priceMin)
    .lte('price', priceMax)
    .limit(limit);

  if (error) {
    console.error('Error fetching similar properties:', error);
    // Don't throw, just return empty array
    return [];
  }

  return similarProps || [];
}
