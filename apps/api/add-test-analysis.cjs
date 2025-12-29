const { Client } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// Load .env from project root
config({ path: path.join(__dirname, '../../.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rendito',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function addTestAnalysis() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    const result = await client.query(`
      UPDATE properties
      SET ai_analysis = $1::jsonb
      WHERE id = '11111111-1111-1111-1111-111111111111'
      RETURNING id, title, ai_analysis;
    `, [JSON.stringify({
      investment_score: 72,
      estimated_rent: 1530,
      estimated_operating_costs: 255,
      estimated_maintenance_costs: 85,
      strengths: ["Zentrale Lage in München Schwabing", "Gute ÖPNV-Anbindung", "Beliebte Wohngegend"],
      weaknesses: ["Hoher Kaufpreis", "Keine Garage"],
      opportunities: ["Wertsteigerungspotenzial", "Starke Mietmarktnachfrage"],
      risks: ["Zinsänderungsrisiko", "Instandhaltungskosten"]
    })]);

    if (result.rows.length > 0) {
      console.log('✅ Updated property:', result.rows[0].title);
      console.log('📊 AI Analysis added successfully');
    } else {
      console.log('⚠️  No property found with that ID');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addTestAnalysis();
