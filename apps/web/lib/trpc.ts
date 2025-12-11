/**
 * tRPC Client für Frontend
 */
import { createTRPCReact } from '@trpc/react-query';
// Import AppRouter type from the API server
// Note: This requires apps/api to be built first or use path mapping
import type { AppRouter } from '../../../api/src/router.js';

export const trpc = createTRPCReact<AppRouter>();
