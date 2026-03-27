import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { hashIP } from '@/lib/utils';
import { refineFusion } from '@/lib/groq';
import { invalidateFusionCache } from '@/lib/fusion-cache-simple';
import { enrichCastWithPhotos } from '@/lib/cast-enrichment';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    if (!body.shareToken || !body.message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: shareToken and message required' 
        },
        { status: 400 }
      );
    }

    const userId = hashIP(request);
    
    // Get existing fusion
    const { data: dbData, error: dbError } = await supabaseServer
      .from('fusions')
      .select('*')
      .eq('share_token', body.shareToken)
      .limit(1);
    if (dbError) throw dbError;
    const existingFusion = dbData?.[0];

    if (!existingFusion) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fusion not found' 
        },
        { status: 404 }
      );
    }

    // Parse existing fusion data
    let fusionData;
    let movieIds: number[] = [];
    try {
      fusionData = typeof existingFusion.fusion_data === 'string' ? JSON.parse(existingFusion.fusion_data) : existingFusion.fusion_data;
      movieIds = typeof existingFusion.movie_ids === 'string' ? JSON.parse(existingFusion.movie_ids) : existingFusion.movie_ids;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed fusion data' },
        { status: 500 }
      );
    }

    try {
      // Invalidate existing fusion cache before refinement
      await invalidateFusionCache(movieIds, undefined);
      
      // Call real AI refinement
      const refinedData = await refineFusion(fusionData, body.message, body.history || []);

      // Enrich cast with real headshots
      const enrichedCast = await enrichCastWithPhotos((refinedData as any).suggestedCast || []);
      
      const finalRefinedData = {
        ...refinedData,
        suggestedCast: enrichedCast,
        // Legacy compatibility
        suggested_cast: enrichedCast
      };

      // Update fusion with refined data
      await supabaseServer
        .from('fusions')
        .update({ fusion_data: JSON.stringify(finalRefinedData) })
        .eq('share_token', body.shareToken);

      const response = NextResponse.json({
        success: true,
        data: {
          ...finalRefinedData,
          shareToken: body.shareToken,
          aiMessage: `I've refined the fusion based on your request: "${body.message}"`,
        },
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      });
      
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Cache-Status', 'miss');
      response.headers.set('X-Cache-Invalidate', 'fusion');
      response.headers.set('Cache-Control', 'private, no-cache');
      
      return response;
    } catch (aiError: any) {
      console.error('AI Refinement Error:', aiError);
      const response = NextResponse.json(
        { success: false, error: aiError.message || 'AI refinement failed' },
        { status: 500 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }
  } catch (error) {
    console.error('Refine error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Failed to refine fusion' 
      },
      { status: 500 }
    );
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  }
}
