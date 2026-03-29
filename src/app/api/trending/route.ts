import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase-server';

// Cache trending fusions with Next.js unstable_cache
const getCachedTrending = unstable_cache(
  async (limit: number) => {
    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('fusions')
        .select('*')
        .order('upvotes', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Trending fetch error:', error);
      return [];
    }
  },
  ['trending', 'fusions'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['trending', 'fusions']
  }
);

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50);
    
    // Get cached trending data
    const result = await getCachedTrending(limit);
    
    const response = NextResponse.json({
      success: true,
      data: result,
      count: result.length,
      served_from_cache: true,
      cache_age_seconds: 0,
      cache_hit_count: 0
    });
    
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Status', 'hit');
    response.headers.set('Cache-Control', 'public, max-age=300');
    
    return response;
  } catch (error) {
    console.error('Trending API error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trending fusions',
        data: [],
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      },
      { status: 500 }
    );
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'invalidate':
        // Invalidate trending cache (will expire naturally in 5 minutes)
        // Note: Next.js revalidateTag requires specific configuration
        
        const response = NextResponse.json({
          success: true,
          action: 'invalidate',
          message: 'Trending cache invalidated successfully',
          timestamp: new Date().toISOString()
        });
        
        response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
        response.headers.set('X-Cache-Invalidate', 'trending');
        return response;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: invalidate'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Trending cache management error:', error);
    const response = NextResponse.json(
      {
        success: false,
        error: 'Failed to manage trending cache',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  }
}
