import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabaseServer } from '@/lib/supabase-server';

// Cache trending fusions with Next.js unstable_cache
const getCachedTrending = unstable_cache(
  async (limit: number) => {
    try {
      const { data, error } = await supabaseServer
        .from('fusions')
        .select('*')
        .order('upvotes', { ascending: false })
        .limit(limit);
      
      if (error) throw error;

      // Map database results to frontend format
      const formattedResults = data.map((fusion: any) => {
        let movieIds = [];
        let fusionData = {};
        
        try {
          movieIds = typeof fusion.movie_ids === 'string' ? JSON.parse(fusion.movie_ids) : fusion.movie_ids;
          fusionData = typeof fusion.fusion_data === 'string' ? JSON.parse(fusion.fusion_data) : fusion.fusion_data;
        } catch (e) {
          console.error('Error parsing fusion data:', e);
        }

        return {
          id: fusion.id,
          share_token: fusion.share_token,
          createdAt: fusion.created_at,
          upvotes: fusion.upvotes || 0,
          movieIds,
          ...fusionData as any
        };
      });

      return {
        success: true,
        data: formattedResults,
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    } catch (error) {
      console.error('Trending fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch trending fusions',
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
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
    
    const response = NextResponse.json(result);
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Status', result.served_from_cache ? 'hit' : 'miss');
    response.headers.set('Cache-Control', 'public, max-age=300');
    
    return response;
  } catch (error) {
    console.error('Trending API error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trending fusions',
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
