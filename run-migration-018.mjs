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
    console.log('🗄️  Running migration 018_fix_decimal_columns...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'packages/database/migrations/018_fix_decimal_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration 018 completed successfully!\n');
    console.log('Changes applied:');
    console.log('   ✓ Changed usable_area from INTEGER to DECIMAL(10,2)');
    console.log('   ✓ Changed monthly_fee from INTEGER to DECIMAL(10,2)');
    console.log('   ✓ Updated constraints\n');

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
