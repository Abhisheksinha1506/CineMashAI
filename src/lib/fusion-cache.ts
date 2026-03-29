import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { cachedFetch, CACHE_CONFIGS, generateCacheKey } from './cache';

// Fusion cache entry interface
interface FusionCacheEntry {
  id: string;
  cache_key: string;
  movie_ids: string;
  constraints: string;
  fusion_data: any;
  expires_at: Date;
  created_at: Date;
  access_count: number;
  last_accessed: Date;
}

// Generate hash for fusion request
export function generateFusionHash(
  movieIds: number[],
  constraints?: string
): string {
  const normalizedMovieIds = [...movieIds].sort((a, b) => a - b);
  const fusionInput = {
    movieIds: normalizedMovieIds,
    constraints: constraints || ''
  };
  
  const inputString = JSON.stringify(fusionInput);
  return crypto.createHash('sha256').update(inputString).digest('hex').substring(0, 32);
}

// Get cached fusion from Supabase
export async function getCachedFusion(
  movieIds: number[],
  constraints?: string,
  theme?: string
): Promise<any | null> {
  const hash = generateFusionHash(movieIds, constraints);
  const cacheKey = generateCacheKey('fusion', { hash, movieIds, constraints }, theme);
  
  try {
    // Try memory cache first
    const cached = await cachedFetch(
      cacheKey,
      async () => {
        // Check Supabase cache
        const { data, error } = await supabaseServer
          .from('fusion_cache')
          .select('*')
          .eq('cache_key', hash)
          .gt('expires_at', new Date().toISOString())
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          const entry = data[0];
          
          // Update access statistics
          await supabaseServer
            .from('fusion_cache')
            .update({
              access_count: entry.access_count + 1,
              last_accessed: new Date().toISOString()
            })
            .eq('id', entry.id);
          
          // Parse fusion data
          const fusionData = typeof entry.fusion_data === 'string' 
            ? JSON.parse(entry.fusion_data) 
            : entry.fusion_data;
            
          return fusionData;
        }
        
        return null;
      },
      CACHE_CONFIGS.FUSION_GENERATION
    );
    
    return cached;
  } catch (error) {
    console.error('Error getting cached fusion:', error);
    return null;
  }
}

// Cache fusion result in Supabase and memory
export async function cacheFusion(
  movieIds: number[],
  constraints: string | undefined,
  fusionData: any,
  theme?: string
): Promise<void> {
  const hash = generateFusionHash(movieIds, constraints);
  const cacheKey = generateCacheKey('fusion', { hash, movieIds, constraints }, theme);
  
  try {
    // Store in Supabase
    const { error } = await supabaseServer
      .from('fusion_cache')
      .upsert({
        cache_key: hash,
        movie_ids: JSON.stringify(movieIds.sort((a, b) => a - b)),
        constraints: constraints || '',
        fusion_data: JSON.stringify(fusionData),
        expires_at: new Date(Date.now() + CACHE_CONFIGS.FUSION_GENERATION.ttl * 1000).toISOString(),
        access_count: 1,
        last_accessed: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      });

    if (error) throw error;
    
    // The memory cache will be automatically populated by the cachedFetch function
    // when the data is retrieved next time
    
  } catch (error) {
    console.error('Error caching fusion:', error);
  }
}

// Invalidate fusion cache (called on refinement)
export async function invalidateFusionCache(
  movieIds: number[],
  constraints?: string
): Promise<void> {
  const hash = generateFusionHash(movieIds, constraints);
  
  try {
    // Remove from Supabase
    const { error } = await supabaseServer
      .from('fusion_cache')
      .delete()
      .eq('cache_key', hash);

    if (error) throw error;
    
    // Invalidate Next.js cache
    const { invalidateCache } = await import('./cache');
    await invalidateCache(['fusion']);
    
  } catch (error) {
    console.error('Error invalidating fusion cache:', error);
  }
}

// Clean up expired fusion cache entries
export async function cleanupExpiredFusionCache(): Promise<void> {
  try {
    const { error } = await supabaseServer
      .from('fusion_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    console.log('Cleaned up expired fusion cache entries');
  } catch (error) {
    console.error('Error cleaning up fusion cache:', error);
  }
}

// Get fusion cache statistics
export async function getFusionCacheStats(): Promise<any> {
  try {
    const { data, error } = await supabaseServer
      .from('fusion_cache')
      .select('id, cache_key, access_count, created_at, last_accessed, expires_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const now = new Date();
    const stats = {
      totalEntries: data?.length || 0,
      activeEntries: data?.filter((entry: any) => new Date(entry.expires_at) > now).length || 0,
      expiredEntries: data?.filter((entry: any) => new Date(entry.expires_at) <= now).length || 0,
      totalAccessCount: data?.reduce((sum: number, entry: any) => sum + entry.access_count, 0) || 0,
      averageAccessCount: data?.length ? (data.reduce((sum: number, entry: any) => sum + entry.access_count, 0) / data.length) : 0,
      oldestEntry: data?.[0]?.created_at || null,
      newestEntry: data?.[data.length - 1]?.created_at || null,
      entries: data?.slice(0, 10).map((entry: any) => ({
        cacheKey: entry.cache_key,
        accessCount: entry.access_count,
        createdAt: entry.created_at,
        lastAccessed: entry.last_accessed,
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
      totalAccessCount: 0,
      averageAccessCount: 0,
      oldestEntry: null,
      newestEntry: null,
      entries: []
    };
  }
}

// Check if fusion should be cached based on request characteristics
export function shouldCacheFusion(
  movieIds: number[],
  constraints?: string
): boolean {
  // Don't cache very simple requests or those with highly specific constraints
  if (constraints && constraints.length > 500) {
    return false;
  }
  
  // Always cache standard fusion requests
  return true;
}

// Fusion cache middleware for API routes
export function withFusionCache(
  handler: (movieIds: number[], constraints?: string, theme?: string) => Promise<any>
) {
  return async (movieIds: number[], constraints?: string, theme?: string): Promise<any> => {
    // Check if we should use cache
    if (!shouldCacheFusion(movieIds, constraints)) {
      return handler(movieIds, constraints, theme);
    }
    
    // Try to get from cache first
    const cached = await getCachedFusion(movieIds, constraints, theme);
    if (cached) {
      return {
        ...cached,
        _cached: true,
        _cacheHit: true
      };
    }
    
    // Generate new fusion
    const result = await handler(movieIds, constraints, theme);
    
    // Cache the result
    await cacheFusion(movieIds, constraints, result, theme);
    
    return {
      ...result,
      _cached: true,
      _cacheHit: false
    };
  };
}
