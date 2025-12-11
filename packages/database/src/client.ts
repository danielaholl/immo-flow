/**
 * PostgreSQL Database Client
 * Centralized database connection for the entire monorepo
 * Replaces Supabase client with direct PostgreSQL connection
 */
import pg from 'pg';
const { Pool } = pg;
import type { Database } from './database.types.js';

// Note: Configuration is provided from environment variables
// For API server, validateEnv() must be called before importing this module
// For other packages, ensure env vars are set before pool initialization

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || process.env.POSTGRES_PORT || '5432'),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'immoflow',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection event handlers
pool.on('connect', () => {
  console.log('✅ Database pool connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Helper function to execute queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`[SLOW QUERY] ${duration}ms: ${text.substring(0, 80)}...`);
  }

  return result.rows;
}

// Helper for single row queries
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute queries with RLS context (sets current user ID for row-level security)
 * Usage: await queryWithUser(userId, 'SELECT * FROM properties WHERE id = $1', [propertyId])
 */
export async function queryWithUser<T = any>(
  userId: string,
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    // Set session variable for RLS policies
    await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);

    // Execute the actual query
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute single-row query with RLS context
 */
export async function queryOneWithUser<T = any>(
  userId: string,
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await queryWithUser<T>(userId, text, params);
  return rows[0] || null;
}

// Export pool for advanced usage
export { pool };

/**
 * Test database connection
 * Returns true if connection is successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Export types for convenience
export type { Database };

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenient type exports for commonly used tables
export type Property = Tables<'properties'>;
export type Booking = Tables<'bookings'>;
export type Favorite = Tables<'favorites'>;
export type UserProfile = Tables<'user_profiles'>;

export type PropertyInsert = Inserts<'properties'>;
export type BookingInsert = Inserts<'bookings'>;
export type FavoriteInsert = Inserts<'favorites'>;
