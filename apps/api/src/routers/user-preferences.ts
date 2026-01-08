/**
 * User Preferences Router
 * tRPC endpoints for user preferences and recommendations
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const userPreferencesRouter = router({
  // Get user's preference profile
  get: protectedProcedure.query(async ({ ctx }) => {
    try {
      let data = await queryOne<any>(
        'SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1',
        [ctx.user.id]
      );

      // Check if we need to sync: no data OR data is empty
      const needsSync = !data ||
        (!data.min_price && !data.max_price &&
         (!data.preferred_locations ||
          (Array.isArray(data.preferred_locations) && data.preferred_locations.length === 0)));

      if (needsSync) {
        // Migrate favorites to property_interactions
        await query(
          `INSERT INTO property_interactions (user_id, property_id, interaction_type, created_at)
           SELECT f.user_id, f.property_id, 'favorite', f.created_at
           FROM favorites f
           WHERE f.user_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM property_interactions pi
             WHERE pi.user_id = f.user_id
             AND pi.property_id = f.property_id
             AND pi.interaction_type = 'favorite'
           )`,
          [ctx.user.id]
        );

        // Count interactions after insert
        const interactionsCount = await queryOne<{ count: string }>(
          'SELECT COUNT(*) as count FROM property_interactions WHERE user_id = $1',
          [ctx.user.id]
        );

        // Calculate preferences (skip if no interactions yet)
        if (interactionsCount && parseInt(interactionsCount.count, 10) > 0) {
          try {
            await query('SELECT calculate_user_preferences($1)', [ctx.user.id]);

            // Re-fetch
            data = await queryOne<any>(
              'SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1',
              [ctx.user.id]
            );
          } catch (calcError: any) {
            // Handle foreign key error gracefully
            if (calcError.code !== '23503') {
              throw calcError;
            }
          }
        }
      }

      if (!data) return null;

      // Parse JSON fields
      const rawLocations = Array.isArray(data.preferred_locations) ? data.preferred_locations : [];
      const rawRooms = Array.isArray(data.preferred_rooms) ? data.preferred_rooms : [];
      const rawFeatures = Array.isArray(data.preferred_features) ? data.preferred_features : [];

      // Transform to expected format with weights
      const totalLocations = rawLocations.length || 1;
      const totalRooms = rawRooms.length || 1;
      const totalFeatures = rawFeatures.length || 1;

      const preferred_locations = rawLocations.map((loc: any, idx: number) => ({
        location: typeof loc === 'string' ? loc : loc.location,
        weight: typeof loc === 'object' && loc.weight != null ? loc.weight : (totalLocations - idx) / totalLocations,
      }));

      const preferred_rooms = rawRooms.map((room: any, idx: number) => ({
        rooms: typeof room === 'number' ? room : room.rooms,
        weight: typeof room === 'object' && room.weight != null ? room.weight : (totalRooms - idx) / totalRooms,
      }));

      const preferred_features = rawFeatures.map((feature: any, idx: number) => ({
        feature: typeof feature === 'string' ? feature : feature.feature,
        weight: typeof feature === 'object' && feature.weight != null ? feature.weight : (totalFeatures - idx) / totalFeatures,
      }));

      return {
        id: data.id,
        user_id: data.user_id,
        preferred_locations,
        price_range: {
          min: data.min_price || null,
          max: data.max_price || null,
          avg: data.min_price && data.max_price ? (Number(data.min_price) + Number(data.max_price)) / 2 : null,
        },
        preferred_rooms,
        preferred_features,
        interaction_count: data.interaction_count || 0,
        last_updated: data.last_updated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw new Error(
        `Failed to fetch user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }),

  // Update user preferences based on their interactions
  update: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Call PostgreSQL function to calculate preferences
      await query('SELECT calculate_user_preferences($1)', [ctx.user.id]);

      return { success: true };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error(
        `Failed to update user preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }),

  // Track a property interaction
  trackInteraction: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        interactionType: z.enum(['view', 'favorite', 'unfavorite', 'search_click', 'share', 'booking']),
        dwellTimeSeconds: z.number().nonnegative().optional(),
        source: z.string().trim().max(100).optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await queryOne<any>(
          `INSERT INTO property_interactions
           (user_id, property_id, interaction_type, dwell_time_seconds, source, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            ctx.user.id,
            input.propertyId,
            input.interactionType,
            input.dwellTimeSeconds ?? 0,
            input.source || null,
            JSON.stringify(input.metadata ?? {})
          ]
        );

        return result;
      } catch (error) {
        console.error('Error tracking interaction:', error);
        throw new Error(
          `Failed to track interaction: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),
});
