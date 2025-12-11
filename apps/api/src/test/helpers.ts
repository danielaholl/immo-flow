/**
 * Test Helpers
 * Utilities for testing tRPC procedures
 */
import { appRouter } from './logger.js'../router.js';
import { Context } from './logger.js'../trpc.js';
import type { inferProcedureInput } from './logger.js'@trpc/server';
import type { AppRouter } from './logger.js'../router.js';

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
