/**
 * Recommendation Engine Service
 * Hybrid algorithm: Content-Based (60%) + Collaborative Filtering (30%) + Popularity (10%)
 */
import { query } from '../db.js';
import { getCached, setCached } from '../cache/redis.js';
import { feedCache } from '../cache/memory.js';

export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  rooms: number;
  features: any;
  status: string;
  [key: string]: any;
}

interface UserPreferences {
  user_id: string;
  preferred_locations: string[];
  min_price?: number;
  max_price?: number;
  preferred_rooms: number[];
  preferred_features: string[];
}

/**
 * Main function: Get personalized feed for authenticated user
 */
export async function getPersonalizedFeed(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<Property[]> {
  const cacheKey = `feed:${userId}:page:${page}`;

  // L1 Cache Check (In-Memory)
  const l1 = feedCache.get<Property[]>(cacheKey);
  if (l1) {
    console.log(`[L1 Hit] Feed for user ${userId.substring(0, 8)}, page ${page}`);
    return l1;
  }

  // L2 Cache Check (Redis)
  const l2 = await getCached<Property[]>(cacheKey);
  if (l2) {
    console.log(`[L2 Hit] Feed for user ${userId.substring(0, 8)}, page ${page}`);
    feedCache.set(cacheKey, l2);
    return l2;
  }

  // Database Query from recommendations_cache table
  const offset = (page - 1) * limit;
  const results = await query<Property>(
    `SELECT p.*, rc.final_score,
            COALESCE(ps.favorites_count, 0) as favorites_count,
            COALESCE(ps.total_views, 0) as total_views,
            COALESCE(p.conversations_count, 0) as conversations_count,
            COALESCE(p.shares_count, 0) as shares_count,
            COALESCE(p.dismissed_count, 0) as dismissed_count
     FROM recommendations_cache rc
     JOIN properties p ON rc.property_id = p.id
     LEFT JOIN property_statistics ps ON p.id = ps.property_id
     WHERE rc.user_id = $1 AND p.status = 'active'
     ORDER BY rc.final_score DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  // If cache empty, calculate on-the-fly (fallback)
  if (results.length === 0) {
    console.log(`[Cache Miss] Calculating recommendations on-demand for user ${userId.substring(0, 8)}`);
    const properties = await calculateRecommendationsOnDemand(userId, limit);

    // Store in caches
    await setCached(cacheKey, properties, 300); // 5min TTL
    feedCache.set(cacheKey, properties);

    return properties;
  }

  // Store in caches
  await setCached(cacheKey, results, 300); // 5min TTL
  feedCache.set(cacheKey, results);

  return results;
}

/**
 * Get trending properties (for unauthenticated users or cold start)
 */
export async function getTrendingProperties(limit: number = 20): Promise<Property[]> {
  const cacheKey = 'trending';

  // Check Redis
  const cached = await getCached<Property[]>(cacheKey);
  if (cached) {
    console.log('[Cache Hit] Trending properties');
    return cached;
  }

  // Query trending from database
  const results = await query<Property>(
    `SELECT p.*,
            COALESCE(pt.trending_score, 0) as trending_score,
            COALESCE(ps.favorites_count, 0) as favorites_count,
            COALESCE(ps.total_views, 0) as total_views,
            COALESCE(p.conversations_count, 0) as conversations_count,
            COALESCE(p.shares_count, 0) as shares_count,
            COALESCE(p.dismissed_count, 0) as dismissed_count
     FROM properties p
     LEFT JOIN property_trending pt ON p.id = pt.property_id
     LEFT JOIN property_statistics ps ON p.id = ps.property_id
     WHERE p.status = 'active'
     ORDER BY COALESCE(pt.trending_score, 0) DESC, p.created_at DESC
     LIMIT $1`,
    [limit]
  );

  // Cache for 30 minutes
  await setCached(cacheKey, results, 1800);
  return results;
}

/**
 * Calculate recommendations on-demand (fallback when cache empty)
 */
async function calculateRecommendationsOnDemand(userId: string, limit: number): Promise<Property[]> {
  // Fetch user preferences
  const prefsResult = await query<UserPreferences>(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );

  if (!prefsResult || prefsResult.length === 0) {
    // No preferences → return trending
    console.log(`[Cold Start] User ${userId.substring(0, 8)} has no preferences, showing trending`);
    return await getTrendingProperties(limit);
  }

  const prefs = prefsResult[0];

  // Calculate scores in parallel
  const [contentScores, collabScores, popularityScores] = await Promise.all([
    calculateContentBasedScores(userId, prefs),
    calculateCollaborativeScores(userId),
    calculatePopularityScores(),
  ]);

  // Combine scores: 60% content + 30% collaborative + 10% popularity
  const finalScores = new Map<string, number>();

  contentScores.forEach((score, propId) => {
    finalScores.set(propId, (finalScores.get(propId) || 0) + score * 0.6);
  });

  collabScores.forEach((score, propId) => {
    finalScores.set(propId, (finalScores.get(propId) || 0) + score * 0.3);
  });

  popularityScores.forEach((score, propId) => {
    finalScores.set(propId, (finalScores.get(propId) || 0) + score * 0.1);
  });

  // Get top property IDs
  const topPropertyIds = Array.from(finalScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topPropertyIds.length === 0) {
    // Fallback to trending if no scores
    return await getTrendingProperties(limit);
  }

  // Fetch properties
  const properties = await query<Property>(
    `SELECT p.*,
            COALESCE(ps.favorites_count, 0) as favorites_count,
            COALESCE(ps.total_views, 0) as total_views
     FROM properties p
     LEFT JOIN property_statistics ps ON p.id = ps.property_id
     WHERE p.id = ANY($1) AND p.status = 'active'`,
    [topPropertyIds]
  );

  // Sort by score order
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  return topPropertyIds.map((id) => propertyMap.get(id)!).filter(Boolean);
}

/**
 * Calculate Content-Based Scores
 * Matching: Location (30%) + Price (25%) + Rooms (15%) + Features (20%) + Type (10%)
 */
async function calculateContentBasedScores(
  userId: string,
  prefs: UserPreferences
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // Get all active properties
  const properties = await query<Property>(
    `SELECT id, location, price, rooms, features, property_type FROM properties WHERE status = 'active'`
  );

  for (const prop of properties) {
    let score = 0;

    // Location Match (30%) - Jaccard similarity
    if (prefs.preferred_locations && prefs.preferred_locations.length > 0) {
      const prefLocs = prefs.preferred_locations.map((l) => String(l).toLowerCase());
      const propLoc = String(prop.location || '').toLowerCase();
      const matches = prefLocs.filter((loc) => propLoc.includes(loc) || loc.includes(propLoc));
      score += (matches.length / Math.max(prefLocs.length, 1)) * 30;
    }

    // Price Match (25%) - Range matching
    if (prefs.min_price !== null && prefs.max_price !== null) {
      const price = prop.price || 0;
      if (price >= (prefs.min_price || 0) && price <= (prefs.max_price || Infinity)) {
        score += 25;
      } else {
        // Partial score if within 20% of range
        const rangeDiff = Math.min(
          Math.abs(price - (prefs.min_price || 0)) / (prefs.min_price || 1),
          Math.abs(price - (prefs.max_price || Infinity)) / (prefs.max_price || 1)
        );
        score += Math.max(0, 25 * (1 - rangeDiff / 0.2));
      }
    }

    // Rooms Match (15%)
    if (prefs.preferred_rooms && prefs.preferred_rooms.length > 0) {
      const prefRooms = prefs.preferred_rooms.map((r) => Number(r));
      if (prefRooms.includes(prop.rooms)) {
        score += 15;
      }
    }

    // Features Match (20%) - Jaccard similarity
    if (prefs.preferred_features && prefs.preferred_features.length > 0 && prop.features) {
      const prefFeatures = prefs.preferred_features.map((f) => String(f));
      const propFeatures = Object.keys(prop.features).filter((key) => prop.features[key] === true);
      const intersection = prefFeatures.filter((f) => propFeatures.includes(f));
      const union = new Set([...prefFeatures, ...propFeatures]);
      if (union.size > 0) {
        score += (intersection.length / union.size) * 20;
      }
    }

    // Bonus: Property Type Match (10%)
    // Could add property_type matching if available in preferences

    scores.set(prop.id, Math.min(score, 100));
  }

  return scores;
}

/**
 * Calculate Collaborative Filtering Scores
 * Item-Item Similarity: "Users who liked A also liked B"
 */
async function calculateCollaborativeScores(userId: string): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // Get user's favorited properties
  const favorites = await query<{ property_id: string }>(
    `SELECT DISTINCT property_id
     FROM property_interactions
     WHERE user_id = $1 AND interaction_type IN ('favorite', 'share')
     LIMIT 50`,
    [userId]
  );

  if (favorites.length === 0) {
    return scores; // No collaborative data
  }

  const favPropertyIds = favorites.map((f) => f.property_id);

  // Find similar properties from property_similarities table
  const similarities = await query<{ property_b_id: string; similarity_score: number }>(
    `SELECT
       CASE
         WHEN property_a_id = ANY($1) THEN property_b_id
         ELSE property_a_id
       END as property_b_id,
       similarity_score
     FROM property_similarities
     WHERE (property_a_id = ANY($1) OR property_b_id = ANY($1))
     ORDER BY similarity_score DESC
     LIMIT 100`,
    [favPropertyIds]
  );

  // Aggregate scores (properties can appear multiple times if similar to multiple favorites)
  for (const sim of similarities) {
    // Skip if already favorited
    if (favPropertyIds.includes(sim.property_b_id)) continue;

    const currentScore = scores.get(sim.property_b_id) || 0;
    scores.set(sim.property_b_id, Math.min(currentScore + Number(sim.similarity_score) * 100, 100));
  }

  return scores;
}

/**
 * Calculate Popularity Scores
 * Trending formula: (views×1 + favorites×5 + contacts×10 + shares×3) / days_since_created
 */
async function calculatePopularityScores(): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  const trending = await query<{ property_id: string; trending_score: number }>(
    `SELECT property_id, trending_score
     FROM property_trending
     ORDER BY trending_score DESC
     LIMIT 100`
  );

  // Normalize trending scores to 0-100 scale
  const maxScore = trending.length > 0 ? Math.max(...trending.map((t) => Number(t.trending_score))) : 1;

  for (const item of trending) {
    const normalizedScore = (Number(item.trending_score) / maxScore) * 100;
    scores.set(item.property_id, normalizedScore);
  }

  return scores;
}

/**
 * Invalidate user feed cache (call after new interaction)
 */
export async function invalidateUserFeed(userId: string): Promise<void> {
  try {
    // Clear all pages for this user
    const { invalidatePattern } = await import('../cache/redis.js');
    await invalidatePattern(`feed:${userId}:*`);
    console.log(`[Cache Invalidated] Feed for user ${userId.substring(0, 8)}`);
  } catch (error) {
    console.warn('Failed to invalidate user feed:', error);
  }
}
