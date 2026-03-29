import { unstable_cache } from 'next/cache';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { getRedisClient, KEY_PREFIXES, isClusterMode, getTTL, sanitizeKey } from './redis';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Performance-optimized serialization system to reduce JSON overhead
 */
class SerializationPool {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private bufferPool: Buffer[] = [];
  private maxPoolSize = 10;

  getBuffer(size: number): Buffer {
    const buffer = this.bufferPool.pop() || Buffer.allocUnsafe(size);
    return buffer.length < size ? Buffer.allocUnsafe(size) : buffer;
  }

  returnBuffer(buffer: Buffer) {
    if (this.bufferPool.length < this.maxPoolSize) {
      this.bufferPool.push(buffer);
    }
  }

  // Optimized serialization for common data types
  serialize(data: any): string | Buffer {
    // Fast path for primitives
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return data;
    if (typeof data === 'number') return data.toString();
    if (typeof data === 'boolean') return data ? 'true' : 'false';
    
    // For objects, use optimized JSON
    try {
      const json = JSON.stringify(data);
      return json.length < 2048 ? json : this.compressString(json);
    } catch (error) {
      console.warn('[Serialization] Failed to serialize data:', error);
      return '{}';
    }
  }

  deserialize(data: string | Buffer): any {
    if (data instanceof Buffer) {
      try {
        const decompressed = this.decompressBuffer(data);
        return JSON.parse(decompressed);
      } catch {
        // Fallback to string parsing
        return JSON.parse(this.decoder.decode(data));
      }
    }
    
    // Fast path for common primitives
    if (data === 'null') return null;
    if (data === 'true') return true;
    if (data === 'false') return false;
    if (!isNaN(Number(data)) && data.toString().trim() !== '') return Number(data);
    
    try {
      return JSON.parse(data.toString());
    } catch (error) {
      console.warn('[Serialization] Failed to deserialize data:', error);
      return null;
    }
  }

  private compressString(str: string): Buffer {
    const buffer = this.getBuffer(str.length);
    try {
      const compressed = zlib.gzipSync(str, { level: 6 });
      this.returnBuffer(buffer);
      return compressed;
    } catch (error) {
      this.returnBuffer(buffer);
      return Buffer.from(str);
    }
  }

  private decompressBuffer(buffer: Buffer): string {
    try {
      const decompressed = zlib.gunzipSync(buffer);
      return this.decoder.decode(decompressed);
    } catch {
      return this.decoder.decode(buffer);
    }
  }
}

const serializationPool = new SerializationPool();

/**
 * cache.ts
 * 
 * Optimized 3-tier caching system:
 * 1. InMemoryCache (Primary - Node Local, fastest)
 * 2. Redis (Secondary - Distributed, scalable)
 * 3. Database (Tertiary - Persistent storage)
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
 * Optimized data compression using pooling for better performance
 */
async function compressData(data: any): Promise<Buffer | string> {
  return serializationPool.serialize(data);
}

/**
 * Optimized data decompression with error handling
 */
async function decompressData(data: any): Promise<any> {
  return serializationPool.deserialize(data);
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
  
  // Optimized cache key generation with minimal JSON usage
  const hashInput = Object.keys(sortedParams)
    .sort()
    .map(k => `${k}:${sortedParams[k]}`)
    .join('|');
  
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  const themeSuffix = theme ? `:${theme}` : '';
  
  // Resolve prefix from KEY_PREFIXES if available
  const p = (KEY_PREFIXES as any)[prefix] || `${prefix}:`;
  return sanitizeKey(`${p}${hash}${themeSuffix}`);
}

/**
 * Optimized 3-tier Cache Fetcher (Memory → Redis → Database)
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

  // 1. Memory Hit? (Fastest)
  const memHit = memoryCache.get<T>(themeAwareKey);
  if (memHit) {
    return memHit;
  }

  // 2. Redis Hit? (Medium speed)
  try {
    const isFusion = key.startsWith(KEY_PREFIXES.FUSION) || key.startsWith('FUSION');
    let result: any;
    
    if (isFusion) {
      const field = theme || 'default';
      result = await redis.hget(themeAwareKey, field);
    } else {
      result = await redis.getBuffer(themeAwareKey);
    }
    
    if (result) {
      const data = await decompressData(result);
      memoryCache.set(themeAwareKey, data, config.ttl);
      return data;
    }
  } catch (err) {
    console.warn('[Cache] Redis Get (Non-Fatal):', err instanceof Error ? err.message : err);
  }

  // 3. Database fetch (Slowest - fallback)
  const freshData = await fetcher();

  // Populate both cache layers asynchronously
  try {
    const optimized = await compressData(freshData);
    const isFusion = key.startsWith(KEY_PREFIXES.FUSION) || key.startsWith('FUSION');
    
    if (isFusion) {
      const field = theme || 'default';
      await redis.hset(themeAwareKey, field, optimized);
      await redis.expire(themeAwareKey, config.ttl);
    } else {
      await redis.set(themeAwareKey, optimized, 'EX', config.ttl);
    }
  } catch (err) {
    console.warn('[Cache] Redis Set (Non-Fatal):', err instanceof Error ? err.message : err);
  }

  // Always populate memory cache
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
  TOKEN_USAGE: { ttl: getTTL('TOKEN_BUDGET'), tags: ['token_usage'], compress: false },
};

export function getCacheStats() {
  const stats = memoryCache.getStats();
  return { memory: { size: stats.size, maxSize: stats.maxSize, entries: [] as any[] } };
}

export async function invalidateCache(tags: string[]) {
  memoryCache.clear();
  // Additional Redis tag sweeping can be implemented via SCAN if needed.
}

export { memoryCache, serializationPool };
