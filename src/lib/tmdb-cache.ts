import { unstable_cache } from 'next/cache';
import { supabaseServer } from '@/lib/supabase-server';
import crypto from 'crypto';

// Cache configuration
export interface TMDBCacheConfig {
  nextjsTTL: number; // Next.js fetch cache TTL (3600s)
  memoryTTL: number; // Memory cache TTL (300s)
  supabaseTTL: number; // Supabase cache TTL (3600s)
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

// Supabase cache operations
export async function getTMDBFromSupabase(cacheKey: string): Promise<any | null> {
  try {
    const { data, error } = await supabaseServer
      .from('tmdb_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      const entry = data[0];
      
      // Update access statistics
      await supabaseServer
        .from('tmdb_cache')
        .update({
          access_count: entry.access_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', entry.id);
      
      const responseData = typeof entry.response_data === 'string' 
        ? JSON.parse(entry.response_data) 
        : entry.response_data;
      
      logTMDBCacheEvent('tmdb_cache_hit', {
        cache_layer: 'supabase',
        cache_key: cacheKey,
        access_count: entry.access_count + 1
      });
      
      return responseData;
    }
    
    return null;
  } catch (error) {
    logTMDBCacheEvent('tmdb_cache_error', {
      cache_layer: 'supabase',
      cache_key: cacheKey,
      error: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))
    });
    return null;
  }
}

export async function setTMDBInSupabase(cacheKey: string, data: any, ttl: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    
    const { error } = await supabaseServer
      .from('tmdb_cache')
      .upsert({
        cache_key: cacheKey,
        response_data: JSON.stringify(data),
        expires_at: expiresAt,
        access_count: 1,
        last_accessed: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      });

    if (error) throw error;
    
    logTMDBCacheEvent('tmdb_cache_set', {
      cache_layer: 'supabase',
      cache_key: cacheKey,
      expires_at: expiresAt
    });
  } catch (error) {
    logTMDBCacheEvent('tmdb_cache_error', {
      cache_layer: 'supabase',
      cache_key: cacheKey,
      error: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))
    });
  }
}

// Multi-layer cache fetch
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
  
  // Layer 2: Check Supabase cache (unless force refresh)
  if (!forceRefresh) {
    const supabaseData = await getTMDBFromSupabase(cacheKey);
    if (supabaseData) {
      // Store in memory cache for faster future access
      memoryCache.set(cacheKey, supabaseData, 300); // 5 minutes
      
      const responseTime = Date.now() - startTime;
      logTMDBCacheEvent('tmdb_cache_hit', {
        cache_layer: 'supabase',
        cache_key: cacheKey,
        url,
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimitStatus.tokens
      });
      
      return {
        data: supabaseData,
        cacheLayer: 'supabase',
        rateLimitStatus
      };
    }
  }
  
  // Layer 3: Use Next.js unstable_cache (persistent across deployments)
  try {
    const cached = await unstable_cache(
      async () => {
        // This is where the actual TMDB API call would happen
        // We'll return null here and let the caller handle the API call
        return null;
      },
      [cacheKey],
      {
        revalidate: 3600, // 1 hour
        tags: ['tmdb']
      }
    )();
    
    if (cached && !forceRefresh) {
      // Store in lower layers
      memoryCache.set(cacheKey, cached, 300);
      await setTMDBInSupabase(cacheKey, cached, 3600);
      
      const responseTime = Date.now() - startTime;
      logTMDBCacheEvent('tmdb_cache_hit', {
        cache_layer: 'nextjs',
        cache_key: cacheKey,
        url,
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimitStatus.tokens
      });
      
      return {
        data: cached,
        cacheLayer: 'nextjs',
        rateLimitStatus
      };
    }
  } catch (error) {
    logTMDBCacheEvent('tmdb_cache_error', {
      cache_layer: 'nextjs',
      cache_key: cacheKey,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Layer 4: Cache miss - return null to indicate fresh fetch needed
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

// Store fresh TMDB response in all cache layers
export async function storeTMDBResponse(
  url: string,
  data: any,
  theme?: string
): Promise<void> {
  const cacheKey = generateTMDBCacheKey(url, theme);
  
  // Store in memory cache (5 minutes)
  memoryCache.set(cacheKey, data, 300);
  
  // Store in Supabase cache (1 hour)
  await setTMDBInSupabase(cacheKey, data, 3600);
  
  logTMDBCacheEvent('tmdb_cache_set', {
    cache_key: cacheKey,
    url,
    cache_layers: ['memory', 'supabase']
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

// Clean up expired entries
export async function cleanupTMDBCache(): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from('tmdb_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    logTMDBCacheEvent('tmdb_cache_cleanup', {
      expired_entries_removed: 'success'
    });
  } catch (error) {
    logTMDBCacheEvent('tmdb_cache_error', {
      operation: 'cleanup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export instances for direct access
export { memoryCache, rateLimiter };
