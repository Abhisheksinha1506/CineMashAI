import { NextResponse } from 'next/server';
import { getRedisMetrics } from '@/lib/redis';

export async function GET() {
  const startTime = Date.now();
  
  try {
    const metrics = await getRedisMetrics();
    
    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    console.error('[API] Redis Health Check Failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Redis metrics',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
