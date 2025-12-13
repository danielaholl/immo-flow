/**
 * In-Memory L1 Cache
 * Fast, short-lived cache for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// L1 Cache with TTL management
class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // in milliseconds

  constructor(defaultTTL: number = 60 * 1000) {
    // Default: 1 minute
    this.cache = new Map();
    this.defaultTTL = defaultTTL;

    // Cleanup expired entries every 30 seconds
    setInterval(() => this.cleanup(), 30000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // If custom TTL provided, set automatic deletion
    if (ttl !== undefined) {
      setTimeout(() => this.cache.delete(key), ttl);
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Remove expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.defaultTTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[L1 Cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  getSize(): number {
    return this.cache.size;
  }

  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instances for different cache types
export const feedCache = new MemoryCache(60 * 1000); // 1 minute TTL for feeds
export const trendingCache = new MemoryCache(5 * 60 * 1000); // 5 minutes TTL for trending
export const userPrefsCache = new MemoryCache(10 * 60 * 1000); // 10 minutes TTL for user preferences

console.log('✅ In-memory L1 caches initialized');
