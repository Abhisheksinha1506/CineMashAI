import { getRedisClient, KEY_PREFIXES } from './redis';
import crypto from 'crypto';
import { serializationPool } from './cache';

// Simplified cache configuration for 3-tier system
export interface TMDBCacheConfig {
  memoryTTL: number; // Memory cache TTL (300s)
  redisTTL: number; // Redis cache TTL (3600s)
  maxMemoryEntries: number;
}

// Cache entry interface
interface TMDBCacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

// Rate limiting token bucket
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private capacity: number;
  private refillRate: number;

  constructor(capacity: number = 40, refillRate: number = 40 / 60) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    
    // Refill tokens based on elapsed time
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  getStatus() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate,
      canConsume: this.tokens >= 1
    };
  }

  getResetTime(): number {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    const tokensNeeded = Math.max(0, 1 - this.tokens);
    const secondsToReset = Math.ceil(tokensNeeded / this.refillRate);
    return Math.floor(now / 1000) + secondsToReset;
  }
}

// In-memory cache with LRU eviction
class TMDBMemoryCache {
  private cache = new Map<string, TMDBCacheEntry>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU() {
    if (this.cache.size >= this.maxSize) {
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  set(key: string, data: any, ttl: number) {
    this.cleanupExpired();
    this.evictLRU();
    
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl * 1000,
      accessCount: 1,
      lastAccessed: now
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      isExpired: now > entry.expiresAt
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries,
      totalAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0)
    };
  }
}

// Global instances
const memoryCache = new TMDBMemoryCache(200);
const rateLimiter = new TokenBucket(40, 40 / 60); // 40 requests per minute

// Generate cache key for full URL
export function generateTMDBCacheKey(url: string, theme?: string): string {
  const themeSuffix = theme ? `:${theme}` : '';
  const hash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
  return `tmdb:${hash}${themeSuffix}`;
}

// Structured logging
function logTMDBCacheEvent(event: string, data: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    event,
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
}

// Redis cache operations (replacing Supabase)
export async function getTMDBFromRedis(cacheKey: string): Promise<any | null> {
  try {
    const redis = getRedisClient();
    const result = await redis.getBuffer(cacheKey);
    
    if (result) {
      const data = serializationPool.deserialize(result);
      
      logTMDBCacheEvent('tmdb_cache_hit', {
        cache_layer: 'redis',
        cache_key: cacheKey
      });
      
      return data;
    }
    
    return null;
  } catch (error) {
    logTMDBCacheEvent('tmdb_cache_error', {
      cache_layer: 'redis',
      cache_key: cacheKey,
      error: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))
    });
    return null;
  }
}

export async function setTMDBInRedis(cacheKey: string, data: any, ttl: number): Promise<void> {
  try {
    const redis = getRedisClient();
    const serialized = serializationPool.serialize(data);
    await redis.set(cacheKey, serialized, 'EX', ttl);
    
    logTMDBCacheEvent('tmdb_cache_set', {
      cache_layer: 'redis',
      cache_key: cacheKey
    });
  } catch (error) {
    logTMDBCacheEvent('tmdb_cache_error', {
      cache_layer: 'redis',
      cache_key: cacheKey,
      error: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))
    });
  }
}

// Optimized 3-tier TMDB cache fetch (Memory → Redis → Database)
export async function fetchTMDBWithCache(
  url: string,
  theme?: string,
  forceRefresh: boolean = false
): Promise<{ data: any; cacheLayer: string; rateLimitStatus: any }> {
  const startTime = Date.now();
  const cacheKey = generateTMDBCacheKey(url, theme);
  const rateLimitStatus = rateLimiter.getStatus();
  
  // Check rate limiting first
  if (!forceRefresh && !rateLimiter.consume()) {
    logTMDBCacheEvent('tmdb_rate_limit_exceeded', {
      cache_key: cacheKey,
      url,
      rate_limit_status: rateLimitStatus
    });
    
    throw new Error('TMDB rate limit exceeded. Please try again later.');
  }
  
  // Layer 1: Check memory cache (unless force refresh)
  if (!forceRefresh) {
    const memoryData = memoryCache.get(cacheKey);
    if (memoryData) {
      const responseTime = Date.now() - startTime;
      logTMDBCacheEvent('tmdb_cache_hit', {
        cache_layer: 'memory',
        cache_key: cacheKey,
        url,
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimitStatus.tokens
      });
      
      return {
        data: memoryData,
        cacheLayer: 'memory',
        rateLimitStatus
      };
    }
  }
  
  // Layer 2: Check Redis cache (unless force refresh)
  if (!forceRefresh) {
    const redisData = await getTMDBFromRedis(cacheKey);
    if (redisData) {
      // Store in memory cache for faster future access
      memoryCache.set(cacheKey, redisData, 300); // 5 minutes
      
      const responseTime = Date.now() - startTime;
      logTMDBCacheEvent('tmdb_cache_hit', {
        cache_layer: 'redis',
        cache_key: cacheKey,
        url,
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimitStatus.tokens
      });
      
      return {
        data: redisData,
        cacheLayer: 'redis',
        rateLimitStatus
      };
    }
  }
  
  // Layer 3: Cache miss - return null to indicate fresh fetch needed
  const responseTime = Date.now() - startTime;
  logTMDBCacheEvent('tmdb_cache_miss', {
    cache_key: cacheKey,
    url,
    response_time_ms: responseTime,
    rate_limit_remaining: rateLimitStatus.tokens
  });
  
  return {
    data: null,
    cacheLayer: 'miss',
    rateLimitStatus
  };
}

// Store fresh TMDB response in cache layers
export async function storeTMDBResponse(
  url: string,
  data: any,
  theme?: string
): Promise<void> {
  const cacheKey = generateTMDBCacheKey(url, theme);
  
  // Store in memory cache (5 minutes)
  memoryCache.set(cacheKey, data, 300);
  
  // Store in Redis cache (1 hour)
  await setTMDBInRedis(cacheKey, data, 3600);
  
  logTMDBCacheEvent('tmdb_cache_set', {
    cache_key: cacheKey,
    url,
    cache_layers: ['memory', 'redis']
  });
}

// Get cache statistics
export function getTMDBCacheStats() {
  return {
    memory: memoryCache.getStats(),
    rate_limit: rateLimiter.getStatus(),
    timestamp: Date.now()
  };
}

// Clean up expired entries (Redis handles TTL natively)
export async function cleanupTMDBCache(): Promise<void> {
  // Redis handles TTL expiration automatically
  logTMDBCacheEvent('tmdb_cache_cleanup', {
    expired_entries_removed: 'handled_by_redis_ttl'
  });
}

// Export instances for direct access
export { memoryCache, rateLimiter };
