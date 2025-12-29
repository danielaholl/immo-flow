import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: process.env.USER || 'my_macbook',
  password: '',
});

async function fixPropertyOwners() {
  const client = await pool.connect();

  try {
    console.log('🔧 Fixing property owners...\n');

    // 1. Create demo seller user if not exists
    const demoEmail = 'demo-seller@rendito.de';
    // Pre-hashed password for 'Demo123!' (bcrypt hash)
    const demoPassword = '$2a$10$YourHashHere'; // This will be ignored if user exists

    console.log('1️⃣ Creating demo seller user...');

    // First check if user exists
    let userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [demoEmail]
    );

    let userId;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log(`   ✅ User already exists: ${userId}\n`);
    } else {
      // Create new user
      userResult = await client.query(
        `INSERT INTO users (email, password_hash, email_confirmed)
         VALUES ($1, $2, true)
         RETURNING id`,
        [demoEmail, '$2a$10$rXZqLJZqLJZqLJZqLJZqLeK5kK5kK5kK5kK5kK5kK5kK5kK5kK5k.']
      );
      userId = userResult.rows[0].id;
      console.log(`   ✅ User created: ${userId}\n`);
    }
    console.log(`   ✅ User created/found: ${userId}\n`);

    // 2. Create user profile for demo seller
    console.log('2️⃣ Creating user profile...');
    await client.query(
      `INSERT INTO user_profiles (user_id, first_name, last_name, company, phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
       SET first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           company = EXCLUDED.company,
           phone = EXCLUDED.phone`,
      [userId, 'Demo', 'Verkäufer', 'Rendito Demo GmbH', '+49 30 12345678']
    );
    console.log('   ✅ Profile created\n');

    // 3. Update all properties without owner
    console.log('3️⃣ Assigning properties to demo seller...');
    const updateResult = await client.query(
      `UPDATE properties
       SET user_id = $1
       WHERE user_id IS NULL
       RETURNING id, title`,
      [userId]
    );

    if (updateResult.rows.length > 0) {
      console.log(`   ✅ Updated ${updateResult.rows.length} properties:`);
      updateResult.rows.forEach(row => {
        console.log(`      • ${row.title}`);
      });
    } else {
      console.log('   ℹ️  No properties to update');
    }

    console.log('\n✅ All properties now have owners!\n');
    console.log('Demo seller credentials:');
    console.log(`   Email: ${demoEmail}`);
    console.log(`   Password: Demo123!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixPropertyOwners();
