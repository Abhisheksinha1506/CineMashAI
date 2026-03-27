import { unstable_cache } from 'next/cache';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { getRedisClient, KEY_PREFIXES, isClusterMode, getTTL, sanitizeKey } from './redis';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * cache.ts
 * 
 * Multi-layer caching system:
 * 1. InMemoryCache (Primary - Node Local)
 * 2. Next.js unstable_cache (Secondary - Shared Fetch Cache)
 * 3. Redis (Tertiary - Distributed, Scalable, Hardened)
 */

export interface CacheConfig {
  ttl: number; // Seconds
  maxSize?: number; // In-memory
  tags?: string[];
  compress?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Low-level memory cache
class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number) {
    const now = Date.now();
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: now, expiresAt: now + ttl * 1000 });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  delete(key: string) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
  getStats() { return { size: this.cache.size, maxSize: this.maxSize }; }
}

const memoryCache = new InMemoryCache(200);

/**
 * Helper: Compresses large JSON strings to save Redis memory.
 */
async function compressData(data: any): Promise<Buffer | string> {
  const json = JSON.stringify(data);
  if (json.length < 2048) return json;
  return gzip(json);
}

/**
 * Helper: Decompresses Redis data.
 */
async function decompressData(data: any): Promise<any> {
  if (typeof data === 'string') return JSON.parse(data);
  const decompressed = await gunzip(data);
  return JSON.parse(decompressed.toString());
}

/**
 * Get current theme from request headers or default.
 */
export function getCurrentTheme(request?: Request): string {
  if (request) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      if (cookies.theme === 'dark' || cookies.theme === 'light') {
        return cookies.theme;
      }
    }
  }
  return 'light';
}

/**
 * Generates a consistent, prefixed, and theme-aware cache key.
 * Now includes security sanitization for all keys.
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, any>,
  theme?: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((res, k) => { res[k] = params[k]; return res; }, {} as Record<string, any>);
  
  const hash = crypto.createHash('sha256').update(JSON.stringify(sortedParams)).digest('hex').substring(0, 16);
  const themeSuffix = theme ? `:${theme}` : '';
  
  // Resolve prefix from KEY_PREFIXES if available
  const p = (KEY_PREFIXES as any)[prefix] || `${prefix}:`;
  return sanitizeKey(`${p}${hash}${themeSuffix}`);
}

/**
 * Unified Cache Fetcher with Redis Integration.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig,
  request?: Request
): Promise<T> {
  const theme = getCurrentTheme(request);
  const themeAwareKey = key.includes(':') ? key : `${key}:${theme}`;
  const redis = getRedisClient();

  // 1. Memory Hit?
  const memHit = memoryCache.get<T>(themeAwareKey);
  if (memHit) return memHit;

  // 2. Redis Hit?
  try {
    const isFusion = key.startsWith(KEY_PREFIXES.FUSION) || key.startsWith('FUSION');
    if (isFusion) {
      const field = theme || 'default';
      const result = await redis.hget(themeAwareKey, field);
      if (result) {
        const data = await decompressData(result);
        memoryCache.set(themeAwareKey, data, config.ttl);
        return data;
      }
    } else {
      const result = await redis.getBuffer(themeAwareKey);
      if (result) {
        const data = await decompressData(result);
        memoryCache.set(themeAwareKey, data, config.ttl);
        return data;
      }
    }
  } catch (err) {
    console.warn('[Cache] Redis Get Error:', err);
  }

  // 3. Next.js Persistence Layer
  const freshData = await unstable_cache(
    async () => {
      const data = await fetcher();
      return data;
    },
    [themeAwareKey],
    { revalidate: config.ttl, tags: config.tags }
  )();

  // Populate Redis Asynchronously
  try {
    const optimized = config.compress !== false ? await compressData(freshData) : JSON.stringify(freshData);
    const isFusion = key.startsWith(KEY_PREFIXES.FUSION) || key.startsWith('FUSION');
    if (isFusion) {
      const field = theme || 'default';
      await redis.hset(themeAwareKey, field, optimized);
      await redis.expire(themeAwareKey, config.ttl);
    } else {
      await redis.set(themeAwareKey, optimized, 'EX', config.ttl);
    }
  } catch (err) {
    console.warn('[Cache] Redis Set Error:', err);
  }

  // Populate Memory
  memoryCache.set(themeAwareKey, freshData, config.ttl);

  return freshData;
}

export function withCache<T>(
  key: string,
  config: CacheConfig,
  handler: (request?: Request) => Promise<T>
) {
  return async (request?: Request): Promise<T> => {
    return cachedFetch(key, () => handler(request), config, request);
  };
}

export const CACHE_CONFIGS = {
  TMDB_API: { ttl: getTTL('TMDB'), tags: ['tmdb'] },
  FUSION_GENERATION: { ttl: getTTL('FUSION'), tags: ['fusion'], compress: true },
  GALLERY_QUERY: { ttl: getTTL('GALLERY'), tags: ['gallery'] },
  RATE_LIMIT: { ttl: getTTL('RATE'), tags: ['ratelimit'], compress: false },
};

export { memoryCache };
