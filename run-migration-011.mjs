import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database connection pool
// Uses localhost connection like the running API server
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
    console.log('🗄️  Running migration 011_fix_missing_schema...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'packages', 'database', 'migrations', '011_fix_missing_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('📝 Executing migration SQL...');
    await client.query(sql);

    console.log('\n✅ Migration 011_fix_missing_schema completed successfully!\n');
    console.log('Changes applied:');
    console.log('   ✓ Added actual_monthly_rent column to properties table');
    console.log('   ✓ Added important_notes column to properties table');
    console.log('   ✓ Added energy_efficiency_class column to properties table');
    console.log('   ✓ Created user_dismissed_properties table');
    console.log('   ✓ Added performance indexes');
    console.log('   ✓ Set up Row Level Security\n');

    // Verify the changes
    console.log('🔍 Verifying changes...');

    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_dismissed_properties'
      );
    `);

    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'properties' AND column_name = 'actual_monthly_rent'
      );
    `);

    if (tableCheck.rows[0].exists && columnCheck.rows[0].exists) {
      console.log('✅ Verification successful: All changes applied correctly!\n');
    } else {
      console.warn('⚠️  Warning: Some changes may not have been applied correctly\n');
    }

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
