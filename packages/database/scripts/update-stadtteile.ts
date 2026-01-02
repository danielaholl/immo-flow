/**
 * Update Stadtteile (districts) from OpenStreetMap Nominatim
 * Adds suburb/district information to PLZ data
 *
 * Usage: npx tsx packages/database/scripts/update-stadtteile.ts
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'immoflow',
  user: process.env.DB_USER || 'my_macbook',
  password: process.env.DB_PASSWORD || 'dummy',
});

interface NominatimResult {
  address?: {
    suburb?: string;
    city_district?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
  };
}

async function fetchStadtteil(plz: string): Promise<{ suburb: string | null; cityDistrict: string | null }> {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${plz}&country=Germany&format=json&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ImmoFlow/1.0 (contact@example.com)' }
    });

    if (!response.ok) {
      return { suburb: null, cityDistrict: null };
    }

    const data: NominatimResult[] = await response.json();

    if (data.length > 0 && data[0].address) {
      const addr = data[0].address;
      return {
        suburb: addr.suburb || addr.neighbourhood || addr.quarter || null,
        cityDistrict: addr.city_district || null,
      };
    }
  } catch (error) {
    console.error(`Error fetching PLZ ${plz}:`, error);
  }

  return { suburb: null, cityDistrict: null };
}

async function updateStadtteile(prefix?: string) {
  console.log('🏘️  Updating Stadtteile from OpenStreetMap Nominatim...\n');

  // Get PLZ to update
  let query = 'SELECT plz, city FROM plz_market_data';
  const params: string[] = [];

  if (prefix) {
    query += ' WHERE plz LIKE $1';
    params.push(`${prefix}%`);
  }

  query += ' ORDER BY plz';

  const result = await pool.query(query, params);
  const plzList = result.rows;

  console.log(`📊 Found ${plzList.length} PLZ to process\n`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < plzList.length; i++) {
    const { plz, city } = plzList[i];

    // Rate limiting: 1 request per second (Nominatim policy)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    const { suburb, cityDistrict } = await fetchStadtteil(plz);

    if (suburb || cityDistrict) {
      // Store suburb in separate stadtteil column
      const stadtteil = suburb || cityDistrict || null;

      await pool.query(
        `UPDATE plz_market_data
         SET stadtteil = $2, updated_at = NOW()
         WHERE plz = $1`,
        [plz, stadtteil]
      );

      updated++;
      console.log(`✅ ${plz}: ${city} → Stadtteil: ${stadtteil}`);
    } else {
      skipped++;
      if ((i + 1) % 10 === 0) {
        console.log(`⏭️  ${plz}: No suburb data (${i + 1}/${plzList.length})`);
      }
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);
  await pool.end();
}

// Get prefix from command line args
const prefix = process.argv[2];

if (prefix) {
  console.log(`🎯 Processing only PLZ starting with: ${prefix}\n`);
}

updateStadtteile(prefix).catch(console.error);
