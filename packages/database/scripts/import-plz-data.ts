/**
 * PLZ Import Script
 * Importiert alle deutschen Postleitzahlen von OpenPLZ API
 *
 * Ausführung: npx tsx packages/database/scripts/import-plz-data.ts
 */

import pg from 'pg';
const { Pool } = pg;

// Datenbank-Verbindung
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'immoflow',
  user: process.env.DB_USER || 'my_macbook',
  password: process.env.DB_PASSWORD || 'dummy',
});

// OpenPLZ API Response Interface
interface OpenPLZLocality {
  postalCode: string;
  name: string;
  municipality: {
    key: string;
    name: string;
    type: string;
  };
  district?: {
    key: string;
    name: string;
    type: string;
  };
  federalState: {
    key: string;
    name: string;
  };
}

interface OpenPLZResponse {
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  data: OpenPLZLocality[];
}

// Mapping von Bundesland-Schlüsseln zu vollen Namen
const federalStateNames: Record<string, string> = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen',
};

async function fetchPLZByPrefix(prefix: string): Promise<OpenPLZLocality[]> {
  const allData: OpenPLZLocality[] = [];
  let page = 1;
  const pageSize = 50;
  let hasMore = true;

  while (hasMore) {
    const url = `https://openplzapi.org/de/Localities?postalCode=^${prefix}&page=${page}&pageSize=${pageSize}`;

    try {
      const response = await fetch(url, {
        headers: { 'accept': 'text/json' }
      });

      if (!response.ok) {
        console.error(`HTTP Error for prefix ${prefix}: ${response.status}`);
        break;
      }

      const data: OpenPLZLocality[] = await response.json();

      if (data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    } catch (error) {
      console.error(`Fetch error for prefix ${prefix}:`, error);
      break;
    }
  }

  return allData;
}

async function insertPLZData(localities: OpenPLZLocality[]): Promise<number> {
  let inserted = 0;

  // Mapping Bundesland → Grunderwerbsteuersatz
  const taxRateMap: Record<string, number> = {
    'Bayern': 3.5, 'Sachsen': 3.5,
    'Hamburg': 4.5,
    'Baden-Württemberg': 5.0, 'Niedersachsen': 5.0,
    'Rheinland-Pfalz': 5.0, 'Sachsen-Anhalt': 5.0, 'Bremen': 5.0,
    'Berlin': 6.0, 'Hessen': 6.0, 'Mecklenburg-Vorpommern': 6.0,
    'Nordrhein-Westfalen': 6.5, 'Saarland': 6.5,
    'Schleswig-Holstein': 6.5, 'Brandenburg': 6.5, 'Thüringen': 6.5
  };

  for (const locality of localities) {
    const federalStateName = locality.federalState?.name ||
                            federalStateNames[locality.federalState?.key] ||
                            locality.federalState?.key;
    const taxRate = taxRateMap[federalStateName] || 5.0;

    try {
      await pool.query(
        `INSERT INTO plz_market_data (plz, city, district, federal_state, grunderwerbsteuer_rate)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (plz) DO UPDATE SET
           city = EXCLUDED.city,
           district = EXCLUDED.district,
           federal_state = EXCLUDED.federal_state,
           grunderwerbsteuer_rate = EXCLUDED.grunderwerbsteuer_rate,
           updated_at = NOW()`,
        [
          locality.postalCode,
          locality.name,
          locality.district?.name || locality.municipality?.name || null,
          federalStateName,
          taxRate
        ]
      );
      inserted++;
    } catch (error) {
      console.error(`Insert error for PLZ ${locality.postalCode}:`, error);
    }
  }

  return inserted;
}

async function main() {
  console.log('🚀 Starting PLZ import from OpenPLZ API...\n');

  const startTime = Date.now();
  let totalImported = 0;

  // Deutsche PLZ gehen von 01 bis 99 (führende Null bei 01-09)
  const prefixes = Array.from({ length: 99 }, (_, i) =>
    (i + 1).toString().padStart(2, '0')
  );

  for (const prefix of prefixes) {
    process.stdout.write(`📥 Fetching PLZ ${prefix}xxx... `);

    const localities = await fetchPLZByPrefix(prefix);

    if (localities.length > 0) {
      const inserted = await insertPLZData(localities);
      totalImported += inserted;
      console.log(`${localities.length} gefunden, ${inserted} importiert`);
    } else {
      console.log('keine gefunden');
    }

    // Rate limiting: 100ms Pause zwischen Requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ Import abgeschlossen!');
  console.log(`📊 Gesamt importiert: ${totalImported} PLZ`);
  console.log(`⏱️  Dauer: ${duration}s`);

  // Statistiken anzeigen
  const stats = await pool.query(`
    SELECT
      federal_state,
      COUNT(*) as count
    FROM plz_market_data
    GROUP BY federal_state
    ORDER BY count DESC
  `);

  console.log('\n📈 PLZ pro Bundesland:');
  for (const row of stats.rows) {
    console.log(`   ${row.federal_state}: ${row.count}`);
  }

  await pool.end();
}

main().catch(console.error);
