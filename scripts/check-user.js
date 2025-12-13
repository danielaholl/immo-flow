#!/usr/bin/env node
/**
 * Check if user exists in database
 */
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'immoflow',
  user: 'postgres',
  password: 'postgres',
});

async function checkUser() {
  try {
    const result = await pool.query(
      'SELECT id, email, email_confirmed, created_at FROM users WHERE email = $1',
      ['daniela@holl.tv']
    );

    if (result.rows.length > 0) {
      console.log('✅ User exists:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ User does not exist');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
