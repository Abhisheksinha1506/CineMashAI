import crypto from 'crypto';
import { getRedisClient, KEY_PREFIXES, sanitizeKey } from './redis';
import { memoryCache, CACHE_CONFIGS } from './cache';
import { generateShareToken } from './ai-server';
import { serializationPool } from './cache';

// Generate theme-agnostic cache key for fusion request
export function generateFusionCacheKey(
  movieIds: number[],
  constraints?: string
): string {
  // Sort movie IDs to ensure consistent cache keys regardless of order
  const normalizedMovieIds = [...movieIds].sort((a, b) => a - b);
  
  // Create cache input (theme-agnostic)
  const fusionInput = {
    movieIds: normalizedMovieIds,
    constraints: constraints || ''
  };
  
  // Optimized hash generation without JSON.stringify
  const hashInput = `ids:${normalizedMovieIds.join(',')}|constraints:${constraints || ''}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  return sanitizeKey(`${KEY_PREFIXES.FUSION}${hash}`);
}

// Get cached fusion from Redis/Memory with optimized serialization
export async function getCachedFusion(
  movieIds: number[],
  constraints?: string
): Promise<{ data: any; cacheAge: number; hitCount: number } | null> {
  const cacheKey = generateFusionCacheKey(movieIds, constraints);
  
  try {
    // 1. Memory Hit?
    const memHit = memoryCache.get<any>(cacheKey);
    if (memHit) {
      memHit.hitCount = (memHit.hitCount || 0) + 1;
      return {
        data: memHit.data,
        cacheAge: Math.floor((Date.now() - memHit.createdAt) / 1000),
        hitCount: memHit.hitCount
      };
    }

    // 2. Redis Hit?
    const redis = getRedisClient();
    const result = await redis.get(cacheKey);
    if (result) {
      const entry = serializationPool.deserialize(result);
      
      entry.hitCount = (entry.hitCount || 0) + 1;
      
      // Update hit count in Redis asynchronously
      redis.set(cacheKey, serializationPool.serialize(entry), 'KEEPTTL').catch(() => {});
      
      // Populate Memory
      memoryCache.set(cacheKey, entry, CACHE_CONFIGS.FUSION_GENERATION.ttl);
      
      return {
        data: entry.data,
        cacheAge: Math.floor((Date.now() - entry.createdAt) / 1000),
        hitCount: entry.hitCount
      };
    }
    
    return null;
  } catch (error) {
    console.warn('[FusionCache] Redis Access (Non-Fatal):', error instanceof Error ? error.message : error);
    return null;
  }
}

// Cache fusion result in Redis/Memory with optimized serialization
export async function cacheFusion(
  movieIds: number[],
  constraints: string | undefined,
  fusionData: any,
  shareToken?: string
): Promise<void> {
  const cacheKey = generateFusionCacheKey(movieIds, constraints);
  
  const entry = {
    data: {
      ...fusionData,
      share_token: shareToken || generateShareToken()
    },
    createdAt: Date.now(),
    hitCount: 1
  };
  
  try {
    memoryCache.set(cacheKey, entry, CACHE_CONFIGS.FUSION_GENERATION.ttl);
    
    const redis = getRedisClient();
    await redis.set(
      cacheKey, 
      serializationPool.serialize(entry), 
      'EX', 
      CACHE_CONFIGS.FUSION_GENERATION.ttl
    );
    
    console.log(`Fusion cached with key: ${cacheKey.substring(0, 15)}...`);
  } catch (error) {
    console.warn('[FusionCache] Redis Store (Non-Fatal):', error instanceof Error ? error.message : error);
  }
}

// Invalidate fusion cache (called on refinement)
export async function invalidateFusionCache(
  movieIds: number[],
  constraints?: string
): Promise<void> {
  const cacheKey = generateFusionCacheKey(movieIds, constraints);
  
  try {
    memoryCache.delete(cacheKey);
    const redis = getRedisClient();
    await redis.del(cacheKey);
    
    console.log(`Fusion cache invalidated: ${cacheKey.substring(0, 15)}...`);
  } catch (error) {
    console.warn('[FusionCache] Redis Invalidate (Non-Fatal):', error instanceof Error ? error.message : error);
  }
}

// Get fusion cache statistics (mocked since pure Redis doesn't iterate well)
export async function getFusionCacheStats(): Promise<any> {
    return {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      totalHits: 0,
      averageHits: 0,
      oldestEntry: null,
      newestEntry: null,
      entries: []
    };
}

// Clean up expired fusion cache entries (Auto handled by Redis)
export async function cleanupExpiredFusionCache(): Promise<void> {
  // Redis handles TTL expiration natively
}

// Check if fusion should be cached based on request characteristics
export function shouldCacheFusion(
  movieIds: number[],
  constraints?: string
): boolean {
  // Don't cache very complex constraints (might be highly specific)
  if (constraints && constraints.length > 500) {
    return false;
  }
  
  // Always cache standard fusion requests (2-4 movies, reasonable constraints)
  return movieIds.length >= 2 && movieIds.length <= 4;
}

// Get cache age in seconds for a given cache entry
export function getCacheAge(createdAt: string | number): number {
  if (typeof createdAt === 'number') {
    return Math.floor((Date.now() - createdAt) / 1000);
  }
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
}

// Fusion cache middleware for API routes
export function withFusionCache(
  handler: (movieIds: number[], constraints?: string) => Promise<any>
) {
  return async (movieIds: number[], constraints?: string): Promise<any> => {
    // Check if we should use cache for this request
    if (!shouldCacheFusion(movieIds, constraints)) {
      return handler(movieIds, constraints);
    }
    
    // Try to get from cache first
    const cached = await getCachedFusion(movieIds, constraints);
    if (cached) {
      return {
        ...cached.data,
        _servedFromCache: true,
        _cacheAgeSeconds: cached.cacheAge,
        _cacheHitCount: cached.hitCount
      };
    }
    
    // Generate new fusion
    const result = await handler(movieIds, constraints);
    
    // Cache the result
    await cacheFusion(movieIds, constraints, result);
    
    return {
      ...result,
      _servedFromCache: false,
      _cacheAgeSeconds: 0,
      _cacheHitCount: 0
    };
  };
}
