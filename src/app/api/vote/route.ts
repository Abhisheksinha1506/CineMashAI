import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { hashIP } from '@/lib/utils';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    if (!body.shareToken || !body.voteType || !['up', 'down'].includes(body.voteType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: shareToken and voteType (up/down) required' 
        },
        { status: 400 }
      );
    }

    const userId = hashIP(request);
    
    // Check if user already voted
    const { data: existingVote, error: voteError } = await supabaseServer
      .from('fusion_votes')
      .select('*')
      .eq('fusion_id', body.shareToken)
      .eq('ip_hash', userId)
      .limit(1);
    if (voteError) throw voteError;

    if (existingVote.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You have already voted for this fusion' 
        },
        { status: 400 }
      );
    }

    // Get current fusion
    const { data: fusionData, error: fusionError } = await supabaseServer
      .from('fusions')
      .select('*')
      .eq('share_token', body.shareToken)
      .limit(1);
    if (fusionError) throw fusionError;
    const currentFusion = fusionData?.[0];

    if (!currentFusion) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fusion not found' 
        },
        { status: 404 }
      );
    }

    // Record vote
    await supabaseServer.from('fusion_votes').insert({
      id: crypto.randomUUID(),
      fusion_id: body.shareToken,
      vote_type: body.voteType as 'up' | 'down',
      ip_hash: userId,
      created_at: new Date().toISOString(),
    });

    // Update fusion upvotes count
    const upvotesChange = body.voteType === 'up' ? 1 : -1;
    const newUpvotes = (currentFusion.upvotes || 0) + upvotesChange;
    
    await supabaseServer
      .from('fusions')
      .update({ upvotes: newUpvotes })
      .eq('share_token', body.shareToken);

    // Invalidate all fusion-related caches (will expire naturally in 5 minutes)
    // Note: Next.js revalidateTag requires specific configuration

    const response = NextResponse.json({
      success: true,
      data: {
        voteType: body.voteType,
        newUpvotes: (currentFusion.upvotes || 0) + upvotesChange,
      },
      served_from_cache: false,
      cache_age_seconds: 0,
      cache_hit_count: 0
    });
    
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Invalidate', 'fusions,gallery,trending');
    return response;
    
  } catch (error) {
    console.error('Vote error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record vote',
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
