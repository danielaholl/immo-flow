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
    console.log('🗄️  Running migration 015_add_messaging_functions...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'packages/database/migrations/015_add_messaging_functions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration 015 completed successfully!\n');
    console.log('Changes applied:');
    console.log('   ✓ Created reset_unread_count() function');
    console.log('   ✓ Created increment_unread_count() function');
    console.log('   ✓ Created get_user_unread_count() function');
    console.log('   ✓ Added trigger for automatic unread count updates\n');

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
