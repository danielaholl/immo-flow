/**
 * Auth Router
 * Authentication and user management
 */
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authRouter = router({
  // Register new user
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim().max(255),
        password: z
          .string()
          .min(6, 'Password must be at least 6 characters')
          .max(128, 'Password too long'),
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user exists
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [input.email]
      );

      if (existing) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const newUser = await queryOne<{ id: string; email: string }>(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, true)
         RETURNING id, email`,
        [input.email, passwordHash]
      );

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Create profile
      await query(
        `INSERT INTO user_profiles (user_id, first_name, last_name)
         VALUES ($1, $2, $3)`,
        [newUser.id, input.firstName || null, input.lastName || null]
      );

      // Generate JWT
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
        },
        token,
      };
    }),

  // Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email().toLowerCase().trim().max(255),
        password: z.string().min(1).max(128),
      })
    )
    .mutation(async ({ input }) => {
      // Get user
      const user = await queryOne<{
        id: string;
        email: string;
        password_hash: string | null;
      }>(
        'SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1',
        [input.email]
      );

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const valid = await bcrypt.compare(input.password, user.password_hash || '');

      if (!valid) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      };
    }),

  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const result = await queryOne<any>(
      `SELECT u.id, u.email, up.*
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [ctx.user.id]
    );

    return result || null;
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().trim().min(1).max(100).optional(),
        lastName: z.string().trim().min(1).max(100).optional(),
        phone: z.string().trim().regex(/^[\d\s\+\-\(\)]+$/, 'Invalid phone number format').min(7).max(20).optional(),
        address: z.string().trim().max(500).optional(),
        company: z.string().trim().min(1).max(200).optional(),
        bio: z.string().trim().max(1000).optional(),
        avatarUrl: z.string().trim().url().max(500).optional().nullable(),
        globalAddressConsent: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Build dynamic update
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.firstName !== undefined) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(input.firstName);
      }
      if (input.lastName !== undefined) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(input.lastName);
      }
      if (input.phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(input.phone);
      }
      if (input.address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(input.address);
      }
      if (input.company !== undefined) {
        updates.push(`company = $${paramCount++}`);
        values.push(input.company);
      }
      if (input.bio !== undefined) {
        updates.push(`bio = $${paramCount++}`);
        values.push(input.bio);
      }
      if (input.avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramCount++}`);
        values.push(input.avatarUrl);
      }
      if (input.globalAddressConsent !== undefined) {
        updates.push(`global_address_consent = $${paramCount++}`);
        values.push(input.globalAddressConsent);
      }

      if (updates.length === 0) {
        const existing = await queryOne<any>(
          'SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1',
          [ctx.user.id]
        );
        return existing || null;
      }

      values.push(ctx.user.id);
      const updated = await queryOne<any>(
        `UPDATE user_profiles
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE user_id = $${paramCount}
         RETURNING *`,
        values
      );

      return updated || null;
    }),

  // Create provider account from invitation
  createProviderAccount: publicProcedure
    .input(z.object({
      invitation_token: z.string(),
      password: z.string().min(8),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      company: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Verify invitation token
      let tokenPayload: { email: string; property_id: string; invited_by_user_id: string };
      try {
        tokenPayload = jwt.verify(input.invitation_token, JWT_SECRET) as {
          email: string;
          property_id: string;
          invited_by_user_id: string;
        };
      } catch (error) {
        throw new Error('Invalid or expired invitation token');
      }

      // Check if user already exists
      const existingUser = await queryOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        [tokenPayload.email]
      );

      if (existingUser) {
        throw new Error('Account already exists with this email');
      }

      // Create user account
      const passwordHash = await bcrypt.hash(input.password, 10);

      const newUser = await queryOne<{ id: string; email: string }>(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, true)
         RETURNING id, email`,
        [tokenPayload.email, passwordHash]
      );

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Create user profile
      await query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, company, is_seller, is_buyer)
         VALUES ($1, $2, $3, $4, true, false)`,
        [newUser.id, input.first_name || null, input.last_name || null, input.company || null]
      );

      // Create makler_free subscription
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await query(
        `INSERT INTO subscriptions (user_id, plan_type, status, current_period_start, current_period_end)
         VALUES ($1, 'makler_free', 'active', $2, $3)`,
        [newUser.id, new Date().toISOString(), oneYearFromNow.toISOString()]
      );

      // Grant 1 free property listing + 3 free AI evaluations
      await query(
        `INSERT INTO user_credits (user_id, credit_type, amount, expires_at)
         VALUES ($1, 'property_listing', 1, $2), ($1, 'ai_evaluation', 3, $2)`,
        [newUser.id, oneYearFromNow.toISOString()]
      );

      // Link provider contact to new user
      await query(
        `UPDATE property_provider_contacts
         SET linked_user_id = $1, invitation_accepted_at = $2
         WHERE property_id = $3 AND provider_email = $4`,
        [newUser.id, new Date(), tokenPayload.property_id, tokenPayload.email]
      );

      // Create auth token
      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

      return {
        user: newUser,
        token,
        free_evaluations: 3,
        free_property_listing: 1,
      };
    }),
});
