/**
 * Messaging tRPC Router (Drizzle ORM)
 * Handles conversations and messages between buyers and sellers
 */
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { router, protectedProcedure } from '../trpc.js';
import { db, eq, and, desc, sql as rawSql } from '@rendito/database/drizzle-client';
import { userProfiles, properties, propertyProviderContacts, conversations, messages } from '@rendito/database/schema';
import { TRPCError } from '@trpc/server';
import {
  answerPropertyQuestion,
  generateGreetingMessage,
} from '../services/property-qa-service.js';
import {
  emitNewMessage,
  emitUnreadCountUpdate,
  emitConversationUpdate,
  emitKnowledgeLearned,
} from '../socket.js';
import { extractKnowledgeFromChat } from '../services/knowledge-learner-service.js';
import { sendProviderInvitation } from '../services/email-service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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
      const userProfileResults = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfileResults.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const buyerProfileId = userProfileResults[0].id;

      // Check if property exists and get seller info - complex JOIN, use raw SQL
      const propertyResult = await rawSql<{
        id: string;
        user_id: string;
        title: string;
        seller_profile_id: string;
      }[]>`
        SELECT p.id, p.user_id, p.title, up.id as seller_profile_id
        FROM properties p
        INNER JOIN user_profiles up ON p.user_id = up.user_id
        WHERE p.id = ${input.propertyId}
      `;

      if (propertyResult.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      const property = propertyResult[0];
      let sellerProfileId = property.seller_profile_id;

      // Check for provider contact (imported properties)
      const providerContactResults = await db
        .select()
        .from(propertyProviderContacts)
        .where(eq(propertyProviderContacts.propertyId, input.propertyId))
        .limit(1);

      if (providerContactResults.length > 0) {
        const providerContact = providerContactResults[0];

        // If provider contact exists but no linked account, send invitation
        if (!providerContact.linkedUserId) {
          // Generate signup link with pre-filled email
          const signupToken = jwt.sign(
            {
              email: providerContact.providerEmail,
              property_id: input.propertyId,
              invited_by_user_id: userId,
            },
            JWT_SECRET,
            { expiresIn: '30d' }
          );

          const signupLink = `${FRONTEND_URL}/signup/provider-invitation?token=${signupToken}`;

          // Get buyer name for invitation email
          const buyerProfileData = await db
            .select({ firstName: userProfiles.firstName, lastName: userProfiles.lastName })
            .from(userProfiles)
            .where(eq(userProfiles.userId, userId))
            .limit(1);

          const buyerName = buyerProfileData[0]
            ? `${buyerProfileData[0].firstName || ''} ${buyerProfileData[0].lastName || ''}`.trim()
            : 'Ein Interessent';

          // Send invitation email
          await sendProviderInvitation({
            providerEmail: providerContact.providerEmail!,
            providerName: providerContact.providerName || 'Sehr geehrte Damen und Herren',
            buyerName,
            propertyTitle: property.title,
            signupLink,
          });

          // Update invited_at timestamp
          await db
            .update(propertyProviderContacts)
            .set({ invitedAt: new Date().toISOString() })
            .where(eq(propertyProviderContacts.id, providerContact.id));

          // Return pending status instead of creating conversation
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Einladung wurde an den Anbieter gesendet. Sie werden benachrichtigt, sobald er sich registriert.',
          });
        }

        // If provider has account, use linked_user_id as seller
        if (providerContact.linkedUserId) {
          // Get seller profile ID from linked user
          const linkedSellerProfileResults = await db
            .select({ id: userProfiles.id })
            .from(userProfiles)
            .where(eq(userProfiles.userId, providerContact.linkedUserId))
            .limit(1);

          if (linkedSellerProfileResults.length > 0) {
            sellerProfileId = linkedSellerProfileResults[0].id;
          }
        }
      }

      // Can't create conversation with yourself
      if (buyerProfileId === sellerProfileId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot create conversation with yourself',
        });
      }

      // Check if conversation already exists
      const existingConversationResults = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.propertyId, input.propertyId),
            eq(conversations.buyerId, buyerProfileId)
          )
        )
        .limit(1);

      if (existingConversationResults.length > 0) {
        return {
          conversationId: existingConversationResults[0].id,
          isNew: false,
        };
      }

      // Create new conversation
      const newConversationResults = await db
        .insert(conversations)
        .values({
          propertyId: input.propertyId,
          buyerId: buyerProfileId,
          sellerId: sellerProfileId,
        })
        .returning({ id: conversations.id });

      const conversationId = newConversationResults[0].id;

      // Send AI greeting message
      const greetingMessage = await generateGreetingMessage(property.title);

      await db.insert(messages).values({
        conversationId,
        senderType: 'ai',
        content: greetingMessage,
        isAiGenerated: true,
      });

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
    const userProfileResults = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (userProfileResults.length === 0) {
      return [];
    }

    const userProfileId = userProfileResults[0].id;

    // Complex query with multiple JOINs and subqueries - keep as raw SQL
    const result = await rawSql<any[]>`
      SELECT
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
      WHERE c.buyer_id = ${userProfileId} OR c.seller_id = ${userProfileId}
      ORDER BY c.last_message_at DESC
    `;

    const conversationsList = result.map((row) => {
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
        propertyTitle: row.property_title || 'Immobilie',
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

    return conversationsList;
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
      const userProfileResults = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfileResults.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const userProfileId = userProfileResults[0].id;

      // Verify user has access to this conversation
      const conversationResults = await db
        .select({ buyerId: conversations.buyerId, sellerId: conversations.sellerId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversationResults.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResults[0];
      const isBuyer = conversation.buyerId === userProfileId;
      const isSeller = conversation.sellerId === userProfileId;

      if (!isBuyer && !isSeller) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        });
      }

      // Mark messages as read - call PostgreSQL function
      const userRole = isBuyer ? 'buyer' : 'seller';
      await rawSql`SELECT reset_unread_count(${input.conversationId}, ${userProfileId}, ${userRole})`;

      // Emit unread count update
      const unreadResult = await rawSql<{ count: number }[]>`SELECT get_user_unread_count(${userProfileId}) as count`;
      const unreadCount = unreadResult[0]?.count || 0;
      emitUnreadCountUpdate(userId, unreadCount);

      // Fetch messages with sender info - complex JOIN
      const messagesResult = await rawSql<any[]>`
        SELECT
          m.id,
          m.sender_id,
          m.sender_type,
          m.content,
          m.is_ai_generated,
          m.ai_confidence,
          m.forwarded_to_seller,
          m.attachments,
          m.created_at,
          up.first_name,
          up.last_name,
          up.avatar_url
        FROM messages m
        LEFT JOIN user_profiles up ON m.sender_id = up.id
        WHERE m.conversation_id = ${input.conversationId}
        ORDER BY m.created_at ASC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `;

      const messagesList = messagesResult.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        senderType: row.sender_type,
        content: row.content,
        isAiGenerated: row.is_ai_generated,
        aiConfidence: row.ai_confidence ? parseFloat(row.ai_confidence) : null,
        forwardedToSeller: row.forwarded_to_seller,
        attachments: row.attachments || [],
        createdAt: row.created_at,
        sender: row.sender_id
          ? {
              firstName: row.first_name,
              lastName: row.last_name,
              avatar: row.avatar_url,
            }
          : null,
      }));

      return messagesList;
    }),

  /**
   * Send a message
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().max(10000).default(''),
        attachments: z.array(
          z.object({
            url: z.string().url(),
            type: z.string(),
            name: z.string(),
            size: z.number().optional(),
            thumbnailUrl: z.string().url().optional(),
          })
        ).optional().default([]),
      }).refine(
        (data) => data.content.trim().length > 0 || (data.attachments && data.attachments.length > 0),
        { message: 'Message must have content or at least one attachment' }
      )
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get user_profile.id
      const userProfileResults = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfileResults.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const userProfileId = userProfileResults[0].id;

      // Verify access and get conversation details - complex JOIN
      const conversationResult = await rawSql<{
        buyer_id: string;
        seller_id: string;
        property_id: string;
        property_title: string;
      }[]>`
        SELECT c.buyer_id, c.seller_id, c.property_id, p.title as property_title
        FROM conversations c
        INNER JOIN properties p ON c.property_id = p.id
        WHERE c.id = ${input.conversationId}
      `;

      if (conversationResult.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResult[0];
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

      // Get recipient's user_id for Socket.io
      const recipientUserResults = await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(eq(userProfiles.id, recipientProfileId))
        .limit(1);

      const recipientUserId = recipientUserResults[0]?.userId;

      // Insert user message
      const userMessageResults = await db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          senderId: userProfileId,
          senderType,
          content: input.content,
          attachments: input.attachments,
        })
        .returning({ id: messages.id, createdAt: messages.createdAt });

      const userMessage = {
        id: userMessageResults[0].id,
        senderId: userProfileId,
        senderType,
        content: input.content,
        attachments: input.attachments,
        createdAt: userMessageResults[0].createdAt,
      };

      // Emit new message via Socket.io
      emitNewMessage(input.conversationId, userMessage);

      // If buyer sends message with text content, trigger AI response
      const hasTextContent = input.content.trim().length > 0;

      if (isBuyer && hasTextContent) {
        try {
          const qaResponse = await answerPropertyQuestion(
            conversation.property_id,
            input.content
          );

          if (qaResponse.shouldForwardToSeller) {
            console.log(`[Messaging] Question forwarded to seller (low AI confidence): ${recipientProfileId}`);
          } else {
            // Insert AI response
            const aiMessageResults = await db
              .insert(messages)
              .values({
                conversationId: input.conversationId,
                senderType: 'ai',
                content: qaResponse.answer,
                isAiGenerated: true,
                aiConfidence: String(qaResponse.confidence),
                forwardedToSeller: false,
              })
              .returning({ id: messages.id, createdAt: messages.createdAt });

            const aiMessage = {
              id: aiMessageResults[0].id,
              senderType: 'ai',
              content: qaResponse.answer,
              isAiGenerated: true,
              aiConfidence: qaResponse.confidence,
              forwardedToSeller: false,
              createdAt: aiMessageResults[0].createdAt,
            };

            // Emit AI message
            emitNewMessage(input.conversationId, aiMessage);
          }
        } catch (error) {
          console.error('[Messaging] AI Q&A failed:', error);
          console.log(`[Messaging] Question forwarded to seller (AI error): ${recipientProfileId}`);
        }
      } else if (isSeller && hasTextContent) {
        // Seller message - try to learn from the response
        console.log(`[Messaging] Seller replied to buyer: ${recipientProfileId}`);

        try {
          const lastBuyerQuestionResults = await db
            .select({ content: messages.content })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, input.conversationId),
                eq(messages.senderType, 'buyer')
              )
            )
            .orderBy(desc(messages.createdAt))
            .limit(1);

          if (lastBuyerQuestionResults.length > 0 && lastBuyerQuestionResults[0].content) {
            const buyerQuestion = lastBuyerQuestionResults[0].content;

            // Extract knowledge asynchronously (non-blocking)
            extractKnowledgeFromChat({
              conversationId: input.conversationId,
              messageId: userMessage.id,
              propertyId: conversation.property_id,
              sellerId: userId,
              buyerQuestion,
              sellerAnswer: input.content,
            })
              .then((learned) => {
                if (learned) {
                  console.log(
                    `[Messaging] Knowledge learned: ${learned.info.substring(0, 50)}...`
                  );
                }
              })
              .catch((err) => {
                console.error('[Messaging] Knowledge extraction failed:', err);
              });
          }
        } catch (err) {
          console.error('[Messaging] Failed to get last buyer question:', err);
        }
      }

      // Update unread count for recipient
      const recipientUnreadResult = await rawSql<{ count: number }[]>`
        SELECT get_user_unread_count(${recipientProfileId}) as count
      `;
      const recipientUnreadCount = recipientUnreadResult[0]?.count || 0;
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
    const userProfileResults = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (userProfileResults.length === 0) {
      return { unreadCount: 0 };
    }

    const userProfileId = userProfileResults[0].id;

    const result = await rawSql<{ count: number }[]>`SELECT get_user_unread_count(${userProfileId}) as count`;

    return {
      unreadCount: result[0]?.count || 0,
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
      const userProfileResults = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfileResults.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const userProfileId = userProfileResults[0].id;

      // Verify user has access to this conversation
      const conversationResults = await db
        .select({ buyerId: conversations.buyerId, sellerId: conversations.sellerId })
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversationResults.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
      }

      const conversation = conversationResults[0];
      const isBuyer = conversation.buyerId === userProfileId;
      const isSeller = conversation.sellerId === userProfileId;

      if (!isBuyer && !isSeller) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this conversation',
        });
      }

      // Delete all messages first
      await db.delete(messages).where(eq(messages.conversationId, input.conversationId));

      // Delete the conversation
      await db.delete(conversations).where(eq(conversations.id, input.conversationId));

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
      const userProfileResults = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfileResults.length === 0) {
        return {
          totalQuestions: 0,
          aiAnswered: 0,
          aiAnswerRate: 0,
          forwardedToSeller: 0,
        };
      }

      const userProfileId = userProfileResults[0].id;

      // Complex aggregation query - keep as raw SQL
      let result;
      if (input.propertyId) {
        result = await rawSql<any[]>`
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
          WHERE c.seller_id = ${userProfileId} AND c.property_id = ${input.propertyId}
        `;
      } else {
        result = await rawSql<any[]>`
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
          WHERE c.seller_id = ${userProfileId}
        `;
      }

      const row = result[0];
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
