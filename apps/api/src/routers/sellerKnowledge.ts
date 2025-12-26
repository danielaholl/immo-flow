/**
 * Seller Knowledge tRPC Router (vereinfacht)
 * Verwaltet Verkäufer-Notizen als einfaches Textfeld pro Immobilie
 * Wird als Kontext für AI-Chat-Antworten verwendet
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db.js';
import { TRPCError } from '@trpc/server';
import { createLogger } from '../utils/logger.js';

const log = createLogger('seller-knowledge');

export const sellerKnowledgeRouter = router({
  /**
   * Verkäufer-Notizen für eine Immobilie abrufen
   * Nur der Eigentümer kann zugreifen
   */
  get: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Property-Ownership prüfen und Notizen laden
      const result = await db.query(
        'SELECT user_id, seller_notes FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Immobilie nicht gefunden',
        });
      }

      if (result.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sie sind nicht der Eigentümer dieser Immobilie',
        });
      }

      return { notes: result.rows[0].seller_notes || '' };
    }),

  /**
   * Verkäufer-Notizen aktualisieren
   */
  update: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        notes: z.string().max(50000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Property-Ownership prüfen
      const propertyResult = await db.query(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (propertyResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Immobilie nicht gefunden',
        });
      }

      if (propertyResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sie sind nicht der Eigentümer dieser Immobilie',
        });
      }

      // Notizen aktualisieren
      await db.query(
        'UPDATE properties SET seller_notes = $1 WHERE id = $2',
        [input.notes, input.propertyId]
      );

      log.info('Seller notes updated', { propertyId: input.propertyId });

      return { success: true };
    }),
});
