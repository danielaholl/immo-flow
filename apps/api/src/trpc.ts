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
