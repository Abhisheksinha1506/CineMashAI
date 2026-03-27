import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { unstable_cache } from 'next/cache';

// Cache fusion by share token for 1 hour
const getCachedFusionByToken = unstable_cache(
  async (shareToken: string) => {
    try {
      const { data: dbData, error: dbError } = await supabaseServer
        .from('fusions')
        .select('*')
        .eq('share_token', shareToken)
        .limit(1);
      if (dbError) throw dbError;
      const fusion = dbData?.[0];

      if (!fusion) {
        return {
          success: false,
          error: 'Fusion not found',
          served_from_cache: false,
          cache_age_seconds: 0,
          cache_hit_count: 0
        };
      }

      // Parse fusion data
      let fusionData;
      try {
        fusionData = typeof fusion.fusion_data === 'string' ? JSON.parse(fusion.fusion_data) : fusion.fusion_data;
      } catch {
        fusionData = {};
      }

      return {
        success: true,
        data: {
          id: fusion.id,
          shareToken: fusion.share_token,
          movieIds: typeof fusion.movie_ids === 'string' ? JSON.parse(fusion.movie_ids) : fusion.movie_ids,
          fusionData,
          createdAt: fusion.created_at,
          upvotes: fusion.upvotes || 0,
        },
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    } catch (error) {
      console.error('Fusion fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch fusion',
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    }
  },
  ['fusion', 'share-token'],
  { 
    revalidate: 3600, // 1 hour
    tags: ['fusion', 'share-token']
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { shareToken } = await params;
    
    // Get cached fusion data
    const result = await getCachedFusionByToken(shareToken);
    
    const response = NextResponse.json(result);
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Status', result.served_from_cache ? 'hit' : 'miss');
    response.headers.set('Cache-Control', 'public, max-age=3600');
    
    return response;
  } catch (error) {
    console.error('Fusion fetch error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch fusion',
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
