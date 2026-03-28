import { NextRequest } from 'next/server';
import { hashIP } from '@/lib/utils';
import { getRedisClient, KEY_PREFIXES, getTTL } from '@/lib/redis';

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20');
const WINDOW_SIZE = 60; // 1 minute in seconds for Redis EXPIRE

/**
 * Checks the rate limit for a given request using Redis.
 * Uses an atomic INCR and EXPIRE strategy for distributed consistency.
 */
export async function checkRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const ipHash = hashIP(request);
  const redis = getRedisClient();
  const key = `${KEY_PREFIXES.RATE}${ipHash}`;
  
  try {
    // Multi-command atomic check
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);
    
    const results = await multi.exec();
    if (!results || !results[0] || !results[1]) {
        throw new Error('Redis multi-exec failed');
    }

    const [incrErr, count] = results[0] as [Error | null, number];
    const [ttlErr, ttl] = results[1] as [Error | null, number];

    if (incrErr || ttlErr) throw incrErr || ttlErr;

    // Set expiration on first request in the window
    if (count === 1 || ttl === -1) {
      await redis.expire(key, WINDOW_SIZE);
    }

    const remaining = Math.max(0, RATE_LIMIT_PER_MINUTE - count);
    const resetTime = Date.now() + (ttl > 0 ? ttl : WINDOW_SIZE) * 1000;

    if (count > RATE_LIMIT_PER_MINUTE) {
      return {
        allowed: false,
        limit: RATE_LIMIT_PER_MINUTE,
        remaining: 0,
        resetTime,
        retryAfter: ttl > 0 ? ttl : WINDOW_SIZE
      };
    }

    return {
      allowed: true,
      limit: RATE_LIMIT_PER_MINUTE,
      remaining,
      resetTime
    };
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to permissive mode:', error);
    // Permissive fallback so users aren't blocked if Redis is down
    return {
      allowed: true,
      limit: RATE_LIMIT_PER_MINUTE,
      remaining: 1,
      resetTime: Date.now() + WINDOW_SIZE * 1000
    };
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString()
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = getRateLimitHeaders(result);
  
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Limit: ${result.limit} per minute.`,
      retryAfter: result.retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
  );
}

// Get client IP address from request (Exporting for utilities)
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return 'unknown';
}

/**
 * Higher-order function to wrap API handlers with rate limiting.
 */
export function withRateLimit(handler: (req: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      const rateLimitResult = await checkRateLimit(request);
      
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult);
      }
      
      const response = await handler(request);
      if (response instanceof Response) {
        const headers = getRateLimitHeaders(rateLimitResult);
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    } catch (error) {
      console.error('[RateLimit] Middleware error:', error);
      return handler(request); // Still try to serve if limiter breaks
    }
  };
}
