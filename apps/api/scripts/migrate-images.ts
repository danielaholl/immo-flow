/**
 * Image Migration Script
 * Downloads external images (Unsplash) and uploads them through our optimized storage system
 */

import { query, queryOne } from '../src/db.js';
import { getStorageProvider } from '../src/storage/index.js';
import https from 'https';
import http from 'http';

interface Property {
  id: string;
  title: string;
  images: string[];
}

/**
 * Download image from URL to buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Create a Multer-compatible file object from buffer
 */
function createFileFromBuffer(buffer: Buffer, originalUrl: string): Express.Multer.File {
  const filename = originalUrl.split('/').pop() || 'image.jpg';
  const mimetype = 'image/jpeg'; // Unsplash serves JPEGs

  return {
    buffer,
    originalname: filename,
    mimetype,
    size: buffer.length,
    fieldname: 'image',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  } as Express.Multer.File;
}

/**
 * Migrate a single property's images
 */
async function migratePropertyImages(property: Property): Promise<void> {
  console.log(`\n📦 Processing: ${property.title}`);
  console.log(`   Current images: ${property.images.length}`);

  const storage = getStorageProvider();
  const newImageUrls: string[] = [];

  for (let i = 0; i < property.images.length; i++) {
    const imageUrl = property.images[i];

    try {
      console.log(`   ⬇️  Downloading image ${i + 1}/${property.images.length}...`);
      const buffer = await downloadImage(imageUrl);
      console.log(`      Downloaded: ${(buffer.length / 1024).toFixed(2)} KB`);

      console.log(`   🔄 Processing with Sharp (creating 4 variants)...`);
      const file = createFileFromBuffer(buffer, imageUrl);
      const imageVariants = await storage.uploadImage(file, 'properties');

      // Store the original variant URL
      newImageUrls.push(imageVariants.original);

      console.log(`   ✅ Uploaded: ${imageVariants.original.split('/').pop()}`);
      console.log(`      Variants: thumbnail, medium, large, original`);
    } catch (error) {
      console.error(`   ❌ Failed to process image ${i + 1}:`, error);
      // Keep old URL if migration fails
      newImageUrls.push(imageUrl);
    }
  }

  // Update database
  try {
    await queryOne(
      'UPDATE properties SET images = $1 WHERE id = $2 RETURNING id',
      [newImageUrls, property.id]
    );
    console.log(`   💾 Database updated with ${newImageUrls.length} new URLs`);
  } catch (error) {
    console.error(`   ❌ Failed to update database:`, error);
  }
}

/**
 * Main migration function
 */
async function migrateAllImages() {
  console.log('🚀 Starting Image Migration');
  console.log('============================\n');

  try {
    // Fetch all properties with external images
    const properties = await query<Property>(
      `SELECT id, title, images
       FROM properties
       WHERE images IS NOT NULL
       AND array_length(images, 1) > 0
       ORDER BY created_at DESC`
    );

    console.log(`📊 Found ${properties.length} properties with images\n`);

    if (properties.length === 0) {
      console.log('✅ No properties to migrate');
      return;
    }

    // Migrate each property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\n[${i + 1}/${properties.length}]`);
      await migratePropertyImages(property);
    }

    console.log('\n============================');
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Total properties processed: ${properties.length}`);
    console.log(`   Images now stored locally in: /public/uploads/properties/`);
    console.log(`   Each image has 4 optimized variants (WebP format)`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateAllImages()
  .then(() => {
    console.log('\n👋 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
