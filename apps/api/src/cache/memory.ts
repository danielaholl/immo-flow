/**
 * In-Memory L1 Cache with LRU Eviction
 * Fast, short-lived cache for frequently accessed data
 * Features:
 * - Maximum size limit to prevent memory exhaustion
 * - LRU (Least Recently Used) eviction policy
 * - TTL-based expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
}

// L1 Cache with TTL management and LRU eviction
class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // in milliseconds
  private maxSize: number; // Maximum number of entries
  private hits: number = 0;
  private misses: number = 0;

  constructor(defaultTTL: number = 60 * 1000, maxSize: number = 1000) {
    // Default: 1 minute TTL, 1000 max entries
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;

    // Cleanup expired entries every 30 seconds
    setInterval(() => this.cleanup(), 30000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update last accessed time for LRU
    entry.lastAccessed = Date.now();
    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Evict if at capacity (before adding new entry)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      lastAccessed: now,
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
    this.hits = 0;
    this.misses = 0;
  }

  // Evict the least recently used entry
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
      console.log(`[L1 Cache] Evicted LRU entry: ${(oldestKey as string).substring(0, 30)}...`);
    }
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

  getStats(): { size: number; maxSize: number; hits: number; misses: number; hitRate: string; entries: string[] } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : 'N/A';
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instances for different cache types
export const feedCache = new MemoryCache(60 * 1000); // 1 minute TTL for feeds
export const trendingCache = new MemoryCache(5 * 60 * 1000); // 5 minutes TTL for trending
export const userPrefsCache = new MemoryCache(10 * 60 * 1000); // 10 minutes TTL for user preferences

console.log('✅ In-memory L1 caches initialized');
