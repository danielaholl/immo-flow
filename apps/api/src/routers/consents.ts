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
      // Insert consent with ON CONFLICT DO NOTHING
      const consent = await queryOne<any>(
        `INSERT INTO property_consents (user_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING
         RETURNING *`,
        [ctx.user.id, input.propertyId]
      );

      // Get user profile for data snapshot
      const profile = await queryOne<{
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
      }>(
        'SELECT first_name, last_name, phone FROM user_profiles WHERE user_id = $1 LIMIT 1',
        [ctx.user.id]
      );

      // Get property to check release mode
      const property = await queryOne<{
        document_release_mode: string | null;
        user_id: string;
      }>(
        'SELECT document_release_mode, user_id FROM properties WHERE id = $1 LIMIT 1',
        [input.propertyId]
      );

      // Only create document access if user is not the owner
      if (property && property.user_id !== ctx.user.id) {
        const initialStatus = property.document_release_mode === 'automatic' ? 'approved' : 'pending';

        await query(
          `INSERT INTO document_access_requests
           (property_id, user_id, status, user_first_name, user_last_name, user_email, user_phone, responded_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (property_id, user_id)
           DO UPDATE SET
             status = CASE
               WHEN document_access_requests.status = 'denied' THEN $3
               ELSE document_access_requests.status
             END,
             user_first_name = EXCLUDED.user_first_name,
             user_last_name = EXCLUDED.user_last_name,
             user_email = EXCLUDED.user_email,
             user_phone = EXCLUDED.user_phone`,
          [
            input.propertyId,
            ctx.user.id,
            initialStatus,
            profile?.first_name || null,
            profile?.last_name || null,
            ctx.user.email,
            profile?.phone || null,
            initialStatus === 'approved' ? new Date() : null
          ]
        );
      }

      return consent || null;
    }),

  // Check if user has property consent
  hasPropertyConsent: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const consent = await queryOne<{ id: string }>(
        `SELECT id FROM property_consents
         WHERE user_id = $1 AND property_id = $2
         LIMIT 1`,
        [ctx.user.id, input.propertyId]
      );

      return { hasConsent: !!consent };
    }),

  // Get all property consents for user
  getUserPropertyConsents: protectedProcedure.query(async ({ ctx }) => {
    const consents = await query<any[]>(
      'SELECT * FROM property_consents WHERE user_id = $1',
      [ctx.user.id]
    );

    return consents;
  }),

  // Set global address consent
  setGlobalAddressConsent: protectedProcedure
    .input(z.object({ consent: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const profile = await queryOne<any>(
        `UPDATE user_profiles
         SET global_address_consent = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [input.consent, ctx.user.id]
      );

      return profile || null;
    }),

  // Get global address consent status
  getGlobalAddressConsent: protectedProcedure.query(async ({ ctx }) => {
    const profile = await queryOne<{ global_address_consent: boolean }>(
      'SELECT global_address_consent FROM user_profiles WHERE user_id = $1 LIMIT 1',
      [ctx.user.id]
    );

    return {
      hasGlobalConsent: profile?.global_address_consent ?? false
    };
  }),
});
