/**
 * Recommendations Router
 * tRPC endpoints for personalized property recommendations
 */
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc.js';
import { getPersonalizedFeed, getTrendingProperties, invalidateUserFeed } from '../services/recommendation-engine.js';
import { query, queryOne } from '../db.js';

export const recommendationsRouter = router({
  /**
   * Get Personalized Feed (Authenticated)
   * Returns properties ranked by hybrid recommendation algorithm
   */
  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const result = await getPersonalizedFeed(ctx.user.id, input.page, input.limit);

        return {
          properties: result,
          page: input.page,
          limit: input.limit,
          total: result.length,
        };
      } catch (error) {
        console.error('[tRPC] getPersonalizedFeed error:', error);
        // Fallback to trending on error
        const trending = await getTrendingProperties(input.limit);
        return {
          properties: trending,
          page: input.page,
          limit: input.limit,
          total: trending.length,
        };
      }
    }),

  /**
   * Get Trending Feed (Public)
   * Returns trending properties for unauthenticated users or cold start
   */
  getTrendingFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().int().positive().max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await getTrendingProperties(input.limit);

        return {
          properties: result,
          total: result.length,
        };
      } catch (error) {
        console.error('[tRPC] getTrendingFeed error:', error);
        // Fallback to recent properties
        const recent = await query<any[]>(
          `SELECT * FROM properties
           WHERE status = 'active'
           ORDER BY created_at DESC
           LIMIT $1`,
          [input.limit]
        );

        return {
          properties: recent,
          total: recent.length,
        };
      }
    }),

  /**
   * Refresh User Preferences (Manual trigger)
   * Recalculates user preferences from interaction history
   */
  refreshPreferences: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await query('SELECT calculate_user_preferences($1)', [ctx.user.id]);

      // Invalidate feed cache after preferences update
      await invalidateUserFeed(ctx.user.id);

      return {
        success: true,
        message: 'Preferences refreshed successfully',
      };
    } catch (error) {
      console.error('[tRPC] refreshPreferences error:', error);
      throw new Error('Failed to refresh preferences');
    }
  }),

  /**
   * Get User Preferences (View current preferences)
   */
  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    try {
      const prefs = await queryOne<any>(
        `SELECT user_id, preferred_locations, min_price, max_price,
                preferred_rooms, preferred_features, interaction_count, last_updated
         FROM user_preferences
         WHERE user_id = $1
         LIMIT 1`,
        [ctx.user.id]
      );

      if (!prefs) {
        return null;
      }

      // Transform to snake_case for API compatibility
      return {
        user_id: prefs.user_id,
        preferred_locations: prefs.preferred_locations,
        min_price: prefs.min_price,
        max_price: prefs.max_price,
        preferred_rooms: prefs.preferred_rooms,
        preferred_features: prefs.preferred_features,
        interaction_count: prefs.interaction_count,
        last_updated: prefs.last_updated,
      };
    } catch (error) {
      console.error('[tRPC] getUserPreferences error:', error);
      return null;
    }
  }),

  /**
   * Record Property Interaction
   * Tracks user interactions for recommendation learning
   */
  recordInteraction: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        interactionType: z.enum(['view', 'favorite', 'unfavorite', 'search_click', 'share', 'booking']),
        dwellTimeSeconds: z.number().int().min(0).optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await query(
          `INSERT INTO property_interactions
           (user_id, property_id, interaction_type, dwell_time_seconds, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            ctx.user.id,
            input.propertyId,
            input.interactionType,
            input.dwellTimeSeconds || 0,
            JSON.stringify(input.metadata || {})
          ]
        );

        // For significant interactions, invalidate cache
        if (['favorite', 'share', 'booking'].includes(input.interactionType)) {
          await invalidateUserFeed(ctx.user.id);
        }

        return { success: true };
      } catch (error) {
        console.error('[tRPC] recordInteraction error:', error);
        // Don't throw - silently fail to not disrupt user experience
        return { success: false };
      }
    }),

  /**
   * Get Recommendation Stats (Admin/Debug)
   */
  getRecommendationStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const [cacheCount, interactionCount, trendingCount, similarityCount] = await Promise.all([
        queryOne<{ count: string }>('SELECT COUNT(*) as count FROM recommendations_cache WHERE user_id = $1', [ctx.user.id]),
        queryOne<{ count: string }>('SELECT COUNT(*) as count FROM property_interactions WHERE user_id = $1', [ctx.user.id]),
        queryOne<{ count: string }>('SELECT COUNT(*) as count FROM property_trending', []),
        queryOne<{ count: string }>('SELECT COUNT(*) as count FROM property_similarities', []),
      ]);

      return {
        cachedRecommendations: Number(cacheCount?.count || 0),
        totalInteractions: Number(interactionCount?.count || 0),
        trendingProperties: Number(trendingCount?.count || 0),
        propertySimilarities: Number(similarityCount?.count || 0),
      };
    } catch (error) {
      console.error('[tRPC] getRecommendationStats error:', error);
      return {
        cachedRecommendations: 0,
        totalInteractions: 0,
        trendingProperties: 0,
        propertySimilarities: 0,
      };
    }
  }),
});
