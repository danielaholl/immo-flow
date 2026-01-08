/**
 * Document Access Router
 * Handles protected document access requests and approvals
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const documentAccessRouter = router({
  /**
   * Request access to protected documents for a property
   * Stores user data snapshot and sets status based on property's release mode
   */
  requestAccess: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get user profile for data snapshot
      const profile = await queryOne<{
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
      }>(
        'SELECT first_name, last_name, phone FROM user_profiles WHERE user_id = $1',
        [ctx.user.id]
      );

      // Get property to check release mode and ownership
      const property = await queryOne<{
        document_release_mode: string | null;
        user_id: string;
      }>(
        'SELECT document_release_mode, user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property) {
        throw new Error('Property not found');
      }

      // Property owner doesn't need to request access
      if (property.user_id === ctx.user.id) {
        return {
          request: null,
          isAutoApproved: true,
          isOwner: true
        };
      }

      // Determine initial status based on release mode
      const initialStatus = property.document_release_mode === 'automatic'
        ? 'approved'
        : 'pending';

      // Complex ON CONFLICT with CASE
      const results = await query<any[]>(
        `INSERT INTO document_access_requests
        (property_id, user_id, status, user_first_name, user_last_name, user_email, user_phone, responded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (property_id, user_id)
        DO UPDATE SET
          status = CASE
            WHEN document_access_requests.status = 'denied' THEN 'pending'
            ELSE document_access_requests.status
          END,
          user_first_name = EXCLUDED.user_first_name,
          user_last_name = EXCLUDED.user_last_name,
          user_email = EXCLUDED.user_email,
          user_phone = EXCLUDED.user_phone,
          requested_at = CASE
            WHEN document_access_requests.status = 'denied' THEN NOW()
            ELSE document_access_requests.requested_at
          END
        RETURNING *`,
        [
          input.propertyId,
          ctx.user.id,
          initialStatus,
          profile?.first_name || null,
          profile?.last_name || null,
          ctx.user.email,
          profile?.phone || null,
          initialStatus === 'approved' ? new Date().toISOString() : null
        ]
      );

      return {
        request: results[0],
        isAutoApproved: initialStatus === 'approved',
        isOwner: false
      };
    }),

  /**
   * Check access status for a property
   */
  getAccessStatus: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Check if user is the owner
      const property = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (property?.user_id === ctx.user.id) {
        return {
          hasAccess: true,
          hasManualApproval: true,
          status: 'approved' as const,
          request: null,
          isOwner: true
        };
      }

      const request = await queryOne<any>(
        `SELECT * FROM document_access_requests
         WHERE property_id = $1 AND user_id = $2`,
        [input.propertyId, ctx.user.id]
      );

      return {
        hasAccess: request?.status === 'approved',
        hasManualApproval: request?.manual_docs_approved === true,
        status: (request?.status as 'pending' | 'approved' | 'denied') || null,
        request,
        isOwner: false
      };
    }),

  /**
   * Get all access requests for broker's properties
   * Optionally filter by property or status
   */
  getAccessRequests: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid().optional(),
      status: z.enum(['pending', 'approved', 'denied']).optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      let sql = `
        SELECT dar.*, p.title as property_title
        FROM document_access_requests dar
        JOIN properties p ON dar.property_id = p.id
        WHERE p.user_id = $1
      `;
      const values: (string | undefined)[] = [ctx.user.id];
      let paramCount = 2;

      if (input?.propertyId) {
        sql += ` AND dar.property_id = $${paramCount}`;
        values.push(input.propertyId);
        paramCount++;
      }

      if (input?.status) {
        sql += ` AND dar.status = $${paramCount}`;
        values.push(input.status);
      }

      sql += ' ORDER BY dar.requested_at DESC';

      return await query<any[]>(sql, values);
    }),

  /**
   * Get count of pending requests for broker's properties
   */
  getPendingRequestsCount: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      let sql = `
        SELECT COUNT(*) as count
        FROM document_access_requests dar
        JOIN properties p ON dar.property_id = p.id
        WHERE p.user_id = $1 AND dar.status = 'pending'
      `;
      const values: string[] = [ctx.user.id];

      if (input?.propertyId) {
        sql += ' AND dar.property_id = $2';
        values.push(input.propertyId);
      }

      const result = await queryOne<{ count: string }>(sql, values);
      return { count: parseInt(result?.count || '0', 10) };
    }),

  /**
   * Respond to access request (approve/deny)
   */
  respondToRequest: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      status: z.enum(['approved', 'denied']),
      message: z.string().max(500).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify broker owns the property
      const request = await queryOne<any>(
        `SELECT dar.*, p.user_id as property_owner_id
         FROM document_access_requests dar
         JOIN properties p ON dar.property_id = p.id
         WHERE dar.id = $1`,
        [input.requestId]
      );

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.property_owner_id !== ctx.user.id) {
        throw new Error('Unauthorized - you do not own this property');
      }

      // Update request status
      const updated = await queryOne<any>(
        `UPDATE document_access_requests
         SET status = $1, responded_at = $2, broker_response_message = $3
         WHERE id = $4
         RETURNING *`,
        [input.status, new Date().toISOString(), input.message || null, input.requestId]
      );

      return updated;
    }),

  /**
   * Bulk approve all pending requests for a property
   */
  approveAllPending: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const property = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const result = await query<any[]>(
        `UPDATE document_access_requests
         SET status = 'approved', responded_at = $1
         WHERE property_id = $2 AND status = 'pending'
         RETURNING *`,
        [new Date().toISOString(), input.propertyId]
      );

      return { approvedCount: result.length };
    }),

  /**
   * Update property release mode (broker only)
   */
  updateReleaseMode: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      mode: z.enum(['automatic', 'manual'])
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const property = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      await query(
        'UPDATE properties SET document_release_mode = $1 WHERE id = $2',
        [input.mode, input.propertyId]
      );

      return { success: true, mode: input.mode };
    }),

  /**
   * Get release mode for a property
   */
  getReleaseMode: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const property = await queryOne<{
        user_id: string;
        document_release_mode: string | null;
      }>(
        'SELECT user_id, document_release_mode FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      return {
        mode: (property.document_release_mode || 'automatic') as 'automatic' | 'manual'
      };
    }),

  /**
   * Approve manual documents for all approved access requests
   * This sets manual_docs_approved = true for users who already have basic access
   */
  approveManualDocuments: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const property = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const result = await query<any[]>(
        `UPDATE document_access_requests
         SET manual_docs_approved = TRUE
         WHERE property_id = $1 AND status = 'approved' AND manual_docs_approved = FALSE
         RETURNING *`,
        [input.propertyId]
      );

      return { approvedCount: result.length };
    }),

  /**
   * Get count of users who have basic access but not manual docs access
   * (users waiting for manual document approval)
   */
  getPendingManualApprovalCount: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Verify ownership
      const property = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM document_access_requests
         WHERE property_id = $1 AND status = 'approved' AND manual_docs_approved = FALSE`,
        [input.propertyId]
      );

      return { count: parseInt(result?.count || '0', 10) };
    }),

  /**
   * Approve manual documents for a single user
   * Sets manual_docs_approved = true for the specified request
   */
  approveManualDocsForUser: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify broker owns the property
      const request = await queryOne<any>(
        `SELECT dar.*, p.user_id as property_owner_id
         FROM document_access_requests dar
         JOIN properties p ON dar.property_id = p.id
         WHERE dar.id = $1`,
        [input.requestId]
      );

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.property_owner_id !== ctx.user.id) {
        throw new Error('Unauthorized - you do not own this property');
      }

      if (request.status !== 'approved') {
        throw new Error('Request must be approved first');
      }

      // Update manual_docs_approved for this user
      const updated = await queryOne<any>(
        `UPDATE document_access_requests
         SET manual_docs_approved = TRUE
         WHERE id = $1
         RETURNING *`,
        [input.requestId]
      );

      return updated;
    }),
});
