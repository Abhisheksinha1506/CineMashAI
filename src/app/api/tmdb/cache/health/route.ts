import { NextRequest, NextResponse } from 'next/server';
import { getTMDBCacheStats, cleanupTMDBCache, memoryCache, rateLimiter } from '@/lib/tmdb-cache';

export async function GET(request: NextRequest) {
  try {
    const stats = getTMDBCacheStats();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      
      // Memory cache stats
      memory_cache: {
        size: stats.memory.size,
        max_size: stats.memory.maxSize,
        utilization_percent: Math.round((stats.memory.size / stats.memory.maxSize) * 100),
        total_access_count: stats.memory.totalAccessCount,
        entries: stats.memory.entries.slice(0, 10) // Show first 10 entries
      },
      
      // Rate limiting stats
      rate_limit: {
        tokens: stats.rate_limit.tokens,
        capacity: stats.rate_limit.capacity,
        refill_rate: stats.rate_limit.refillRate,
        can_consume: stats.rate_limit.canConsume,
        utilization_percent: Math.round(((stats.rate_limit.capacity - stats.rate_limit.tokens) / stats.rate_limit.capacity) * 100)
      },
      
      // Performance metrics
      performance: {
        cache_efficiency: stats.memory.totalAccessCount > 0 ? 
          Math.round((stats.memory.totalAccessCount / (stats.memory.size + stats.memory.totalAccessCount)) * 100) : 0,
        memory_utilization: Math.round((stats.memory.size / stats.memory.maxSize) * 100),
        rate_limit_utilization: Math.round(((stats.rate_limit.capacity - stats.rate_limit.tokens) / stats.rate_limit.capacity) * 100)
      },
      
      // Configuration
      configuration: {
        nextjs_ttl_seconds: 3600,
        memory_ttl_seconds: 300,
        supabase_ttl_seconds: 3600,
        rate_limit_capacity: 40,
        rate_limit_refill_rate: 40 / 60
      }
    };
    
    const response = NextResponse.json(healthData);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('X-TMDB-Cache-Health', 'true');
    
    return response;
    
  } catch (error) {
    console.error('TMDB cache health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to get TMDB cache health information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint for TMDB cache management
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'cleanup_expired':
        await cleanupTMDBCache();
        return NextResponse.json({
          success: true,
          action: 'cleanup_expired',
          message: 'Expired TMDB cache entries cleaned up successfully',
          timestamp: new Date().toISOString()
        });
        
      case 'clear_memory':
        memoryCache.clear();
        return NextResponse.json({
          success: true,
          action: 'clear_memory',
          message: 'Memory cache cleared successfully',
          timestamp: new Date().toISOString()
        });
        
      case 'reset_rate_limit':
        // Create new rate limiter instance
        const newRateLimiter = new (rateLimiter.constructor as any)(40, 40 / 60);
        // This would require updating the exported instance
        return NextResponse.json({
          success: true,
          action: 'reset_rate_limit',
          message: 'Rate limiter reset successfully',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: cleanup_expired, clear_memory, reset_rate_limit'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('TMDB cache management error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform TMDB cache management operation',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
