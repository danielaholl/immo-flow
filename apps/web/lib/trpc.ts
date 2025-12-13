/**
 * tRPC Client für Frontend
 */
import { createTRPCReact } from '@trpc/react-query';
// Import AppRouter type from the API server (requires apps/api to be built first)
import type { AppRouter } from '@api/router';

export const trpc = createTRPCReact<AppRouter>();

// Re-export for convenience
export { type AppRouter };
