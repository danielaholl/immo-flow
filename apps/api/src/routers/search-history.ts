/**
 * Search History Router
 * tRPC endpoints for search history
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const searchHistoryRouter = router({
  // Get user's search history
  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().positive().int().max(100).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit || 10;

      try {
        const results = await query(
          `SELECT * FROM search_history
           WHERE user_id = $1
           ORDER BY last_searched_at DESC
           LIMIT $2`,
          [ctx.user.id, limit]
        );

        return results;
      } catch (error) {
        console.error('Error fetching search history:', error);
        throw new Error(
          `Failed to fetch search history: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // Save a search to history
  save: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(500),
        criteria: z.any().optional(),
        resultsCount: z.number().nonnegative().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if this exact query already exists for this user
        const existing = await queryOne(
          'SELECT * FROM search_history WHERE user_id = $1 AND query = $2',
          [ctx.user.id, input.query]
        );

        if (existing) {
          // Update existing search
          const updated = await queryOne(
            `UPDATE search_history
             SET last_searched_at = $1, results_count = $2, criteria = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [
              new Date().toISOString(),
              input.resultsCount ?? existing.results_count,
              JSON.stringify(input.criteria ?? existing.criteria),
              existing.id,
            ]
          );

          return updated;
        } else {
          // Create new search history entry
          const inserted = await queryOne(
            `INSERT INTO search_history (user_id, query, criteria, results_count, last_searched_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              ctx.user.id,
              input.query,
              JSON.stringify(input.criteria ?? {}),
              input.resultsCount ?? 0,
              new Date().toISOString(),
            ]
          );

          return inserted;
        }
      } catch (error) {
        console.error('Error saving search history:', error);
        throw new Error(
          `Failed to save search history: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // Delete a search from history
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await query('DELETE FROM search_history WHERE id = $1 AND user_id = $2', [
          input.id,
          ctx.user.id,
        ]);

        return { success: true };
      } catch (error) {
        console.error('Error deleting search history:', error);
        throw new Error(
          `Failed to delete search history: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }),

  // Clear all search history for current user
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await query('DELETE FROM search_history WHERE user_id = $1', [ctx.user.id]);

      return { success: true };
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw new Error(
        `Failed to clear search history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }),
});
