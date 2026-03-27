import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';

// Simplified fusion cache entry interface
interface FusionCacheSimpleEntry {
  id: string;
  cache_key: string;
  fusion_data: any;
  expires_at: string;
  hit_count: number;
  created_at: string;
}

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
  
  // Generate SHA-256 hash
  const inputString = JSON.stringify(fusionInput);
  return crypto.createHash('sha256').update(inputString).digest('hex');
}

// Get cached fusion from Supabase
export async function getCachedFusion(
  movieIds: number[],
  constraints?: string
): Promise<{ data: any; cacheAge: number; hitCount: number } | null> {
  const cacheKey = generateFusionCacheKey(movieIds, constraints);
  
  try {
    const { data, error } = await supabaseServer
      .from('fusion_cache_simple')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      const entry = data[0];
      
      // Update hit count and last accessed time
      await supabaseServer
        .from('fusion_cache_simple')
        .update({ 
          hit_count: entry.hit_count + 1
        })
        .eq('id', entry.id);
      
      // Parse fusion data
      const fusionData = typeof entry.fusion_data === 'string' 
        ? JSON.parse(entry.fusion_data) 
        : entry.fusion_data;
      
      // Calculate cache age in seconds
      const cacheAge = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 1000);
      
      return {
        data: fusionData,
        cacheAge,
        hitCount: entry.hit_count + 1
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached fusion:', error);
    return null;
  }
}

// Cache fusion result in Supabase
export async function cacheFusion(
  movieIds: number[],
  constraints: string | undefined,
  fusionData: any
): Promise<void> {
  const cacheKey = generateFusionCacheKey(movieIds, constraints);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  
  try {
    const { error } = await supabaseServer
      .from('fusion_cache_simple')
      .upsert({
        cache_key: cacheKey,
        fusion_data: JSON.stringify(fusionData),
        expires_at: expiresAt.toISOString(),
        hit_count: 1
      }, {
        onConflict: 'cache_key'
      });

    if (error) throw error;
    
    console.log(`Fusion cached with key: ${cacheKey.substring(0, 8)}...`);
  } catch (error) {
    console.error('Error caching fusion:', error);
  }
}

// Invalidate fusion cache (called on refinement)
export async function invalidateFusionCache(
  movieIds: number[],
  constraints?: string
): Promise<void> {
  const cacheKey = generateFusionCacheKey(movieIds, constraints);
  
  try {
    const { error } = await supabaseServer
      .from('fusion_cache_simple')
      .delete()
      .eq('cache_key', cacheKey);

    if (error) throw error;
    
    console.log(`Fusion cache invalidated: ${cacheKey.substring(0, 8)}...`);
  } catch (error) {
    console.error('Error invalidating fusion cache:', error);
  }
}

// Get fusion cache statistics
export async function getFusionCacheStats(): Promise<any> {
  try {
    const { data, error } = await supabaseServer
      .from('fusion_cache_simple')
      .select('id, cache_key, hit_count, created_at, expires_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const now = new Date();
    const stats = {
      totalEntries: data?.length || 0,
      activeEntries: data?.filter(entry => new Date(entry.expires_at) > now).length || 0,
      expiredEntries: data?.filter(entry => new Date(entry.expires_at) <= now).length || 0,
      totalHits: data?.reduce((sum, entry) => sum + entry.hit_count, 0) || 0,
      averageHits: data?.length ? (data.reduce((sum, entry) => sum + entry.hit_count, 0) / data.length) : 0,
      oldestEntry: data?.[0]?.created_at || null,
      newestEntry: data?.[data.length - 1]?.created_at || null,
      entries: data?.slice(0, 10).map(entry => ({
        cacheKey: entry.cache_key.substring(0, 8) + '...',
        hitCount: entry.hit_count,
        createdAt: entry.created_at,
        expiresAt: entry.expires_at,
        isExpired: new Date(entry.expires_at) <= now
      })) || []
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting fusion cache stats:', error);
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
}

// Clean up expired fusion cache entries
export async function cleanupExpiredFusionCache(): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from('fusion_cache_simple')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    console.log('Cleaned up expired fusion cache entries');
  } catch (error) {
    console.error('Error cleaning up fusion cache:', error);
  }
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
export function getCacheAge(createdAt: string): number {
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
