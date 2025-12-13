/**
 * Redis Client Setup
 * Two-tier caching: L1 (In-Memory) + L2 (Redis)
 */
import Redis from 'ioredis';

// Create Redis client
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Gracefully handle connection errors
  lazyConnect: true,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (error) => {
  console.warn('⚠️  Redis error (caching disabled):', error.message);
  // Don't exit - continue with DB fallback
});

redis.on('ready', () => {
  console.log('🚀 Redis ready for caching');
});

// Connect to Redis (but don't fail if unavailable)
redis.connect().catch((err) => {
  console.warn('⚠️  Redis connection failed (caching disabled):', err.message);
});

// Helper functions for cache operations
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.warn(`Redis get error for key ${key}:`, error);
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.warn(`Redis set error for key ${key}:`, error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.warn(`Redis delete error for key ${key}:`, error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn(`Redis invalidate pattern error for ${pattern}:`, error);
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    console.log('👋 Redis connection closed');
  } catch (error) {
    console.warn('Redis close error:', error);
  }
}
