import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hashIP } from '@/lib/utils';
import { getCachedFusion, shouldCacheFusion } from '@/lib/fusion-cache-simple';
import { addFusionJob } from '@/lib/queue';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

// Input validation schema
const FuseRequestSchema = z.object({
  movieIds: z.array(z.number()).min(2).max(4),
  constraints: z.string().optional(),
});

type FuseRequest = z.infer<typeof FuseRequestSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Parse and validate request body
    const body: FuseRequest = await request.json();
    const validation = FuseRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid movie selection (2-4 numeric IDs required)' },
        { status: 400 }
      );
    }

    const { movieIds, constraints } = validation.data;
    const userId = hashIP(request);
    
    // 2. Rate Limit (Redis-backed distributed check)
    const rateLimit = await checkRateLimit(request);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    // 3. Check Cache (Instant Response for common fusions)
    if (shouldCacheFusion(movieIds, constraints)) {
      const cachedResult = await getCachedFusion(movieIds, constraints);
      if (cachedResult) {
        return NextResponse.json({
          success: true,
          data: {
            ...cachedResult.data,
            share_token: `cached-${Math.random().toString(36).substring(7)}`,
          },
          served_from_cache: true
        });
      }
    }
    
    // 4. Enqueue Job (Asynchronous Backend Scaling)
    try {
      const job = await addFusionJob({
        movieIds,
        constraints,
        userId
      });

      const response = NextResponse.json({
        success: true,
        jobId: job.id,
        status: 'queued',
        message: 'Fusion request accepted into the distributed queue.'
      }, { 
        status: 202 // Accepted
      });
      
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      response.headers.set('X-Job-ID', job.id || '');
      return response;
      
    } catch (enqueueError: any) {
      console.error('[Fuse API] Enqueue failed:', enqueueError);
      return NextResponse.json(
        { success: false, error: 'Database/Queue overloaded. Please try again.' },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('[Fuse API] Fatal error:', error);
    return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
    );
  }
}
