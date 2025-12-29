import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: 'my_macbook',
  password: 'dummy',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrations', '023_search_preferences.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 023_search_preferences.sql...');
    console.log('This migration adds search history integration to user preferences calculation.');
    console.log('- 70% weight for favorites/shares');
    console.log('- 30% weight for search history with recency decay');
    console.log('');

    await client.query(sql);
    console.log('Migration completed successfully!');

    // Test the function
    console.log('\nTesting calculate_user_preferences function...');

    // Get a user with search history to test
    const testUserResult = await client.query(
      'SELECT DISTINCT user_id FROM search_history LIMIT 1'
    );

    if (testUserResult.rows.length > 0) {
      const testUserId = testUserResult.rows[0].user_id;
      console.log(`Testing with user: ${testUserId}`);
      await client.query('SELECT calculate_user_preferences($1)', [testUserId]);
      console.log('Function executed without errors!');

      // Show the result
      const prefsResult = await client.query(
        'SELECT preferred_locations, min_price, max_price, preferred_rooms, preferred_features, interaction_count FROM user_preferences WHERE user_id = $1',
        [testUserId]
      );
      if (prefsResult.rows.length > 0) {
        console.log('\nCalculated preferences:');
        console.log(JSON.stringify(prefsResult.rows[0], null, 2));
      }
    } else {
      console.log('No users with search history found for testing.');
    }

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
