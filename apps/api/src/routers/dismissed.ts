/**
 * Dismissed Properties Router
 * Manage properties that users are not interested in
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const dismissedRouter = router({
  // Add property to dismissed list
  dismiss: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const dismissed = await queryOne<any>(
        `INSERT INTO user_dismissed_properties (user_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING
         RETURNING *`,
        [ctx.user.id, input.propertyId]
      );

      return dismissed || null;
    }),

  // Remove property from dismissed list (un-dismiss)
  undismiss: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await query(
        'DELETE FROM user_dismissed_properties WHERE user_id = $1 AND property_id = $2',
        [ctx.user.id, input.propertyId]
      );

      return { success: true };
    }),

  // Check if property is dismissed
  isDismissed: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const dismissed = await queryOne<{ id: string }>(
        `SELECT id FROM user_dismissed_properties
         WHERE user_id = $1 AND property_id = $2
         LIMIT 1`,
        [ctx.user.id, input.propertyId]
      );

      return { isDismissed: !!dismissed };
    }),

  // Get all dismissed properties for user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const dismissed = await query<any[]>(
      `SELECT
        d.*,
        json_build_object(
          'id', p.id,
          'title', p.title,
          'price', p.price,
          'location', p.location,
          'sqm', p.sqm,
          'rooms', p.rooms,
          'images', p.images,
          'status', p.status
        ) as property
       FROM user_dismissed_properties d
       JOIN properties p ON d.property_id = p.id
       WHERE d.user_id = $1
       ORDER BY d.dismissed_at DESC`,
      [ctx.user.id]
    );

    return dismissed;
  }),
});
