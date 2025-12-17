/**
 * Cloudflare R2 Storage Provider (STUB - für später)
 *
 * Setup:
 * 1. Install: pnpm add @aws-sdk/client-s3
 * 2. Set env vars:
 *    - R2_ACCOUNT_ID
 *    - R2_ACCESS_KEY_ID
 *    - R2_SECRET_ACCESS_KEY
 *    - R2_BUCKET_NAME
 *    - R2_PUBLIC_URL
 * 3. Uncomment code below
 */

import {
  StorageProvider,
  UploadedFile,
  UploadedFileWithThumbnail,
  ImageVariant,
  VideoUploadResult,
} from './StorageProvider.js';

export class CloudflareR2Provider extends StorageProvider {
  constructor() {
    super();
    throw new Error('CloudflareR2Provider not yet implemented. Use LocalStorageProvider for now.');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<UploadedFile> {
    throw new Error('Not implemented');
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<ImageVariant> {
    throw new Error('Not implemented');
  }

  async uploadImages(files: Express.Multer.File[], folder: string): Promise<ImageVariant[]> {
    throw new Error('Not implemented');
  }

  async deleteFile(url: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async deleteFiles(urls: string[]): Promise<void> {
    throw new Error('Not implemented');
  }

  getPublicUrl(filename: string): string {
    throw new Error('Not implemented');
  }

  async uploadPdfWithThumbnail(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadedFileWithThumbnail> {
    throw new Error('Not implemented');
  }

  uploadVideo(file: Express.Multer.File, folder: string): Promise<VideoUploadResult> {
    // @ts-ignore
    return Promise.resolve({ url: '', fileName: '', size: '', mimeType: '' });
  }
}

/*
 * IMPLEMENTATION EXAMPLE (uncomment when ready):
 *
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export class CloudflareR2Provider extends StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    super();

    this.bucketName = process.env.R2_BUCKET_NAME!;
    this.publicUrl = process.env.R2_PUBLIC_URL!;

    // R2 is S3-compatible
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string
  ): Promise<UploadedFile> {
    const ext = file.originalname.split('.').pop();
    const filename = `${folder}/${uuidv4()}.${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    return {
      url: this.getPublicUrl(filename),
      filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string
  ): Promise<ImageVariant> {
    const baseFilename = uuidv4();

    // Process variants
    const [original, thumbnail, medium, large] = await Promise.all([
      sharp(file.buffer).resize(2000, 2000, { fit: 'inside' }).webp({ quality: 90 }).toBuffer(),
      sharp(file.buffer).resize(400, 300, { fit: 'cover' }).webp({ quality: 80 }).toBuffer(),
      sharp(file.buffer).resize(800, 600, { fit: 'inside' }).webp({ quality: 85 }).toBuffer(),
      sharp(file.buffer).resize(1200, 900, { fit: 'inside' }).webp({ quality: 85 }).toBuffer(),
    ]);

    // Upload all variants in parallel
    const variants = {
      original: `${folder}/${baseFilename}-original.webp`,
      thumbnail: `${folder}/${baseFilename}-thumb.webp`,
      medium: `${folder}/${baseFilename}-medium.webp`,
      large: `${folder}/${baseFilename}-large.webp`,
    };

    await Promise.all([
      this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: variants.original,
        Body: original,
        ContentType: 'image/webp',
      })),
      this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: variants.thumbnail,
        Body: thumbnail,
        ContentType: 'image/webp',
      })),
      this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: variants.medium,
        Body: medium,
        ContentType: 'image/webp',
      })),
      this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: variants.large,
        Body: large,
        ContentType: 'image/webp',
      })),
    ]);

    return {
      original: this.getPublicUrl(variants.original),
      thumbnail: this.getPublicUrl(variants.thumbnail),
      medium: this.getPublicUrl(variants.medium),
      large: this.getPublicUrl(variants.large),
    };
  }

  async uploadImages(
    files: Express.Multer.File[],
    folder: string
  ): Promise<ImageVariant[]> {
    return Promise.all(files.map(file => this.uploadImage(file, folder)));
  }

  async deleteFile(url: string): Promise<void> {
    const key = url.replace(this.publicUrl + '/', '');
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async deleteFiles(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.deleteFile(url)));
  }

  getPublicUrl(filename: string): string {
    return `${this.publicUrl}/${filename}`;
  }
}
*/
