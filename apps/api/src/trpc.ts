/**
 * tRPC Setup - Type-safe API
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables BEFORE using them
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env') });

import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { query as dbQuery, queryOne } from './db.js';
import type { PlanType } from './config/stripe-prices.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Context type
export interface Context {
  user?: {
    id: string;
    email: string;
  };
}

// Create context from Express request
export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  console.log('[API Server] Authorization header:', authHeader ? `PRESENT (${authHeader.substring(0, 20)}...)` : 'MISSING');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[API Server] No valid auth header, returning empty context');
    return {}; // No user
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    console.log('[API Server] Token verified successfully for user:', decoded.email);

    return {
      user: {
        id: decoded.userId,
        email: decoded.email,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('[API Server] Token verification failed:', errorMessage);
    return {}; // Invalid token
  }
}

// Initialize tRPC with default transformer (better UTF-8 handling)
const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      user: ctx.user, // Now guaranteed to be defined
    },
  });
});

/**
 * Get user's current subscription plan
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
  const sub = await queryOne(
    `SELECT plan_type FROM subscriptions
     WHERE user_id = $1 AND status IN ('active', 'trialing')
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return (sub?.plan_type as PlanType) || 'free';
}

/**
 * Investor+ Procedure - requires investor or pro plan
 * For: KI-Analyse, SWOT-Analyse, Rendite-Kalkulator, Finanzierungsrechner
 */
export const investorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const plan = await getUserPlan(ctx.user.id);
  if (!['investor', 'pro'].includes(plan)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Diese Funktion erfordert mindestens den Investor-Plan. Jetzt upgraden für volle KI-Analysen.',
    });
  }
  return next({ ctx: { ...ctx, plan } });
});

/**
 * Pro Procedure - requires pro plan
 * For: Portfolio-Übersicht, PDF-Export, Investoren-Club
 */
export const proProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const plan = await getUserPlan(ctx.user.id);
  if (plan !== 'pro') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Diese Funktion erfordert den Pro-Plan. Jetzt upgraden für alle Premium-Features.',
    });
  }
  return next({ ctx: { ...ctx, plan } });
});

/**
 * Sucher+ Procedure - requires sucher, investor or pro plan
 * For: Budget-Suche, Preis-Check
 */
export const searcherProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const plan = await getUserPlan(ctx.user.id);
  if (!['sucher', 'investor', 'pro'].includes(plan)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Diese Funktion erfordert mindestens den Sucher-Plan.',
    });
  }
  return next({ ctx: { ...ctx, plan } });
});
