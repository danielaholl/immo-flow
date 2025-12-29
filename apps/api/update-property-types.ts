// Script to update property types
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rendito',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function updatePropertyTypes() {
  try {
    // Get all properties
    const result = await pool.query('SELECT id, title, location FROM properties ORDER BY created_at');
    const properties = result.rows;

    console.log(`Found ${properties.length} properties`);

    // Assign different types based on location/title patterns
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      let type = 'apartment'; // Default

      // Infer from title/location
      const title = (property.title || '').toLowerCase();
      const location = (property.location || '').toLowerCase();

      if (title.includes('villa') || location.includes('villa')) {
        type = 'villa';
      } else if (title.includes('haus') || location.includes('haus')) {
        type = 'house';
      } else if (title.includes('büro') || title.includes('office') || title.includes('gewerbe')) {
        type = 'office';
      } else if (title.includes('wohnung') || title.includes('apartment')) {
        type = 'apartment';
      } else if (location.includes('bogenhausen')) {
        type = 'villa';  // Bogenhausen is a luxury area
      } else if (location.includes('lehel')) {
        type = 'apartment';
      } else if (location.includes('schwabing')) {
        type = 'apartment';
      } else if (location.includes('prenzlauer')) {
        type = 'apartment';
      }

      // Update the property
      await pool.query(
        'UPDATE properties SET property_type = $1 WHERE id = $2',
        [type, property.id]
      );

      console.log(`✓ Updated ${property.location}: ${type}`);
    }

    console.log('\n✅ All properties updated!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updatePropertyTypes();
