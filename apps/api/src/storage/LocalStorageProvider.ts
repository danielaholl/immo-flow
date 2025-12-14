/**
 * Local Storage Provider
 * Stores files on local file system in /public/uploads/
 */

import { StorageProvider, UploadedFile, UploadedFileWithThumbnail, ImageVariant } from './StorageProvider.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { pdf } from 'pdf-to-img';

export class LocalStorageProvider extends StorageProvider {
  private uploadDir: string;
  private publicUrl: string;

  constructor() {
    super();
    // Store uploads in /public/uploads/ so Next.js can serve them
    this.uploadDir = path.join(process.cwd(), '../../public/uploads');
    this.publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Upload a single file without processing
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadedFile> {
    const folderPath = path.join(this.uploadDir, folder);
    await this.ensureDir(folderPath);

    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(folderPath, filename);

    await fs.writeFile(filepath, file.buffer);

    return {
      url: this.getPublicUrl(`${folder}/${filename}`),
      filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Upload an image with multiple variants (optimized)
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string
  ): Promise<ImageVariant> {
    const folderPath = path.join(this.uploadDir, folder);
    await this.ensureDir(folderPath);

    const baseFilename = uuidv4();

    // Process and save variants
    const variants = {
      original: `${baseFilename}-original.webp`,
      thumbnail: `${baseFilename}-thumb.webp`,
      medium: `${baseFilename}-medium.webp`,
      large: `${baseFilename}-large.webp`,
    };

    // Parallel processing for better performance
    await Promise.all([
      // Original (max 2000px, high quality)
      sharp(file.buffer)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(path.join(folderPath, variants.original)),

      // Thumbnail (400x300)
      sharp(file.buffer)
        .resize(400, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(path.join(folderPath, variants.thumbnail)),

      // Medium (800x600)
      sharp(file.buffer)
        .resize(800, 600, { fit: 'inside' })
        .webp({ quality: 85 })
        .toFile(path.join(folderPath, variants.medium)),

      // Large (1200x900)
      sharp(file.buffer)
        .resize(1200, 900, { fit: 'inside' })
        .webp({ quality: 85 })
        .toFile(path.join(folderPath, variants.large)),
    ]);

    return {
      original: this.getPublicUrl(`${folder}/${variants.original}`),
      thumbnail: this.getPublicUrl(`${folder}/${variants.thumbnail}`),
      medium: this.getPublicUrl(`${folder}/${variants.medium}`),
      large: this.getPublicUrl(`${folder}/${variants.large}`),
    };
  }

  /**
   * Upload multiple images
   */
  async uploadImages(
    files: Express.Multer.File[],
    folder: string
  ): Promise<ImageVariant[]> {
    // Process all images in parallel
    return Promise.all(
      files.map((file) => this.uploadImage(file, folder))
    );
  }

  /**
   * Delete a file
   */
  async deleteFile(url: string): Promise<void> {
    try {
      // Extract path from URL
      const urlPath = url.replace(this.publicUrl, '');
      const filepath = path.join(this.uploadDir, urlPath.replace('/uploads/', ''));
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw - file might not exist
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.deleteFile(url)));
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(filename: string): string {
    return `${this.publicUrl}/uploads/${filename}`;
  }

  /**
   * Upload a PDF file with first-page thumbnail generation
   */
  async uploadPdfWithThumbnail(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadedFileWithThumbnail> {
    const folderPath = path.join(this.uploadDir, folder);
    await this.ensureDir(folderPath);

    const baseFilename = uuidv4();
    const pdfFilename = `${baseFilename}.pdf`;
    const thumbFilename = `${baseFilename}-thumb.webp`;

    const pdfPath = path.join(folderPath, pdfFilename);
    const thumbPath = path.join(folderPath, thumbFilename);

    // Save original PDF
    await fs.writeFile(pdfPath, file.buffer);

    // Generate thumbnail from first page
    let thumbnailUrl: string | undefined;
    try {
      const document = await pdf(file.buffer, { scale: 1.5 });

      for await (const page of document) {
        // Process only the first page with Sharp
        await sharp(page)
          .resize(400, 300, { fit: 'cover' })
          .webp({ quality: 80 })
          .toFile(thumbPath);
        break; // Only need first page
      }

      // Check if thumbnail was created successfully
      await fs.access(thumbPath);
      thumbnailUrl = this.getPublicUrl(`${folder}/${thumbFilename}`);
    } catch (error) {
      console.error('[Storage] PDF thumbnail generation failed:', error);
      // Continue without thumbnail - not critical
    }

    return {
      url: this.getPublicUrl(`${folder}/${pdfFilename}`),
      filename: pdfFilename,
      size: file.size,
      mimetype: file.mimetype,
      thumbnailUrl,
    };
  }
}
