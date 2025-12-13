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
      const existing = await queryOne('SELECT id FROM users WHERE email = $1', [input.email]);

      if (existing) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await queryOne(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, $3)
         RETURNING id, email`,
        [input.email, passwordHash, true]
      );

      if (!user) {
        throw new Error('Failed to create user');
      }

      // Create profile
      await query(
        `INSERT INTO user_profiles (user_id, first_name, last_name)
         VALUES ($1, $2, $3)`,
        [user.id, input.firstName, input.lastName]
      );

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
      const user = await queryOne(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [input.email]
      );

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const valid = await bcrypt.compare(input.password, user.password_hash);

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
    const profile = await queryOne(
      `SELECT u.id, u.email, up.*
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [ctx.user.id]
    );

    return profile;
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
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.firstName !== undefined) {
        updates.push(`first_name = $${paramCount}`);
        values.push(input.firstName);
        paramCount++;
      }
      if (input.lastName !== undefined) {
        updates.push(`last_name = $${paramCount}`);
        values.push(input.lastName);
        paramCount++;
      }
      if (input.phone !== undefined) {
        updates.push(`phone = $${paramCount}`);
        values.push(input.phone);
        paramCount++;
      }
      if (input.address !== undefined) {
        updates.push(`address = $${paramCount}`);
        values.push(input.address);
        paramCount++;
      }
      if (input.company !== undefined) {
        updates.push(`company = $${paramCount}`);
        values.push(input.company);
        paramCount++;
      }
      if (input.bio !== undefined) {
        updates.push(`bio = $${paramCount}`);
        values.push(input.bio);
        paramCount++;
      }
      if (input.avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramCount}`);
        values.push(input.avatarUrl);
        paramCount++;
      }
      if (input.globalAddressConsent !== undefined) {
        updates.push(`global_address_consent = $${paramCount}`);
        values.push(input.globalAddressConsent);
        paramCount++;
      }

      if (updates.length === 0) {
        return await queryOne(
          'SELECT * FROM user_profiles WHERE user_id = $1',
          [ctx.user.id]
        );
      }

      values.push(ctx.user.id);

      const profile = await queryOne(
        `UPDATE user_profiles
         SET ${updates.join(', ')}
         WHERE user_id = $${paramCount}
         RETURNING *`,
        values
      );

      return profile;
    }),
});
