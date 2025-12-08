import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query } from '../db.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../../../../.env') });

async function addAiAnalysisColumn() {
  try {
    console.log('Adding ai_analysis column to properties table...');

    // Add the column
    await query(`
      ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
    `);

    console.log('✅ Column added successfully');

    // Add index
    await query(`
      CREATE INDEX IF NOT EXISTS properties_ai_analysis_idx
      ON properties USING GIN (ai_analysis);
    `);

    console.log('✅ Index created successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add column:', error);
    process.exit(1);
  }
}

addAiAnalysisColumn();
