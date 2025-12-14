import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'immoflow',
  user: 'my_macbook',
  password: 'dummy',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrations', '022_fix_user_preferences_function.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 022_fix_user_preferences_function.sql...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    // Test the function
    console.log('\nTesting calculate_user_preferences function...');
    const testResult = await client.query('SELECT calculate_user_preferences($1)', ['8a535561-7e8c-4b3c-b160-8162ecb5ed5c']);
    console.log('Function executed without errors!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
