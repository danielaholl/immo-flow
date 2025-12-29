#!/usr/bin/env node
/**
 * Reset user password
 */
import pg from 'pg';
import bcrypt from 'bcrypt';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: 'postgres',
  password: 'postgres',
});

async function resetPassword() {
  try {
    const email = 'daniela@holl.tv';
    const newPassword = 'test123'; // Simple password for testing

    console.log(`🔄 Resetting password for ${email}...`);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [passwordHash, email]
    );

    if (result.rows.length > 0) {
      console.log('✅ Password reset successful!');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 New password: ${newPassword}`);
      console.log('\n⚠️  Please use these credentials to log in.');
    } else {
      console.log('❌ User not found');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();
