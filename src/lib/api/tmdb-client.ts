import { Movie, TMDBResponse } from '@/types';

/**
 * Client-side TMDB utility that calls our internal Next.js API proxy
 * to avoid exposing TMDB_READ_TOKEN in the browser.
 * Enhanced with cache refresh support and error handling.
 */

interface TMDBClientOptions {
  refresh?: boolean; // Force cache refresh
  timeout?: number; // Request timeout in ms
}

async function fetchInternalTMDB(
  path: string, 
  params: Record<string, any> = {},
  options: TMDBClientOptions = {},
  retryCount = 0
): Promise<any> {
  const queryParams = new URLSearchParams(params);
  
  // Add refresh parameter if requested
  if (options.refresh) {
    queryParams.set('refresh', 'true');
  }
  
  const queryString = queryParams.toString();
  const url = `/api/tmdb/${path}${queryString ? `?${queryString}` : ''}`;
  
  const controller = new AbortController();
  const timeoutMs = options.timeout || 15000; // Increased default to 15s
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    // Log cache information for debugging
    const cacheLayer = response.headers.get('X-Cache-Layer');
    const cacheHit = response.headers.get('X-Cache-Hit');
    const responseTime = response.headers.get('X-Response-Time');
    const rateLimitRemaining = response.headers.get('X-Rate-Limit-Remaining');
    
    if (cacheLayer && responseTime) {
      console.log(`TMDB Cache: ${cacheLayer}, Hit: ${cacheHit}, Time: ${responseTime}, Rate Limit Remaining: ${rateLimitRemaining}`);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limit specifically
      if (response.status === 429) {
        const retryAfter = errorData.retry_after || response.headers.get('Retry-After') || '60';
        throw new Error(`TMDB rate limit exceeded. Please try again in ${retryAfter} seconds.`);
      }
      
      throw new Error(`TMDB Proxy error: ${response.status} - ${errorData.message || response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Retry logic for timeouts or network errors
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const maxRetries = 2;
    
    if (retryCount < maxRetries && (isTimeout || error instanceof TypeError)) {
      const backoffMs = Math.pow(2, retryCount) * 1000;
      console.warn(`TMDB fetch failed (${isTimeout ? 'timeout' : 'network'}). Retrying in ${backoffMs}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return fetchInternalTMDB(path, params, options, retryCount + 1);
    }
    
    if (error instanceof Error) {
      if (isTimeout) {
        throw new Error('TMDB request timeout. Please check your connection and try again.');
      }
      throw error;
    }
    
    throw new Error('Unknown TMDB client error');
  }
}

export async function searchMovies(
  query: string, 
  page = 1, 
  options: TMDBClientOptions = {}
): Promise<TMDBResponse> {
  if (!query.trim()) {
    return {
      results: [],
      page: 1,
      total_pages: 0,
      total_results: 0,
    };
  }
  
  return fetchInternalTMDB('search/movie', { 
    query, 
    page: page.toString(),
    include_adult: 'false'
  }, options);
}

export async function getPopularMovies(
  page = 1, 
  options: TMDBClientOptions = {}
): Promise<TMDBResponse> {
  return fetchInternalTMDB('movie/popular', { 
    page: page.toString()
  }, options);
}

export async function getMovieDetails(
  movieId: string, 
  options: TMDBClientOptions = {}
): Promise<Movie> {
  return fetchInternalTMDB(`movie/${movieId}`, {}, options);
}

export async function getMovieCredits(
  movieId: string, 
  options: TMDBClientOptions = {}
): Promise<any> {
  return fetchInternalTMDB(`movie/${movieId}/credits`, {}, options);
}

export function getMoviePosterUrl(posterPath: string | null, size = 'w500'): string {
  if (!posterPath) return '/placeholder-movie.png';
  // Note: Internal proxy doesn't proxy images, we go direct for public assets
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

// Utility function to force refresh cached TMDB data
export async function refreshTMDBData<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    console.error('TMDB refresh failed:', error);
    throw error;
  }
}

// Batch fetch multiple TMDB requests with cache refresh option
export async function batchFetchTMDB<T>(
  requests: Array<{ path: string; params?: Record<string, any> }>,
  options: TMDBClientOptions = {}
): Promise<T[]> {
  const promises = requests.map(({ path, params = {} }) => 
    fetchInternalTMDB(path, params, options)
  );
  
  return Promise.all(promises);
}

// Get TMDB cache statistics (client-side estimate)
export function getTMDBClientStats(): {
  lastRequestTime: number;
  requestCount: number;
  errorCount: number;
} {
  // This would be implemented with client-side state management
  // For now, return placeholder data
  return {
    lastRequestTime: Date.now(),
    requestCount: 0,
    errorCount: 0
  };
}
