import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchTMDBWithCache, 
  storeTMDBResponse, 
  getTMDBCacheStats,
  rateLimiter 
} from '@/lib/tmdb-cache';
import { getCurrentTheme } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const startTime = Date.now();
  
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');
    
    // Validate path format (basic security check)
    if (!path || path.includes('..') || path.includes('//')) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // Get query parameters and theme
    const searchParams = request.nextUrl.searchParams;
    const theme = getCurrentTheme(request);
    
    // Check for force refresh parameter
    const forceRefresh = searchParams.has('refresh') && searchParams.get('refresh') === 'true';
    
    // Build full TMDB URL for cache key
    const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
    const tmdbUrl = new URL(`${TMDB_BASE_URL}/${path}`);
    
    // Copy query parameters (except refresh)
    const searchParamsCopy = new URLSearchParams(searchParams);
    searchParamsCopy.delete('refresh');
    
    searchParamsCopy.forEach((value, key) => {
      tmdbUrl.searchParams.set(key, value);
    });
    
    const fullUrl = tmdbUrl.toString();
    
    // Try to get from multi-layer cache
    try {
      const cacheResult = await fetchTMDBWithCache(fullUrl, theme, forceRefresh);
      
      if (cacheResult.data) {
        // Cache hit - return cached data
        const response = NextResponse.json(cacheResult.data);
        
        // Set cache headers
        response.headers.set('Cache-Control', 'public, max-age=300');
        response.headers.set('X-Cache-Layer', cacheResult.cacheLayer);
        response.headers.set('X-Cache-Hit', 'true');
        response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
        response.headers.set('X-TMDB-URL', path);
        
        // Rate limit headers
        response.headers.set('X-Rate-Limit-Limit', '40');
        response.headers.set('X-Rate-Limit-Remaining', cacheResult.rateLimitStatus.tokens.toString());
        response.headers.set('X-Rate-Limit-Reset', rateLimiter.getResetTime().toString());
        
        return response;
      }
    } catch (rateLimitError) {
      // Rate limit exceeded
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'TMDB API rate limit exceeded. Please try again in a few moments.',
          retry_after: 60,
        },
        { status: 429 }
      );
      
      response.headers.set('Retry-After', '60');
      response.headers.set('X-Rate-Limit-Limit', '40');
      response.headers.set('X-Rate-Limit-Remaining', '0');
      response.headers.set('X-Rate-Limit-Reset', rateLimiter.getResetTime().toString());
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      
      return response;
    }
    
    // Cache miss - fetch from TMDB API
    const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
    
    if (!TMDB_READ_TOKEN) {
      return NextResponse.json(
        { error: 'TMDB Read Token not configured' },
        { status: 500 }
      );
    }

    // Make request to TMDB
    const tmdbResponse = await fetch(fullUrl, {
      headers: {
        'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CineMash-AI/1.0',
      },
    });

    // Handle rate limiting from TMDB
    if (tmdbResponse.status === 429) {
      const retryAfter = tmdbResponse.headers.get('retry-after');
      const rateLimitResponse = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'TMDB API rate limit exceeded. Please try again in a few moments.',
          retry_after: retryAfter || 5,
        },
        { status: 429 }
      );
      
      if (retryAfter) {
        rateLimitResponse.headers.set('Retry-After', retryAfter);
      }
      
      rateLimitResponse.headers.set('X-Rate-Limit-Limit', '40');
      rateLimitResponse.headers.set('X-Rate-Limit-Remaining', '0');
      rateLimitResponse.headers.set('X-Rate-Limit-Reset', rateLimiter.getResetTime().toString());
      rateLimitResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      
      return rateLimitResponse;
    }

    // Handle other errors
    if (!tmdbResponse.ok) {
      const errorData = await tmdbResponse.json().catch(() => ({}));
      const errorResponse = NextResponse.json(
        {
          error: 'TMDB API Error',
          message: errorData.status_message || tmdbResponse.statusText,
          status_code: tmdbResponse.status,
        },
        { status: tmdbResponse.status }
      );
      
      errorResponse.headers.set('X-Cache-Layer', 'miss');
      errorResponse.headers.set('X-Cache-Hit', 'false');
      errorResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      errorResponse.headers.set('X-TMDB-URL', path);
      errorResponse.headers.set('X-Rate-Limit-Limit', '40');
      errorResponse.headers.set('X-Rate-Limit-Remaining', rateLimiter.getStatus().tokens.toString());
      errorResponse.headers.set('X-Rate-Limit-Reset', rateLimiter.getResetTime().toString());
      
      return errorResponse;
    }

    // Parse response data
    const data = await tmdbResponse.json();
    
    // Store in all cache layers (unless force refresh was used)
    if (!forceRefresh) {
      await storeTMDBResponse(fullUrl, data, theme);
    }
    
    // Return response with caching headers
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, max-age=3600');
    response.headers.set('X-Cache-Layer', 'miss');
    response.headers.set('X-Cache-Hit', 'false');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-TMDB-URL', path);
    
    // Copy important headers from TMDB response
    const importantHeaders = ['content-type', 'content-length', 'etag', 'last-modified'];
    importantHeaders.forEach(header => {
      const value = tmdbResponse.headers.get(header);
      if (value) {
        response.headers.set(header, value);
      }
    });
    
    // Rate limit headers
    response.headers.set('X-Rate-Limit-Limit', '40');
    response.headers.set('X-Rate-Limit-Remaining', rateLimiter.getStatus().tokens.toString());
    response.headers.set('X-Rate-Limit-Reset', rateLimiter.getResetTime().toString());
    
    return response;

  } catch (error) {
    console.error('TMDB Proxy Error:', error);
    
    const response = NextResponse.json(
      {
        error: 'TMDB API Error',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
    
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Rate-Limit-Limit', '40');
    response.headers.set('X-Rate-Limit-Remaining', rateLimiter.getStatus().tokens.toString());
    response.headers.set('X-Rate-Limit-Reset', rateLimiter.getResetTime().toString());
    
    return response;
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'POST requests not supported for TMDB proxy' },
    { status: 405 }
  );
}
