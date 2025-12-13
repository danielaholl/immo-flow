/**
 * @immoflow/api
 * API functions for ImmoFlow
 * All functions now use PostgreSQL directly
 */

// Migrated to PostgreSQL
export * from './search-history';
export * from './recommendations';

// Note: All other API functions have been migrated to tRPC routers in /apps/api/src/routers/
// - auth.ts → routers/auth.ts
// - properties.ts → routers/properties.ts
// - favorites.ts → routers/favorites.ts
// - bookings → routers (integrated)
// - consents → routers/consents.ts
// - etc.
