import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database connection pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: 'postgres',
  password: 'postgres',
});

async function runMigration() {
  try {
    console.log('📦 Running migration 008_recommendation_system...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '008_recommendation_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration 008_recommendation_system completed successfully!');
    console.log('   - Created property_similarities table');
    console.log('   - Created property_trending table');
    console.log('   - Created recommendations_cache table');
    console.log('   - Updated calculate_user_preferences() function');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
