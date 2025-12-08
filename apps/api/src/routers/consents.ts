/**
 * Consents Router
 * Property consent and global address consent management
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const consentsRouter = router({
  // Grant property-specific consent
  grantPropertyConsent: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const consent = await queryOne(
        `INSERT INTO property_consents (user_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING
         RETURNING *`,
        [ctx.user.id, input.propertyId]
      );

      return consent;
    }),

  // Check if user has property consent
  hasPropertyConsent: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const consent = await queryOne(
        'SELECT id FROM property_consents WHERE user_id = $1 AND property_id = $2',
        [ctx.user.id, input.propertyId]
      );

      return { hasConsent: !!consent };
    }),

  // Get all property consents for user
  getUserPropertyConsents: protectedProcedure.query(async ({ ctx }) => {
    const consents = await query(
      'SELECT * FROM property_consents WHERE user_id = $1',
      [ctx.user.id]
    );

    return consents;
  }),

  // Set global address consent
  setGlobalAddressConsent: protectedProcedure
    .input(z.object({ consent: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const profile = await queryOne(
        `UPDATE user_profiles
         SET global_address_consent = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [input.consent, ctx.user.id]
      );

      return profile;
    }),

  // Get global address consent status
  getGlobalAddressConsent: protectedProcedure.query(async ({ ctx }) => {
    const profile = await queryOne(
      'SELECT global_address_consent FROM user_profiles WHERE user_id = $1',
      [ctx.user.id]
    );

    return {
      hasGlobalConsent: profile?.global_address_consent ?? false
    };
  }),
});
