/**
 * PostgreSQL Database Connection
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables BEFORE creating the pool
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../.env') });

import pg from 'pg';
const { Pool } = pg;

// Database connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'immoflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB Query] ${duration}ms: ${text.substring(0, 50)}...`);
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
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB Query with User ${userId.substring(0, 8)}] ${duration}ms: ${text.substring(0, 50)}...`);

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

// Test connection
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', result[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Export db object for compatibility
export const db = {
  query: pool.query.bind(pool),
  connect: pool.connect.bind(pool),
  end: pool.end.bind(pool),
  pool,
};
