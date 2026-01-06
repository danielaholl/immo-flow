/**
 * Favorites Router
 * User favorites management
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, getUserPlan } from '../trpc.js';
import { query, queryOne } from '../db.js';
import { PROPERTY_JSON_FIELDS } from '../lib/propertyQueryBuilder.js';

// Maximum favorites for free users
const FREE_FAVORITES_LIMIT = 5;

export const favoritesRouter = router({
  // Get user favorites - includes full property data for detail view
  // Uses PROPERTY_JSON_FIELDS to include description, documents, etc.
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await query(
      `SELECT
        f.*,
        json_build_object(
          ${PROPERTY_JSON_FIELDS},
          'owner', json_build_object(
            'id', up.id,
            'user_id', up.user_id,
            'first_name', up.first_name,
            'last_name', up.last_name,
            'phone', up.phone,
            'company', up.company,
            'avatar_url', up.avatar_url,
            'bio', up.bio,
            'email', u.email
          )
        ) as property
       FROM favorites f
       JOIN properties p ON f.property_id = p.id
       LEFT JOIN property_statistics ps ON p.id = ps.property_id
       LEFT JOIN user_profiles up ON p.user_id = up.user_id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE f.user_id = $1 AND p.status = 'active'
       ORDER BY f.created_at DESC`,
      [ctx.user.id]
    );

    return favorites;
  }),

  // Add favorite (with limit for free users)
  add: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Check plan and enforce favorites limit for free users
      const plan = await getUserPlan(ctx.user.id);

      if (plan === 'free') {
        const countResult = await queryOne(
          'SELECT COUNT(*)::int as count FROM favorites WHERE user_id = $1',
          [ctx.user.id]
        );
        const currentCount = countResult?.count || 0;

        if (currentCount >= FREE_FAVORITES_LIMIT) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Du hast das Limit von ${FREE_FAVORITES_LIMIT} Favoriten erreicht. Upgrade auf Sucher oder Investor für unbegrenzte Favoriten.`,
          });
        }
      }

      const favorite = await queryOne(
        `INSERT INTO favorites (user_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING
         RETURNING *`,
        [ctx.user.id, input.propertyId]
      );

      // Track interaction for preference calculation (check if not exists)
      await query(
        `INSERT INTO property_interactions (user_id, property_id, interaction_type)
         SELECT $1, $2, 'favorite'
         WHERE NOT EXISTS (
           SELECT 1 FROM property_interactions
           WHERE user_id = $1 AND property_id = $2 AND interaction_type = 'favorite'
         )`,
        [ctx.user.id, input.propertyId]
      );

      // Recalculate user preferences
      await query('SELECT calculate_user_preferences($1)', [ctx.user.id]);

      return favorite;
    }),

  // Remove favorite
  remove: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await query(
        'DELETE FROM favorites WHERE user_id = $1 AND property_id = $2',
        [ctx.user.id, input.propertyId]
      );

      return { success: true };
    }),

  // Check if property is favorited
  isFavorite: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const favorite = await queryOne(
        'SELECT id FROM favorites WHERE user_id = $1 AND property_id = $2',
        [ctx.user.id, input.propertyId]
      );

      return { isFavorite: !!favorite };
    }),

  // Sync favorites to property_interactions and recalculate preferences
  syncPreferences: protectedProcedure.mutation(async ({ ctx }) => {
    // Migrate favorites to property_interactions (using WHERE NOT EXISTS)
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

    // Recalculate preferences
    await query('SELECT calculate_user_preferences($1)', [ctx.user.id]);

    return { success: true };
  }),

  // Get favorites count and limit info (for UI display)
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const plan = await getUserPlan(ctx.user.id);
    const countResult = await queryOne(
      'SELECT COUNT(*)::int as count FROM favorites WHERE user_id = $1',
      [ctx.user.id]
    );
    const count = countResult?.count || 0;
    const limit = plan === 'free' ? FREE_FAVORITES_LIMIT : null;
    const hasUnlimited = plan !== 'free';

    return {
      count,
      limit,
      hasUnlimited,
      remaining: limit ? Math.max(0, limit - count) : null,
      isAtLimit: limit ? count >= limit : false,
    };
  }),
});
