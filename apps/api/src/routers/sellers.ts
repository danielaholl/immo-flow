/**
 * Sellers tRPC Router
 * Handles seller-specific features like portfolio statistics
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import { TRPCError } from '@trpc/server';

export const sellersRouter = router({
  /**
   * Get portfolio statistics for a seller
   * Shows overall performance metrics across all properties
   */
  getPortfolioStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get user_profile.id from users.id
    const userProfile = await queryOne<{ id: string }>(
      'SELECT id FROM user_profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (!userProfile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User profile not found',
      });
    }

    const userProfileId = userProfile.id;

    try {
      // Run all queries in parallel
      const [
        activePropertiesResult,
        totalContactsResult,
        totalMessagesResult,
        aiStatsResult,
        totalFavoritesResult,
      ] = await Promise.all([
        // Query 1: Active Properties Count
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM properties
           WHERE user_id = $1 AND status = 'active'`,
          [userId]
        ),

        // Query 2: Unique Contacts (distinct buyers who started conversations)
        queryOne<{ count: string }>(
          `SELECT COUNT(DISTINCT buyer_id) as count
           FROM conversations
           WHERE seller_id = $1`,
          [userProfileId]
        ),

        // Query 3: Total Messages Sent by Seller
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           WHERE c.seller_id = $1 AND m.sender_type = 'seller'`,
          [userProfileId]
        ),

        // Query 4: AI Answer Rate Stats
        queryOne<{ total_conversations: string; ai_handled_conversations: string }>(
          `SELECT
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT c.id) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.sender_type = 'ai'
                AND m2.is_ai_generated = true
              )
            ) as ai_handled_conversations
          FROM conversations c
          WHERE c.seller_id = $1`,
          [userProfileId]
        ),

        // Query 5: Total Favorites across all properties
        queryOne<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM favorites f
           JOIN properties p ON f.property_id = p.id
           WHERE p.user_id = $1`,
          [userId]
        ),
      ]);

      // Parse results
      const activeProperties = parseInt(activePropertiesResult?.count || '0');
      const totalContacts = parseInt(totalContactsResult?.count || '0');
      const totalMessages = parseInt(totalMessagesResult?.count || '0');
      const totalFavorites = parseInt(totalFavoritesResult?.count || '0');

      // Calculate AI answer rate
      const totalConversations = parseInt(aiStatsResult?.total_conversations || '0');
      const aiHandledConversations = parseInt(aiStatsResult?.ai_handled_conversations || '0');
      const aiAnswerRate = totalConversations > 0
        ? Math.round((aiHandledConversations / totalConversations) * 100)
        : 0;

      return {
        activeProperties,
        totalContacts,
        totalMessages,
        aiAnswerRate,
        aiHandledCount: aiHandledConversations,
        totalConversations,
        totalFavorites,
        totalViews: 0, // Views tracking not yet implemented
      };
    } catch (error) {
      console.error('Error fetching portfolio stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch portfolio statistics',
      });
    }
  }),
});
