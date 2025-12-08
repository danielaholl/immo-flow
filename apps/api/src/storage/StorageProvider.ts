/**
 * Storage Provider Interface
 * Abstract interface for different storage backends (Local, Cloudflare R2, AWS S3, etc.)
 */

export interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface ImageVariant {
  original: string;
  thumbnail: string; // 400x300
  medium: string; // 800x600
  large: string; // 1200x900
}

export abstract class StorageProvider {
  /**
   * Upload a single file
   */
  abstract uploadFile(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadedFile>;

  /**
   * Upload an image with multiple variants (thumbnail, medium, large)
   */
  abstract uploadImage(
    file: Express.Multer.File,
    folder: string
  ): Promise<ImageVariant>;

  /**
   * Upload multiple images
   */
  abstract uploadImages(
    files: Express.Multer.File[],
    folder: string
  ): Promise<ImageVariant[]>;

  /**
   * Delete a file
   */
  abstract deleteFile(url: string): Promise<void>;

  /**
   * Delete multiple files
   */
  abstract deleteFiles(urls: string[]): Promise<void>;

  /**
   * Get public URL for a file
   */
  abstract getPublicUrl(filename: string): string;
}
