import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: 'my_macbook',
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Drop all tables and schemas
    console.log('\n🧹 Dropping all tables and schemas...');
    await client.query(`
      DROP SCHEMA IF EXISTS auth CASCADE;
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO my_macbook;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✅ All tables and schemas dropped');

    // Get all migration files in order
    const migrationsDir = path.join(__dirname, 'packages/database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .filter(f => !f.includes('009_add_columns_to_ai_evaluations')) // Skip duplicate
      .sort(); // Already numerically sorted

    console.log(`\n📝 Found ${migrationFiles.length} migration files\n`);

    // Run migrations in order
    for (const file of migrationFiles) {
      console.log(`📝 Running: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`✅ Success: ${file}\n`);
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ All migrations completed successfully!');

    // List tables
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log('\n📊 Tables created:');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations().catch(console.error);
