import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { fusions } from '@/lib/schema';
import { getMovieDetails } from '@/lib/tmdb-simple';
import { checkTokenBudget, consumeTokens } from '@/lib/token-budget';
import { hashIP } from '@/lib/utils';
import { generateFusion } from '@/lib/groq';
import { generateShareToken } from '@/lib/ai-server';
import { getCachedFusion, cacheFusion, shouldCacheFusion } from '@/lib/fusion-cache-simple';
import { enrichCastWithPhotos } from '@/lib/cast-enrichment';
import crypto from 'crypto';

// Input validation schema
const FuseRequestSchema = z.object({
  movieIds: z.array(z.number()).min(2).max(4),
  constraints: z.string().optional(),
});

type FuseRequest = z.infer<typeof FuseRequestSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let aiProvider = 'groq';
  
  try {
    // Parse request body
    const body: FuseRequest = await request.json();
    
    // Validate input
    const validation = FuseRequestSchema.safeParse(body);
    if (!validation.success) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validation.error.format()._errors.join(', ') 
        },
        { status: 400 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }

    const { movieIds, constraints } = validation.data;
    
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
    
    // Get user IP for token budget tracking
    const userId = hashIP(request);
    
    // Check token budget (rough estimate: 1000 tokens per fusion)
    const tokenCheck = await checkTokenBudget(userId, 1000);
    if (!tokenCheck.allowed) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: tokenCheck.error || 'Insufficient token budget' 
        },
        { status: 429 }
      );
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      return response;
    }

    // Fetch movie details for all selected movies
    const movieDetailsPromises = movieIds.map(async (id) => {
      const details = await getMovieDetails(id.toString());
      return details;
    });

    const moviesData = await Promise.all(movieDetailsPromises);
    
    try {
      // Call the existing AI generation logic with Groq + OpenRouter fallback
      const parsedFusionData = await generateFusion(moviesData as any, constraints);

      // Enrich cast with real headshots
      const enrichedCast = await enrichCastWithPhotos((parsedFusionData as any).suggestedCast || []);
      
      const finalFusionData = {
        ...parsedFusionData,
        suggestedCast: enrichedCast,
        // Legacy compatibility for UI
        suggested_cast: enrichedCast
      };

      // Generate unique share token
      const shareToken = generateShareToken();
      
      // Save to database
      const movieIdsArray = movieIds.map(id => id.toString());
      
      await db.insert(fusions).values({
        id: crypto.randomUUID(),
        share_token: shareToken,
        movie_ids: JSON.stringify(movieIdsArray),
        fusion_data: JSON.stringify(finalFusionData),
        ip_hash: userId,
        created_at: new Date().toISOString(),
        upvotes: 0,
      });

      // Cache the result for future requests
      if (shouldCacheFusion(movieIds, constraints)) {
        await cacheFusion(movieIds, constraints, finalFusionData);
      }

      // Consume tokens from budget
      await consumeTokens(userId, 1000);

      const response = NextResponse.json({
        success: true,
        data: {
          ...finalFusionData,
          share_token: shareToken,
        },
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      });
      
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Cache-Status', 'miss');
      response.headers.set('X-AI-Provider', aiProvider);
      response.headers.set('Cache-Control', 'private, no-cache');
      
      return response;
      
    } catch (error: any) {
      console.error('AI or DB error:', error);
      
      const response = NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to generate fusion. Please try again.' 
        },
        { status: 500 }
      );
      
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-AI-Provider', aiProvider);
      return response;
    }
  } catch (error) {
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Invalid request format' 
      },
      { status: 400 }
    );
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  }
}
