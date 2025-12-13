/**
 * Test Helpers
 * Utilities for testing tRPC procedures
 */
import { appRouter } from '../router.js';
import { Context } from '../trpc.js';
import type { inferProcedureInput } from '@trpc/server';
import type { AppRouter } from '../router.js';

/**
 * Creates a tRPC caller for testing
 * @param ctx Optional context (user info, etc.)
 */
export function createCaller(ctx: Partial<Context> = {}) {
  return appRouter.createCaller({
    user: ctx.user,
  } as Context);
}

/**
 * Creates an authenticated caller with a test user
 */
export function createAuthenticatedCaller(userId: string, email: string) {
  return createCaller({
    user: { id: userId, email },
  });
}

/**
 * Type helpers for procedure inputs
 */
export type RegisterInput = inferProcedureInput<AppRouter['auth']['register']>;
export type LoginInput = inferProcedureInput<AppRouter['auth']['login']>;
export type CreatePropertyInput = inferProcedureInput<AppRouter['properties']['create']>;
