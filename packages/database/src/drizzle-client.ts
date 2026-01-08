/**
 * Drizzle ORM Client Configuration
 * New type-safe database client using Drizzle ORM
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema/index.js';

// Re-export commonly used Drizzle functions to avoid version conflicts
export { eq, and, or, not, ne, gt, gte, lt, lte, inArray, notInArray, isNull, isNotNull, desc, asc, count, sum, avg, min, max, sql as sqlBuilder } from 'drizzle-orm';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

// Connection string
const connectionString = `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'rendito'}`;

// PostgreSQL client (postgres.js)
export const sql = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: false, // Disable SSL for local development
});

// Drizzle ORM instance
export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});

export type Database = typeof db;

// Test connection
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as now`;
    console.log('✅ Drizzle connection test successful:', result[0]);
    return true;
  } catch (error) {
    console.error('❌ Drizzle connection test failed:', error);
    return false;
  }
}

// Helper for RLS context (sets current user ID for row-level security)
export async function withRLS<T>(
  userId: string,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  // Use a transaction to ensure RLS context is isolated
  return await db.transaction(async (tx) => {
    // Set RLS context
    await sql`SET LOCAL app.current_user_id = ${userId}`;

    // Execute callback with transaction client
    return await callback(tx as any);
  });
}
