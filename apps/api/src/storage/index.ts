/**
 * Storage Factory
 * Returns the configured storage provider
 *
 * Usage:
 * - Set STORAGE_PROVIDER=local (default) for local file system
 * - Set STORAGE_PROVIDER=r2 for Cloudflare R2 (when implemented)
 */

import { StorageProvider } from './StorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
// import { CloudflareR2Provider } from './CloudflareR2Provider.js';

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 'local':
      storageInstance = new LocalStorageProvider();
      console.log('📁 Using Local File System Storage');
      break;

    case 'r2':
      throw new Error(
        'Cloudflare R2 not yet configured. Set STORAGE_PROVIDER=local or implement CloudflareR2Provider.'
      );
      // Uncomment when R2 is ready:
      // storageInstance = new CloudflareR2Provider();
      // console.log('☁️  Using Cloudflare R2 Storage');
      break;

    default:
      throw new Error(
        `Unknown storage provider: ${provider}. Use 'local' or 'r2'`
      );
  }

  return storageInstance;
}

// Re-export types
export * from './StorageProvider.js';
