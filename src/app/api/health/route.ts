import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { unstable_cache } from 'next/cache';

// Cache health check for 1 minute to avoid excessive database queries
const getCachedHealthStatus = unstable_cache(
  async () => {
    try {
      // Check database connection
      const { error: dbError } = await supabaseServer.from('token_usage').select('*').limit(1);
      if (dbError) throw dbError;
      
      // Check token usage
      const today = new Date().toISOString().split('T')[0];
      const { data: records, error: tokenError } = await supabaseServer
        .from('token_usage')
        .select('*')
        .eq('date', today);
      if (tokenError) throw tokenError;
      const tokenRecord = records?.[0];

      const dailyBudget = parseInt(process.env.AI_DAILY_TOKEN_BUDGET || '500000');
      const tokensUsed = tokenRecord ? (tokenRecord.tokensUsed ?? 0) : 0;
      const remainingTokens = Math.max(0, dailyBudget - tokensUsed);

      // Check if budget is exceeded
      const budgetStatus = tokensUsed > dailyBudget ? 'exceeded' : 
                        tokensUsed > dailyBudget * 0.9 ? 'warning' : 'healthy';

      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected',
          tokenBudget: {
            daily: dailyBudget,
            used: tokensUsed,
            remaining: remainingTokens,
            status: budgetStatus,
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'unknown',
            hasGroqKey: !!process.env.GROQ_API_KEY,
            hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
            hasTmdbKey: !!process.env.TMDB_READ_TOKEN,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          },
        },
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    } catch (error) {
      console.error('Health check error:', error);
      
      return {
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    }
  },
  ['health', 'system'],
  { 
    revalidate: 60, // 1 minute
    tags: ['health', 'system']
  }
);

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get cached health status
    const result = await getCachedHealthStatus();
    
    const response = NextResponse.json(result);
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Cache-Status', result.served_from_cache ? 'hit' : 'miss');
    response.headers.set('Cache-Control', 'public, max-age=60');
    
    return response;
  } catch (error) {
    console.error('Health check error:', error);
    
    const response = NextResponse.json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      served_from_cache: false,
      cache_age_seconds: 0,
      cache_hit_count: 0
    }, { status: 500 });
    
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    return response;
  }
}
