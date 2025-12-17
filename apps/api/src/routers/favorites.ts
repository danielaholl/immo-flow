/**
 * Favorites Router
 * User favorites management
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const favoritesRouter = router({
  // Get user favorites
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await query(
      `SELECT
        f.*,
        json_build_object(
          'id', p.id,
          'title', p.title,
          'price', p.price,
          'location', p.location,
          'full_address', NULLIF(CONCAT_WS(', ', p.street_address, CONCAT_WS(' ', p.postal_code, p.location)), ''),
          'sqm', p.sqm,
          'rooms', p.rooms,
          'images', p.images,
          'video_url', p.video_url,
          'features', p.features,
          'ai_score', COALESCE(p.ai_investment_score, p.ai_score),
          'commission_rate', p.commission_rate,
          'require_address_consent', p.require_address_consent,
          'description', p.description,
          'yield', p.yield,
          'highlights', p.highlights,
          'red_flags', p.red_flags,
          'status', p.status,
          'created_at', p.created_at,
          'property_type', p.property_type,
          'ai_detailed_evaluation', p.ai_detailed_evaluation,
          'buyer_evaluation', p.buyer_evaluation,
          'monthly_fee', p.monthly_fee,
          'usable_area', p.usable_area,
          'usable_area_ratio', p.usable_area_ratio,
          'bathrooms', p.bathrooms,
          'total_floors', p.total_floors,
          'floor_level', p.floor_level,
          'available_from', p.available_from,
          'year_built', p.year_built,
          'heating_type', p.heating_type,
          'energy_source', p.energy_source,
          'energy_certificate', p.energy_certificate,
          'energy_efficiency_class', p.energy_efficiency_class,
          'condition', p.condition,
          'important_notes', p.important_notes,
          'actual_monthly_rent', p.actual_monthly_rent,
          'is_external', p.is_external,
          'user_id', p.user_id,
          'owner', (
            SELECT json_build_object(
              'first_name', up.first_name,
              'last_name', up.last_name,
              'company', up.company,
              'avatar_url', up.avatar_url
            )
            FROM user_profiles up
            WHERE up.user_id = p.user_id
          )
        ) as property
       FROM favorites f
       JOIN properties p ON f.property_id = p.id
       WHERE f.user_id = $1 AND p.status = 'active'
       ORDER BY f.created_at DESC`,
      [ctx.user.id]
    );

    return favorites;
  }),

  // Add favorite
  add: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
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
});
