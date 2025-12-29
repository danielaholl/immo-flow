/**
 * Fix Property Images
 * Assigns random local images to properties in the database
 */

import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rendito',
  user: 'postgres',
  password: 'postgres',
});

const PUBLIC_URL = 'http://localhost:3000';
const UPLOADS_DIR = join(__dirname, '../../public', 'uploads', 'properties');

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function linkImages() {
  console.log('🔗 Assigning local images to properties...\n');

  try {
    // Get all properties with empty images
    const { rows: properties } = await pool.query(
      `SELECT id, title, images FROM properties
       WHERE images IS NULL OR array_length(images, 1) IS NULL OR array_length(images, 1) = 0
       ORDER BY created_at DESC`
    );

    console.log(`📊 Found ${properties.length} properties without images\n`);

    if (properties.length === 0) {
      console.log('✅ All properties already have images!');
      return;
    }

    // Get all original image files
    const files = readdirSync(UPLOADS_DIR);
    const originalImages = files
      .filter(file => file.endsWith('-original.webp'))
      .map(file => `${PUBLIC_URL}/uploads/properties/${file}`);

    console.log(`📁 Found ${originalImages.length} available images\n`);

    if (originalImages.length === 0) {
      console.log('❌ No images found in uploads directory!');
      return;
    }

    // Shuffle images for random assignment
    const shuffledImages = shuffleArray(originalImages);
    let imageIndex = 0;

    // Assign 3-4 random images to each property
    for (const property of properties) {
      const numImages = 3 + Math.floor(Math.random() * 2); // 3 or 4 images
      const propertyImages = [];

      for (let i = 0; i < numImages; i++) {
        propertyImages.push(shuffledImages[imageIndex % shuffledImages.length]);
        imageIndex++;
      }

      // Update property with images
      await pool.query(
        'UPDATE properties SET images = $1 WHERE id = $2',
        [propertyImages, property.id]
      );

      console.log(`✅ ${property.title}`);
      console.log(`   Assigned ${propertyImages.length} images\n`);
    }

    console.log('\n============================');
    console.log('✅ Image assignment completed!');
    console.log(`   Updated ${properties.length} properties`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

linkImages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
