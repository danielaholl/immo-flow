/**
 * Recommendation System API
 * TikTok-style personalized property recommendations
 * Migrated to use PostgreSQL directly
 */
import { query, queryOne, queryWithUser } from '@immoflow/database';
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
  try {
    const result = await queryOne<PropertyInteraction>(
      `INSERT INTO property_interactions (user_id, property_id, interaction_type, dwell_time_seconds, source, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        propertyId,
        interactionType,
        options?.dwellTimeSeconds || 0,
        options?.source || null,
        JSON.stringify(options?.metadata || {}),
      ]
    );

    if (!result) {
      throw new Error('Failed to insert interaction');
    }

    return result;
  } catch (error) {
    console.error('Error tracking interaction:', error);
    throw new Error(`Failed to track interaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user's interaction history
 */
export async function getUserInteractions(
  userId: string,
  limit: number = 50
): Promise<PropertyInteraction[]> {
  try {
    const results = await query<PropertyInteraction>(
      `SELECT * FROM property_interactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results;
  } catch (error) {
    console.error('Error fetching interactions:', error);
    throw new Error(`Failed to fetch interactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =====================================================
// USER PREFERENCES
// =====================================================

/**
 * Calculate and update user preferences based on their interactions
 * TODO: Migrate RPC function to local implementation
 */
export async function updateUserPreferences(userId: string): Promise<void> {
  try {
    // Call PostgreSQL function directly
    await query(
      'SELECT calculate_user_preferences($1)',
      [userId]
    );
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw new Error(`Failed to update user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user's preference profile
 */
export async function getUserPreferences(userId: string): Promise<UserPreferencesParsed | null> {
  try {
    const data = await queryOne<UserPreferences>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (!data) return null;

    // Parse JSON fields
    return {
      id: data.id,
      user_id: data.user_id,
      preferred_locations: (typeof data.preferred_locations === 'string'
        ? JSON.parse(data.preferred_locations)
        : data.preferred_locations) || [],
      price_range: (typeof data.price_range === 'string'
        ? JSON.parse(data.price_range)
        : data.price_range) || {},
      preferred_rooms: (typeof data.preferred_rooms === 'string'
        ? JSON.parse(data.preferred_rooms)
        : data.preferred_rooms) || [],
      preferred_features: (typeof data.preferred_features === 'string'
        ? JSON.parse(data.preferred_features)
        : data.preferred_features) || [],
      interaction_count: data.interaction_count || 0,
      last_updated: data.last_updated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    throw new Error(`Failed to fetch user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

  try {
    // 1. Get user preferences
    const preferences = await getUserPreferences(userId);

    // 2. Fetch active properties
    let properties: any[];

    if (options?.excludeViewed) {
      // Get viewed property IDs first
      const viewedProperties = await query<{ property_id: string }>(
        `SELECT property_id FROM property_interactions
         WHERE user_id = $1 AND interaction_type = 'view'`,
        [userId]
      );

      const viewedIds = viewedProperties.map((v) => v.property_id);

      // Fetch properties excluding viewed ones
      const fetchLimit = Math.min(limit * 3, 150);
      if (viewedIds.length > 0) {
        properties = await query(
          `SELECT * FROM properties
           WHERE status = 'active' AND id NOT IN (${viewedIds.map((_, i) => `$${i + 1}`).join(',')})
           LIMIT $${viewedIds.length + 1}`,
          [...viewedIds, fetchLimit]
        );
      } else {
        properties = await query(
          'SELECT * FROM properties WHERE status = $1 LIMIT $2',
          ['active', fetchLimit]
        );
      }
    } else {
      // Fetch more properties than needed for diversity balancing
      const fetchLimit = Math.min(limit * 3, 150);
      properties = await query(
        'SELECT * FROM properties WHERE status = $1 LIMIT $2',
        ['active', fetchLimit]
      );
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
  } catch (error) {
    console.error('Error getting personalized feed:', error);
    throw new Error(`Failed to get personalized feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get trending properties (most viewed recently)
 */
export async function getTrendingProperties(limit: number = 20): Promise<any[]> {
  try {
    const properties = await query(
      `SELECT * FROM properties
       WHERE status = $1
       ORDER BY views DESC, created_at DESC
       LIMIT $2`,
      ['active', limit]
    );

    return properties;
  } catch (error) {
    console.error('Error fetching trending properties:', error);
    throw new Error(`Failed to fetch trending properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get similar properties based on a property ID
 */
export async function getSimilarProperties(
  propertyId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Get the reference property
    const property = await queryOne(
      'SELECT * FROM properties WHERE id = $1',
      [propertyId]
    );

    if (!property) {
      throw new Error('Property not found');
    }

    // Find similar properties based on location, price range, and rooms
    const priceMin = property.price * 0.8;
    const priceMax = property.price * 1.2;

    const similarProps = await query(
      `SELECT * FROM properties
       WHERE status = $1
         AND id != $2
         AND location = $3
         AND price >= $4
         AND price <= $5
       LIMIT $6`,
      ['active', propertyId, property.location, priceMin, priceMax, limit]
    );

    return similarProps;
  } catch (error) {
    console.error('Error fetching similar properties:', error);
    // Don't throw, just return empty array
    return [];
  }
}
