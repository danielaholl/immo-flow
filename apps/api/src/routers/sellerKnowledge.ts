/**
 * Seller Knowledge tRPC Router
 * Manages private knowledge entries for property sellers
 * Used as context for AI chat responses
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db.js';
import { TRPCError } from '@trpc/server';
import { createLogger } from '../utils/logger.js';

const log = createLogger('seller-knowledge');

// Valid categories for knowledge entries
const KNOWLEDGE_CATEGORIES = [
  'costs',
  'renovation',
  'legal',
  'technical',
  'neighborhood',
  'amenities',
  'other',
] as const;

// Schema for knowledge entry
const KnowledgeEntrySchema = z.object({
  topic: z.string().min(1).max(255),
  content: z.string().min(1).max(10000),
  category: z.enum(KNOWLEDGE_CATEGORIES).optional(),
});

export const sellerKnowledgeRouter = router({
  /**
   * Get all knowledge entries for a property
   * Only the property owner can access this
   */
  getByProperty: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user owns the property
      const propertyResult = await db.query(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (propertyResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      if (propertyResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this property',
        });
      }

      // Fetch knowledge entries
      const activeFilter = input.includeInactive ? '' : 'AND is_active = true';
      const result = await db.query(
        `SELECT
          id,
          topic,
          content,
          source_type,
          source_message_id,
          category,
          is_active,
          confidence_score,
          created_at,
          updated_at
        FROM seller_knowledge_base
        WHERE property_id = $1 ${activeFilter}
        ORDER BY created_at DESC`,
        [input.propertyId]
      );

      return result.rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        content: row.content,
        sourceType: row.source_type,
        sourceMessageId: row.source_message_id,
        category: row.category,
        isActive: row.is_active,
        confidenceScore: row.confidence_score
          ? parseFloat(row.confidence_score)
          : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }),

  /**
   * Create a new knowledge entry (manual)
   */
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        ...KnowledgeEntrySchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user owns the property
      const propertyResult = await db.query(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (propertyResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      if (propertyResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this property',
        });
      }

      // Insert knowledge entry
      try {
        const result = await db.query(
          `INSERT INTO seller_knowledge_base
            (property_id, user_id, topic, content, category, source_type)
          VALUES ($1, $2, $3, $4, $5, 'manual')
          RETURNING id, created_at`,
          [input.propertyId, userId, input.topic, input.content, input.category]
        );

        log.info('Knowledge entry created', {
          propertyId: input.propertyId,
          topic: input.topic,
        });

        return {
          id: result.rows[0].id,
          createdAt: result.rows[0].created_at,
        };
      } catch (error: any) {
        // Handle unique constraint violation (duplicate topic)
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ein Eintrag mit diesem Thema existiert bereits',
          });
        }
        throw error;
      }
    }),

  /**
   * Update an existing knowledge entry
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        ...KnowledgeEntrySchema.partial().shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user owns the entry
      const entryResult = await db.query(
        'SELECT user_id, property_id FROM seller_knowledge_base WHERE id = $1',
        [input.id]
      );

      if (entryResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge entry not found',
        });
      }

      if (entryResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this entry',
        });
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.topic !== undefined) {
        updates.push(`topic = $${paramIndex++}`);
        values.push(input.topic);
      }
      if (input.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(input.content);
      }
      if (input.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(input.category);
      }

      if (updates.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update',
        });
      }

      values.push(input.id);

      try {
        await db.query(
          `UPDATE seller_knowledge_base
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}`,
          values
        );

        log.info('Knowledge entry updated', { id: input.id });

        return { success: true };
      } catch (error: any) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ein Eintrag mit diesem Thema existiert bereits',
          });
        }
        throw error;
      }
    }),

  /**
   * Delete a knowledge entry
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user owns the entry
      const entryResult = await db.query(
        'SELECT user_id FROM seller_knowledge_base WHERE id = $1',
        [input.id]
      );

      if (entryResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge entry not found',
        });
      }

      if (entryResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this entry',
        });
      }

      await db.query('DELETE FROM seller_knowledge_base WHERE id = $1', [
        input.id,
      ]);

      log.info('Knowledge entry deleted', { id: input.id });

      return { success: true };
    }),

  /**
   * Toggle active status of a knowledge entry
   */
  toggleActive: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user owns the entry
      const entryResult = await db.query(
        'SELECT user_id FROM seller_knowledge_base WHERE id = $1',
        [input.id]
      );

      if (entryResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge entry not found',
        });
      }

      if (entryResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this entry',
        });
      }

      await db.query(
        'UPDATE seller_knowledge_base SET is_active = $1 WHERE id = $2',
        [input.isActive, input.id]
      );

      log.info('Knowledge entry toggled', {
        id: input.id,
        isActive: input.isActive,
      });

      return { success: true };
    }),

  /**
   * Get knowledge entries for AI context (internal use)
   * Returns only active entries for a property
   */
  getForAIContext: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await db.query(
        `SELECT topic, content, category
        FROM seller_knowledge_base
        WHERE property_id = $1 AND is_active = true
        ORDER BY category, created_at DESC`,
        [input.propertyId]
      );

      return result.rows.map((row) => ({
        topic: row.topic,
        content: row.content,
        category: row.category,
      }));
    }),

  /**
   * Search knowledge entries using full-text search
   */
  search: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        query: z.string().min(1).max(500),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user owns the property
      const propertyResult = await db.query(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (propertyResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      if (propertyResult.rows[0].user_id !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own this property',
        });
      }

      // Full-text search
      const result = await db.query(
        `SELECT
          id,
          topic,
          content,
          category,
          ts_rank(to_tsvector('german', topic || ' ' || content), plainto_tsquery('german', $2)) as rank
        FROM seller_knowledge_base
        WHERE property_id = $1
          AND is_active = true
          AND to_tsvector('german', topic || ' ' || content) @@ plainto_tsquery('german', $2)
        ORDER BY rank DESC
        LIMIT $3`,
        [input.propertyId, input.query, input.limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        content: row.content,
        category: row.category,
        relevance: parseFloat(row.rank),
      }));
    }),
});
