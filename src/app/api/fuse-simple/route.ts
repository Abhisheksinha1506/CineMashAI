import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fusions } from '@/lib/schema';
import { checkTokenBudget, consumeTokens } from '@/lib/token-budget';
import { hashIP } from '@/lib/utils';
import { getMovieDetails } from '@/lib/tmdb-simple';
import { generateFusionDetails, generateShareToken } from '@/lib/ai-server';
import { getCachedFusion, cacheFusion, shouldCacheFusion } from '@/lib/fusion-cache-simple';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.movieIds || !Array.isArray(body.movieIds) || body.movieIds.length < 2 || body.movieIds.length > 4) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid movieIds. Provide 2-4 movie IDs.' },
        { status: 400 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }

    const movieIds = body.movieIds.map((id: any) => Number(id));
    const constraints = body.constraints;
    
    // Check cache first for instant response
    if (shouldCacheFusion(movieIds, constraints)) {
      const cachedResult = await getCachedFusion(movieIds, constraints);
      if (cachedResult) {
        const response = NextResponse.json({
          success: true,
          data: {
            ...cachedResult.data,
            share_token: `cached-${crypto.randomUUID().substring(0, 8)}`,
          },
          served_from_cache: true,
          cache_age_seconds: cachedResult.cacheAge,
          cache_hit_count: cachedResult.hitCount
        });
        
        response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
        response.headers.set('X-Cache-Status', 'hit');
        response.headers.set('X-Cache-Age', cachedResult.cacheAge.toString());
        response.headers.set('X-AI-Provider', 'cache');
        response.headers.set('Cache-Control', 'private, no-cache');
        
        return response;
      }
    }

    const userId = hashIP(request);
    
    // Check token budget 
    const tokenCheck = await checkTokenBudget(userId, 1000);
    if (!tokenCheck.allowed) {
      const response = NextResponse.json(
        { success: false, error: tokenCheck.error || 'Insufficient token budget' },
        { status: 429 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }

    // Fetch movie details
    const moviesData = await Promise.all(
      movieIds.map((id: number) => getMovieDetails(id.toString()))
    );

    // Generate real AI response
    const fusionData = await generateFusionDetails(moviesData as any);

    // Generate unique share token
    const shareToken = generateShareToken();
    
    // Save to database
    await db.insert(fusions).values({
      id: crypto.randomUUID(),
      share_token: shareToken,
      movie_ids: JSON.stringify(movieIds.map((id: number) => id.toString())),
      fusion_data: JSON.stringify(fusionData),
      ip_hash: userId,
      upvotes: 0,
      created_at: new Date().toISOString(),
    });

    // Cache the result for future requests
    if (shouldCacheFusion(movieIds, constraints)) {
      await cacheFusion(movieIds, constraints, fusionData);
    }

    // Consume tokens from budget
    await consumeTokens(userId, 1000);

    const response = NextResponse.json({
      success: true,
      data: {
        ...fusionData,
        share_token: shareToken,
      },
      served_from_cache: false,
      cache_age_seconds: 0,
      cache_hit_count: 0
    });
    
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Status', 'miss');
    response.headers.set('X-AI-Provider', 'groq');
    response.headers.set('Cache-Control', 'private, no-cache');
    
    return response;
      
  } catch (error: any) {
    console.error('Fusion error:', error);
    const response = NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate fusion',
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
