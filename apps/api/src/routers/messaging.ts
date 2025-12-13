/**
 * Messaging tRPC Router
 * Handles conversations and messages between buyers and sellers
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { db } from '../db.js';
import { TRPCError } from '@trpc/server';
import {
  answerPropertyQuestion,
  generateGreetingMessage,
} from '../services/property-qa-service.js';
import {
  emitNewMessage,
  emitUnreadCountUpdate,
  emitConversationUpdate,
} from '../socket.js';

export const messagingRouter = router({
  /**
   * Get or create a conversation for a property
   */
  getOrCreateConversation: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get user_profile.id from users.id
      const userProfileResult = await db.query(
        'SELECT id FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (userProfileResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const buyerProfileId = userProfileResult.rows[0].id;

      // Check if property exists and get seller info
      const propertyResult = await db.query(
        'SELECT p.id, p.user_id, p.title, up.id as seller_profile_id FROM properties p INNER JOIN user_profiles up ON p.user_id = up.user_id WHERE p.id = $1',
        [input.propertyId]
      );

      if (propertyResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      const property = propertyResult.rows[0];
      const sellerProfileId = property.seller_profile_id;

      // Can't create conversation with yourself
      if (buyerProfileId === sellerProfileId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create conversation with yourself',
        });
      }

      // Check if conversation already exists
      const existingConversation = await db.query(
        `SELECT id FROM conversations
         WHERE property_id = $1 AND buyer_id = $2`,
        [input.propertyId, buyerProfileId]
      );

      if (existingConversation.rows.length > 0) {
        return {
          conversationId: existingConversation.rows[0].id,
          isNew: false,
        };
      }

      // Create new conversation
      const newConversation = await db.query(
        `INSERT INTO conversations (property_id, buyer_id, seller_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.propertyId, buyerProfileId, sellerProfileId]
      );

      const conversationId = newConversation.rows[0].id;

      // Send AI greeting message
      const greetingMessage = await generateGreetingMessage(property.title);

      await db.query(
        `INSERT INTO messages (conversation_id, sender_type, content, is_ai_generated)
         VALUES ($1, 'ai', $2, true)`,
        [conversationId, greetingMessage]
      );

      console.log(`[Messaging] Created new conversation: ${conversationId}`);

      return {
        conversationId,
        isNew: true,
      };
    }),

  /**
   * Get all conversations for the current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get user_profile.id
    const userProfileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (userProfileResult.rows.length === 0) {
      return [];
    }

    const userProfileId = userProfileResult.rows[0].id;

    const result = await db.query(
      `SELECT
        c.id,
        c.property_id,
        c.buyer_id,
        c.seller_id,
        c.buyer_unread_count,
        c.seller_unread_count,
        c.last_message_at,
        c.created_at,
        p.title as property_title,
        p.price as property_price,
        p.images as property_images,
        p.location as property_city,
        buyer_profile.first_name as buyer_first_name,
        buyer_profile.last_name as buyer_last_name,
        buyer_profile.avatar_url as buyer_avatar,
        seller_profile.first_name as seller_first_name,
        seller_profile.last_name as seller_last_name,
        seller_profile.company as seller_company,
        seller_profile.avatar_url as seller_avatar,
        (SELECT content FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT sender_type FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC LIMIT 1) as last_message_sender_type
      FROM conversations c
      INNER JOIN properties p ON c.property_id = p.id
      LEFT JOIN user_profiles buyer_profile ON c.buyer_id = buyer_profile.id
      LEFT JOIN user_profiles seller_profile ON c.seller_id = seller_profile.id
      WHERE c.buyer_id = $1 OR c.seller_id = $1
      ORDER BY c.last_message_at DESC`,
      [userProfileId]
    );

    const conversations = result.rows.map((row) => {
      const isBuyer = row.buyer_id === userProfileId;
      const unreadCount = isBuyer ? row.buyer_unread_count : row.seller_unread_count;

      // Get other participant info
      const otherParticipant = isBuyer
        ? {
            firstName: row.seller_first_name,
            lastName: row.seller_last_name,
            company: row.seller_company,
            avatar: row.seller_avatar,
          }
        : {
            firstName: row.buyer_first_name,
            lastName: row.buyer_last_name,
            company: null,
            avatar: row.buyer_avatar,
          };

      return {
        id: row.id,
        propertyId: row.property_id,
        propertyTitle: row.property_title,
        propertyPrice: row.property_price,
        propertyImages: row.property_images,
        propertyCity: row.property_city,
        role: isBuyer ? 'buyer' : 'seller',
        unreadCount,
        lastMessage: row.last_message,
        lastMessageSenderType: row.last_message_sender_type,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        otherParticipant,
      };
    });

    return conversations;
  }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get user_profile.id from users.id
      const userProfileResult = await db.query(
        'SELECT id FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (userProfileResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const userProfileId = userProfileResult.rows[0].id;

      // Verify user has access to this conversation
      const conversationResult = await db.query(
        `SELECT buyer_id, seller_id FROM conversations WHERE id = $1`,
        [input.conversationId]
      );

      if (conversationResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResult.rows[0];
      const isBuyer = conversation.buyer_id === userProfileId;
      const isSeller = conversation.seller_id === userProfileId;

      if (!isBuyer && !isSeller) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        });
      }

      // Mark messages as read
      const userRole = isBuyer ? 'buyer' : 'seller';
      await db.query('SELECT reset_unread_count($1, $2, $3)', [
        input.conversationId,
        userProfileId,
        userRole,
      ]);

      // Emit unread count update
      const unreadResult = await db.query('SELECT get_user_unread_count($1) as count', [
        userProfileId,
      ]);
      const unreadCount = unreadResult.rows[0]?.count || 0;
      emitUnreadCountUpdate(userId, unreadCount);

      // Fetch messages
      const messagesResult = await db.query(
        `SELECT
          m.id,
          m.sender_id,
          m.sender_type,
          m.content,
          m.is_ai_generated,
          m.ai_confidence,
          m.forwarded_to_seller,
          m.created_at,
          up.first_name,
          up.last_name,
          up.avatar_url
        FROM messages m
        LEFT JOIN user_profiles up ON m.sender_id = up.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        LIMIT $2 OFFSET $3`,
        [input.conversationId, input.limit, input.offset]
      );

      const messages = messagesResult.rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        senderType: row.sender_type,
        content: row.content,
        isAiGenerated: row.is_ai_generated,
        aiConfidence: row.ai_confidence ? parseFloat(row.ai_confidence) : null,
        forwardedToSeller: row.forwarded_to_seller,
        createdAt: row.created_at,
        sender: row.sender_id
          ? {
              firstName: row.first_name,
              lastName: row.last_name,
              avatar: row.avatar_url,
            }
          : null,
      }));

      return messages;
    }),

  /**
   * Send a message
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get user_profile.id
      const userProfileResult = await db.query(
        'SELECT id FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (userProfileResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const userProfileId = userProfileResult.rows[0].id;

      // Verify access and get conversation details
      const conversationResult = await db.query(
        `SELECT c.buyer_id, c.seller_id, c.property_id, p.title as property_title
         FROM conversations c
         INNER JOIN properties p ON c.property_id = p.id
         WHERE c.id = $1`,
        [input.conversationId]
      );

      if (conversationResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResult.rows[0];
      const isBuyer = conversation.buyer_id === userProfileId;
      const isSeller = conversation.seller_id === userProfileId;

      if (!isBuyer && !isSeller) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        });
      }

      const senderType = isBuyer ? 'buyer' : 'seller';
      const recipientProfileId = isBuyer ? conversation.seller_id : conversation.buyer_id;

      // Get recipient's user_id for Socket.io (rooms use users.id, not user_profiles.id)
      const recipientUserResult = await db.query(
        'SELECT user_id FROM user_profiles WHERE id = $1',
        [recipientProfileId]
      );

      const recipientUserId = recipientUserResult.rows[0]?.user_id;

      // Insert user message
      const userMessageResult = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, sender_type, content)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [input.conversationId, userProfileId, senderType, input.content]
      );

      const userMessage = {
        id: userMessageResult.rows[0].id,
        senderId: userProfileId,
        senderType,
        content: input.content,
        createdAt: userMessageResult.rows[0].created_at,
      };

      // Emit new message via Socket.io
      emitNewMessage(input.conversationId, userMessage);

      // If buyer sends message, trigger AI response
      if (isBuyer) {
        try {
          const qaResponse = await answerPropertyQuestion(
            conversation.property_id,
            input.content
          );

          // AI responds ALWAYS - either with answer or with forwarding message
          const aiResponseContent = qaResponse.shouldForwardToSeller
            ? 'Diese Information liegt mir leider nicht vor, aber ich werde Ihre Frage an den Verkäufer weiterleiten.'
            : qaResponse.answer;
          const forwardedToSeller = qaResponse.shouldForwardToSeller;

          if (forwardedToSeller) {
            console.log(`[Messaging] Question forwarded to seller (low AI confidence): ${recipientProfileId}`);
          }

          // Insert AI response
          const aiMessageResult = await db.query(
            `INSERT INTO messages (
              conversation_id,
              sender_type,
              content,
              is_ai_generated,
              ai_confidence,
              forwarded_to_seller
            ) VALUES ($1, 'ai', $2, true, $3, $4)
            RETURNING id, created_at`,
            [
              input.conversationId,
              aiResponseContent,
              qaResponse.confidence,
              forwardedToSeller,
            ]
          );

          const aiMessage = {
            id: aiMessageResult.rows[0].id,
            senderType: 'ai',
            content: aiResponseContent,
            isAiGenerated: true,
            aiConfidence: qaResponse.confidence,
            forwardedToSeller,
            createdAt: aiMessageResult.rows[0].created_at,
          };

          // Emit AI message
          emitNewMessage(input.conversationId, aiMessage);
        } catch (error) {
          console.error('[Messaging] AI Q&A failed:', error);
          // On error, forward to seller without AI response or notification
          console.log(`[Messaging] Question forwarded to seller (AI error): ${recipientProfileId}`);
        }
      } else {
        // Seller message - just notify buyer
        // TODO: Send email notification to buyer
        console.log(`[Messaging] Seller replied to buyer: ${recipientProfileId}`);
      }

      // Update unread count for recipient
      const recipientUnreadResult = await db.query(
        'SELECT get_user_unread_count($1) as count',
        [recipientProfileId]
      );
      const recipientUnreadCount = recipientUnreadResult.rows[0]?.count || 0;
      emitUnreadCountUpdate(recipientUserId, recipientUnreadCount);

      return {
        success: true,
        messageId: userMessage.id,
      };
    }),

  /**
   * Get unread message count for current user
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get user_profile.id
    const userProfileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (userProfileResult.rows.length === 0) {
      return { unreadCount: 0 };
    }

    const userProfileId = userProfileResult.rows[0].id;

    const result = await db.query('SELECT get_user_unread_count($1) as count', [userProfileId]);

    return {
      unreadCount: result.rows[0]?.count || 0,
    };
  }),

  /**
   * Delete a conversation permanently
   */
  deleteConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get user_profile.id
      const userProfileResult = await db.query(
        'SELECT id FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (userProfileResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const userProfileId = userProfileResult.rows[0].id;

      // Verify user has access to this conversation
      const conversationResult = await db.query(
        `SELECT buyer_id, seller_id FROM conversations WHERE id = $1`,
        [input.conversationId]
      );

      if (conversationResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResult.rows[0];
      const isBuyer = conversation.buyer_id === userProfileId;
      const isSeller = conversation.seller_id === userProfileId;

      if (!isBuyer && !isSeller) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        });
      }

      // Delete all messages first (if not using CASCADE)
      await db.query('DELETE FROM messages WHERE conversation_id = $1', [
        input.conversationId,
      ]);

      // Delete the conversation
      await db.query('DELETE FROM conversations WHERE id = $1', [
        input.conversationId,
      ]);

      console.log(`[Messaging] Deleted conversation: ${input.conversationId}`);

      return {
        success: true,
      };
    }),

  /**
   * Get AI response statistics for seller
   */
  getAIResponseStats: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get user_profile.id
      const userProfileResult = await db.query(
        'SELECT id FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (userProfileResult.rows.length === 0) {
        return {
          totalQuestions: 0,
          aiAnswered: 0,
          aiAnswerRate: 0,
          forwardedToSeller: 0,
        };
      }

      const userProfileId = userProfileResult.rows[0].id;

      // Build query based on whether propertyId is provided
      let query: string;
      let params: any[];

      if (input.propertyId) {
        // Stats for specific property - conversation-based metrics
        query = `
          SELECT
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT c.id) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.sender_type = 'ai'
                AND m2.is_ai_generated = true
              )
            ) as ai_handled_conversations,
            COUNT(DISTINCT c.id) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.forwarded_to_seller = true
              )
            ) as forwarded_conversations
          FROM conversations c
          WHERE c.seller_id = $1 AND c.property_id = $2
        `;
        params = [userProfileId, input.propertyId];
      } else {
        // Stats for all seller's properties - conversation-based metrics
        query = `
          SELECT
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT c.id) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.sender_type = 'ai'
                AND m2.is_ai_generated = true
              )
            ) as ai_handled_conversations,
            COUNT(DISTINCT c.id) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM messages m2
                WHERE m2.conversation_id = c.id
                AND m2.forwarded_to_seller = true
              )
            ) as forwarded_conversations
          FROM conversations c
          WHERE c.seller_id = $1
        `;
        params = [userProfileId];
      }

      const result = await db.query(query, params);

      const row = result.rows[0];
      const totalConversations = parseInt(row.total_conversations) || 0;
      const aiHandledConversations = parseInt(row.ai_handled_conversations) || 0;
      const forwardedConversations = parseInt(row.forwarded_conversations) || 0;

      const aiAnswerRate = totalConversations > 0 ? (aiHandledConversations / totalConversations) * 100 : 0;

      return {
        totalQuestions: totalConversations,
        aiAnswered: aiHandledConversations,
        aiAnswerRate: Math.round(aiAnswerRate),
        forwardedToSeller: forwardedConversations,
      };
    }),
});
