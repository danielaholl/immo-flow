import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: process.env.USER || 'my_macbook',
  password: '',
});

async function checkProperties() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking properties with missing owners...\n');

    // Check properties without user_id
    const noUserId = await client.query(`
      SELECT id, title, user_id
      FROM properties
      WHERE user_id IS NULL
      LIMIT 5
    `);

    if (noUserId.rows.length > 0) {
      console.log('❌ Properties without user_id:');
      noUserId.rows.forEach(row => {
        console.log(`   • ${row.title} (${row.id})`);
      });
      console.log();
    }

    // Check properties with user_id but no matching user_profile
    const noProfile = await client.query(`
      SELECT p.id, p.title, p.user_id
      FROM properties p
      LEFT JOIN user_profiles up ON p.user_id = up.user_id
      WHERE up.id IS NULL AND p.user_id IS NOT NULL
      LIMIT 5
    `);

    if (noProfile.rows.length > 0) {
      console.log('❌ Properties with user_id but no user_profile:');
      noProfile.rows.forEach(row => {
        console.log(`   • ${row.title} (user_id: ${row.user_id})`);
      });
      console.log();
    }

    // Check sample property details
    const sample = await client.query(`
      SELECT p.id, p.title, p.user_id, up.id as profile_id, up.first_name, up.last_name
      FROM properties p
      LEFT JOIN user_profiles up ON p.user_id = up.user_id
      LIMIT 3
    `);

    console.log('📊 Sample properties:');
    sample.rows.forEach(row => {
      console.log(`   • ${row.title}`);
      console.log(`     - user_id: ${row.user_id || 'NULL'}`);
      console.log(`     - profile_id: ${row.profile_id || 'NULL'}`);
      console.log(`     - owner: ${row.first_name ? `${row.first_name} ${row.last_name}` : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProperties();
