import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, invalidateCache } from '@/lib/cache';
import { getFusionCacheStats, cleanupExpiredFusionCache } from '@/lib/fusion-cache';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get memory cache stats
    const memoryStats = getCacheStats();
    
    // Get fusion cache stats
    const fusionStats = await getFusionCacheStats();
    
    // Get database connection health
    let dbHealth = 'unknown';
    let dbLatency = 0;
    
    try {
      const dbStart = Date.now();
      const { error } = await supabaseServer
        .from('fusion_cache')
        .select('count')
        .limit(1);
      dbLatency = Date.now() - dbStart;
      dbHealth = error ? 'error' : 'healthy';
    } catch (error) {
      dbHealth = 'error';
    }
    
    // Calculate total cache size estimates
    const memorySizeBytes = memoryStats.memory.entries.reduce((total, entry) => {
      return total + JSON.stringify(entry).length * 2; // Rough estimate
    }, 0);
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      
      // Memory cache stats
      memory_cache: {
        size: memoryStats.memory.size,
        max_size: memoryStats.memory.maxSize,
        utilization_percent: Math.round((memoryStats.memory.size / memoryStats.memory.maxSize) * 100),
        estimated_size_bytes: memorySizeBytes,
        entries: memoryStats.memory.entries.slice(0, 5) // Show first 5 entries
      },
      
      // Fusion cache stats
      fusion_cache: {
        total_entries: fusionStats.totalEntries,
        active_entries: fusionStats.activeEntries,
        expired_entries: fusionStats.expiredEntries,
        utilization_percent: fusionStats.totalEntries > 0 ? 
          Math.round((fusionStats.activeEntries / fusionStats.totalEntries) * 100) : 0,
        total_access_count: fusionStats.totalAccessCount,
        average_access_count: Math.round(fusionStats.averageAccessCount * 100) / 100,
        oldest_entry: fusionStats.oldestEntry,
        newest_entry: fusionStats.newestEntry,
        recent_entries: fusionStats.entries.slice(0, 5)
      },
      
      // Database health
      database: {
        status: dbHealth,
        latency_ms: dbLatency
      },
      
      // Performance metrics
      performance: {
        cache_hit_ratio: fusionStats.totalAccessCount > 0 ? 
          Math.round((fusionStats.totalAccessCount / (fusionStats.totalAccessCount + fusionStats.totalEntries)) * 100) : 0,
        memory_efficiency: memorySizeBytes > 0 ? 
          Math.round((memoryStats.memory.size / (memorySizeBytes / 1024)) * 100) / 100 : 0
      },
      
      // Cache configuration
      configuration: {
        tmdb_ttl_seconds: 3600,
        fusion_ttl_seconds: 1800,
        gallery_ttl_seconds: 300,
        rate_limit_ttl_seconds: 60,
        memory_max_entries: 200
      }
    };
    
    // Add cache control headers
    const response = NextResponse.json(healthData);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('X-Cache-Health', 'true');
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    
    return response;
    
  } catch (error) {
    console.error('Cache health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to get cache health information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for cache management operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'cleanup_expired':
        const deletedCount = await cleanupExpiredFusionCache();
        return NextResponse.json({
          success: true,
          action: 'cleanup_expired',
          deleted_entries: deletedCount,
          timestamp: new Date().toISOString()
        });
        
      case 'invalidate_all':
        await invalidateCache(['tmdb', 'fusion', 'gallery', 'ratelimit', 'tokens', 'trending']);
        return NextResponse.json({
          success: true,
          action: 'invalidate_all',
          timestamp: new Date().toISOString()
        });
        
      case 'invalidate_tag':
        const { tag } = body;
        if (!tag) {
          return NextResponse.json({
            success: false,
            error: 'Tag is required for invalidate_tag action'
          }, { status: 400 });
        }
        
        await invalidateCache([tag]);
        return NextResponse.json({
          success: true,
          action: 'invalidate_tag',
          tag,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: cleanup_expired, invalidate_all, invalidate_tag'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Cache management error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform cache management operation',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
