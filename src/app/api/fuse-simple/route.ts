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
    
    // Basic validation - allow 1 fusion + 1-3 movies, or 2-4 regular movies
    if (!body.movieIds || !Array.isArray(body.movieIds) || body.movieIds.length < 1 || body.movieIds.length > 4) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid movie selection. Provide 1 fusion + 1-3 movies, or 2-4 regular movies.' },
        { status: 400 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }
    
    // Check if we have at least 2 total movies after processing fusion objects
    let totalMovieCount = 0;
    for (const movie of body.movieIds) {
      if (typeof movie === 'object' && movie.isFusion) {
        totalMovieCount += (movie.sourceMovies?.length || movie.sourceMovieIds?.length || 0);
      } else {
        totalMovieCount += 1;
      }
    }
    
    if (totalMovieCount < 2 || totalMovieCount > 4) {
      const response = NextResponse.json(
        { success: false, error: `Invalid movie count. Total movies must be between 2-4, got ${totalMovieCount}.` },
        { status: 400 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }

    // Extract movie IDs, handling both regular movies and fusion objects
    let allMovieIds: number[] = [];
    let moviesData: any[] = [];
    
    // Process each movie to handle fusion objects
    for (const movie of body.movieIds) {
      if (typeof movie === 'object' && movie.isFusion) {
        // This is a fusion object, extract its source movies
        if (movie.sourceMovies && Array.isArray(movie.sourceMovies)) {
          moviesData.push(...movie.sourceMovies);
          allMovieIds.push(...movie.sourceMovies.map((m: any) => Number(m.id)));
        } else if (movie.sourceMovieIds && Array.isArray(movie.sourceMovieIds)) {
          // Fallback to sourceMovieIds if sourceMovies not available
          allMovieIds.push(...movie.sourceMovieIds.map((id: string) => Number(id)));
        }
      } else {
        // This is a regular movie ID
        allMovieIds.push(Number(movie));
      }
    }
    
    // Remove duplicates and sort for consistency
    const movieIds = [...new Set(allMovieIds)].sort((a, b) => a - b);
    const constraints = body.constraints;
    
    // Fetch movie details for any movies we don't already have data for
    const missingMovieIds = movieIds.filter(id => 
      !moviesData.some(movie => Number(movie.id) === id)
    );
    
    if (missingMovieIds.length > 0) {
      const missingMoviesData = await Promise.all(
        missingMovieIds.map((id: number) => getMovieDetails(id.toString()))
      );
      moviesData.push(...missingMoviesData);
    }
    
    // Check cache first for instant response
    if (shouldCacheFusion(movieIds, constraints)) {
      const cachedResult = await getCachedFusion(movieIds, constraints);
      if (cachedResult) {
        const response = NextResponse.json({
          success: true,
          data: cachedResult.data,
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

    // Generate real AI response
    const fusionData = await generateFusionDetails(moviesData as any);

    // Generate unique share token
    const shareToken = generateShareToken();
    
    // Save to database with complete movie details
    await db.insert(fusions).values({
      id: crypto.randomUUID(),
      share_token: shareToken,
      movie_ids: JSON.stringify(movieIds.map((id: number) => id.toString())),
      fusion_data: JSON.stringify(fusionData),
      source_movies: JSON.stringify(moviesData), // Store complete movie objects for remix
      ip_hash: userId,
      upvotes: 0,
      created_at: new Date().toISOString(),
    });

    // Cache the result for future requests
    if (shouldCacheFusion(movieIds, constraints)) {
      await cacheFusion(movieIds, constraints, fusionData, shareToken);
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
