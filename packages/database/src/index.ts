/**
 * @immoflow/database
 * PostgreSQL client and types
 */

// PostgreSQL client
export * from './client';

// Note: Hooks are not exported to avoid React dependency issues during build
// export * from './hooks';
export type { Database } from './database.types';
