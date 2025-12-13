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
    console.log('🗄️  Running migration 013_messaging_and_statistics...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'packages/database/migrations/013_messaging_and_statistics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration 013 completed successfully!\n');
    console.log('Changes applied:');
    console.log('   ✓ Created conversations table');
    console.log('   ✓ Created messages table');
    console.log('   ✓ Created property_statistics table');
    console.log('   ✓ Added indexes for performance');
    console.log('   ✓ Added triggers for automatic updates');
    console.log('   ✓ Configured Row Level Security\n');

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
