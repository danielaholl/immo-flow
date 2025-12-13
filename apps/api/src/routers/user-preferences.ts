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
      const data = await queryOne(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [ctx.user.id]
      );

      if (!data) return null;

      // Parse JSON fields
      return {
        id: data.id,
        user_id: data.user_id,
        preferred_locations:
          typeof data.preferred_locations === 'string'
            ? JSON.parse(data.preferred_locations)
            : data.preferred_locations || [],
        price_range:
          typeof data.price_range === 'string'
            ? JSON.parse(data.price_range)
            : data.price_range || {},
        preferred_rooms:
          typeof data.preferred_rooms === 'string'
            ? JSON.parse(data.preferred_rooms)
            : data.preferred_rooms || [],
        preferred_features:
          typeof data.preferred_features === 'string'
            ? JSON.parse(data.preferred_features)
            : data.preferred_features || [],
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
        const result = await queryOne(
          `INSERT INTO property_interactions (user_id, property_id, interaction_type, dwell_time_seconds, source, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            ctx.user.id,
            input.propertyId,
            input.interactionType,
            input.dwellTimeSeconds || 0,
            input.source || null,
            JSON.stringify(input.metadata || {}),
          ]
        );

        if (!result) {
          throw new Error('Failed to insert interaction');
        }

        return result;
      } catch (error) {
        console.error('Error tracking interaction:', error);
        throw new Error(
          `Failed to track interaction: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // Get user's interaction history
  getInteractions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().positive().int().max(200).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 50;

      try {
        const results = await query(
          `SELECT * FROM property_interactions
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [ctx.user.id, limit]
        );

        return results;
      } catch (error) {
        console.error('Error fetching interactions:', error);
        throw new Error(
          `Failed to fetch interactions: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),
});
