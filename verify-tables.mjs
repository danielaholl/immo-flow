import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: process.env.USER || 'my_macbook',
  password: '',
});

async function verifyTables() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying new tables...\n');

    const result = await client.query(`
      SELECT table_name,
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_name IN ('conversations', 'messages', 'property_statistics')
      ORDER BY table_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ No tables found!\n');
    } else {
      console.log('✅ Tables verified:\n');
      result.rows.forEach(row => {
        console.log(`   • ${row.table_name} (${row.column_count} columns)`);
      });
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTables();
