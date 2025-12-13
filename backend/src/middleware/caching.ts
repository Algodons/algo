/**
 * Caching Middleware
 * Multi-layer caching for API responses and database queries
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';

// In-memory cache (L1)
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private maxSize: number;

  constructor(maxSizeMB: number = 100) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number): void {
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, { data, expiry });
    this.evictIfNeeded();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictIfNeeded(): void {
    // Simple LRU eviction
    const currentSize = this.getSize();
    if (currentSize > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  private getSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.data).length;
    }
    return size;
  }
}

// Initialize caches
const memoryCache = new MemoryCache(100); // 100MB L1 cache
let redisClient: Redis | null = null;

// Initialize Redis client
export function initializeRedisCache(): void {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (error) => {
      console.error('Redis cache error:', error);
    });

    redisClient.on('connect', () => {
      console.log('Redis cache connected');
    });
  } catch (error) {
    console.error('Failed to initialize Redis cache:', error);
  }
}

// Cache configuration
interface CacheConfig {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  varyBy?: string[]; // Request properties to include in cache key
  condition?: (req: Request) => boolean; // Conditional caching
  compress?: boolean; // Compress cached data
}

/**
 * Generate cache key based on request
 */
function generateCacheKey(
  req: Request,
  prefix: string = 'api',
  varyBy: string[] = ['url', 'query', 'user']
): string {
  const parts: string[] = [prefix];

  if (varyBy.includes('url')) {
    parts.push(req.originalUrl || req.url);
  }

  if (varyBy.includes('method')) {
    parts.push(req.method);
  }

  if (varyBy.includes('query')) {
    const queryString = JSON.stringify(req.query);
    parts.push(crypto.createHash('md5').update(queryString).digest('hex'));
  }

  if (varyBy.includes('user') && req.user) {
    parts.push(`user:${(req.user as any).id}`);
  }

  if (varyBy.includes('headers')) {
    const headers = JSON.stringify(req.headers);
    parts.push(crypto.createHash('md5').update(headers).digest('hex'));
  }

  return parts.join(':');
}

/**
 * Get data from cache (checks L1, then L2)
 */
async function getFromCache(key: string): Promise<any | null> {
  // Check L1 (memory cache)
  const memoryData = memoryCache.get(key);
  if (memoryData !== null) {
    return memoryData;
  }

  // Check L2 (Redis cache)
  if (redisClient) {
    try {
      const redisData = await redisClient.get(key);
      if (redisData) {
        const parsed = JSON.parse(redisData);
        // Populate L1 cache
        memoryCache.set(key, parsed, 300); // 5 min in L1
        return parsed;
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }
  }

  return null;
}

/**
 * Set data in cache (L1 and L2)
 */
async function setInCache(key: string, data: any, ttl: number): Promise<void> {
  // Set in L1 (memory cache)
  const l1Ttl = Math.min(ttl, 300); // Max 5 minutes in memory
  memoryCache.set(key, data, l1Ttl);

  // Set in L2 (Redis cache)
  if (redisClient) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
}

/**
 * Invalidate cache entries by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  // Clear matching entries from memory cache
  if (pattern.includes('*')) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of Array.from(memoryCache['cache'].keys())) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.delete(pattern);
  }

  // Clear from Redis
  if (redisClient) {
    try {
      if (pattern.includes('*')) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        await redisClient.del(pattern);
      }
    } catch (error) {
      console.error('Redis invalidation error:', error);
    }
  }
}

/**
 * API Response Caching Middleware
 */
export function cacheMiddleware(config: CacheConfig = {}) {
  const {
    ttl = 60, // Default 1 minute
    prefix = 'api',
    varyBy = ['url', 'query'],
    condition = (req: Request) => req.method === 'GET',
    compress = false,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition not met
    if (!condition(req)) {
      return next();
    }

    const cacheKey = generateCacheKey(req, prefix, varyBy);

    try {
      // Check cache
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Cache miss - intercept response
      res.set('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (data: any): Response {
        // Cache the response
        setInCache(cacheKey, data, ttl).catch((error) =>
          console.error('Cache set error:', error)
        );

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Database Query Result Caching
 */
export class QueryCache {
  private prefix = 'db:query';

  /**
   * Get cached query result
   */
  async get(query: string, params: any[] = []): Promise<any | null> {
    const key = this.generateKey(query, params);
    return getFromCache(key);
  }

  /**
   * Cache query result
   */
  async set(
    query: string,
    params: any[],
    result: any,
    ttl: number = 300
  ): Promise<void> {
    const key = this.generateKey(query, params);
    await setInCache(key, result, ttl);
  }

  /**
   * Invalidate query cache by table
   */
  async invalidateTable(tableName: string): Promise<void> {
    const pattern = `${this.prefix}:*${tableName}*`;
    await invalidateCache(pattern);
  }

  /**
   * Invalidate all query cache
   */
  async invalidateAll(): Promise<void> {
    await invalidateCache(`${this.prefix}:*`);
  }

  /**
   * Generate cache key for query
   */
  private generateKey(query: string, params: any[]): string {
    const normalizedQuery = query.trim().toLowerCase();
    const paramsHash = crypto
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
    const queryHash = crypto
      .createHash('md5')
      .update(normalizedQuery)
      .digest('hex');

    return `${this.prefix}:${queryHash}:${paramsHash}`;
  }

  /**
   * Check if query should be cached
   */
  shouldCache(query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    // Don't cache queries with certain keywords
    const excludeKeywords = [
      'random()',
      'now()',
      'current_timestamp',
      'uuid_generate',
    ];

    for (const keyword of excludeKeywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        return false;
      }
    }

    // Only cache SELECT queries
    if (!normalizedQuery.startsWith('select')) {
      return false;
    }

    // Don't cache realtime tables
    if (
      normalizedQuery.includes('realtime_') ||
      normalizedQuery.includes('live_')
    ) {
      return false;
    }

    return true;
  }
}

/**
 * Cache statistics
 */
export async function getCacheStats(): Promise<any> {
  const stats: any = {
    memory: {
      size: memoryCache['cache'].size,
      enabled: true,
    },
    redis: {
      enabled: false,
      connected: false,
    },
  };

  if (redisClient) {
    stats.redis.enabled = true;
    try {
      const info = await redisClient.info('stats');
      stats.redis.connected = true;
      stats.redis.info = info;
    } catch (error) {
      stats.redis.error = (error as Error).message;
    }
  }

  return stats;
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  memoryCache.clear();

  if (redisClient) {
    try {
      await redisClient.flushdb();
    } catch (error) {
      console.error('Redis flush error:', error);
    }
  }
}

// Export cache instances
export const queryCache = new QueryCache();
