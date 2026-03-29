import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { unstable_cache } from 'next/cache';

// Helper functions for scalability calculations
function calculateCurrentCapacity(): string {
  const rateLimitPerMinute = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60');
  const estimatedConcurrentUsers = Math.floor(rateLimitPerMinute * 20); // Rough estimate
  return `${estimatedConcurrentUsers} users`;
}

function getScalabilityRecommendations(tokensUsed: number, dailyBudget: number): string[] {
  const recommendations: string[] = [];
  
  const budgetUsage = (tokensUsed / dailyBudget) * 100;
  
  if (budgetUsage > 80) {
    recommendations.push('Consider increasing AI token budget for higher traffic');
  }
  
  if (tokensUsed > 1000000) {
    recommendations.push('Monitor AI service rate limits closely');
  }
  
  const memUsage = process.memoryUsage();
  const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (memPercentage > 70) {
    recommendations.push('Memory usage is high, consider optimization');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is running optimally for current load');
  }
  
  return recommendations;
}

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

      const dailyBudget = parseInt(process.env.AI_DAILY_TOKEN_BUDGET || '5000000');
      const tokensUsed = tokenRecord ? (tokenRecord.tokensUsed ?? 0) : 0;
      const remainingTokens = Math.max(0, dailyBudget - tokensUsed);

      // Check if budget is exceeded
      const budgetStatus = tokensUsed > dailyBudget ? 'exceeded' : 
                        tokensUsed > dailyBudget * 0.9 ? 'warning' : 'healthy';

      // Check Redis connectivity
      let redisStatus = 'unknown';
      try {
        const { getRedisClient } = await import('@/lib/redis');
        const redis = getRedisClient();
        await redis.ping();
        redisStatus = 'connected';
      } catch (error) {
        redisStatus = 'disconnected';
      }

      // Get memory usage
      const memUsage = process.memoryUsage();

      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: 'connected',
          redis: redisStatus,
          tokenBudget: {
            daily: dailyBudget,
            used: tokensUsed,
            remaining: remainingTokens,
            status: budgetStatus,
            perUserLimit: process.env.AI_TOKENS_PER_USER_PER_DAY || '50000',
            perFusionLimit: process.env.AI_TOKENS_PER_FUSION || '5000',
          },
          rateLimiting: {
            enabled: true,
            limits: {
              perMinute: process.env.RATE_LIMIT_PER_MINUTE || '60',
              perUser: process.env.USER_RATE_LIMIT_PER_MINUTE || '30',
              global: process.env.GLOBAL_RATE_LIMIT_PER_MINUTE || '1000',
            },
          },
          performance: {
            memory: {
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              external: memUsage.external,
              rss: memUsage.rss,
              percentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2),
            },
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'unknown',
            hasGroqKey: !!process.env.GROQ_API_KEY,
            hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
            hasTmdbKey: !!process.env.TMDB_READ_TOKEN,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          },
          scalability: {
            targetUsers: '50-100',
            currentCapacity: calculateCurrentCapacity(),
            recommendations: getScalabilityRecommendations(tokensUsed, dailyBudget),
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
