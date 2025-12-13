import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'immoflow',
  user: process.env.USER || 'my_macbook',
  password: '',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🗄️  Running migration 014_add_statistics_columns...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'packages/database/migrations/014_add_statistics_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration 014 completed successfully!\n');
    console.log('Changes applied:');
    console.log('   ✓ Added rating_count column');
    console.log('   ✓ Added avg_suggested_price column');
    console.log('   ✓ Added positive_feedback_count column');
    console.log('   ✓ Added neutral_feedback_count column');
    console.log('   ✓ Added negative_feedback_count column\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('   Error:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
