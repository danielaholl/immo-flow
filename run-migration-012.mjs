import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: process.env.USER || 'my_macbook',
  password: '',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🗄️  Running migration 012_add_company_to_user_profiles...\n');

    // Add company column if it doesn't exist
    console.log('📝 Adding company column to user_profiles...');
    await client.query(`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS company TEXT;
    `);

    console.log('\n✅ Migration 012 completed successfully!\n');
    console.log('Changes applied:');
    console.log('   ✓ Added company column to user_profiles table\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('   Error:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
