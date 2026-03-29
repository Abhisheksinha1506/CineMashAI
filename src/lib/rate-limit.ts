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

const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60');
const USER_RATE_LIMIT_PER_MINUTE = parseInt(process.env.USER_RATE_LIMIT_PER_MINUTE || '30');
const GLOBAL_RATE_LIMIT_PER_MINUTE = parseInt(process.env.GLOBAL_RATE_LIMIT_PER_MINUTE || '1000');
const WINDOW_SIZE = 60; // 1 minute in seconds for Redis EXPIRE

/**
 * Checks the rate limit for a given request using Redis.
 * Uses an atomic INCR and EXPIRE strategy for distributed consistency.
 */
export async function checkRateLimit(request: NextRequest, userId?: string): Promise<RateLimitResult> {
  const ipHash = hashIP(request);
  const redis = getRedisClient();
  
  // Check multiple rate limits: IP-based, user-based, and global
  const ipKey = `${KEY_PREFIXES.RATE}ip:${ipHash}`;
  const userKey = userId ? `${KEY_PREFIXES.RATE}user:${userId}` : null;
  const globalKey = `${KEY_PREFIXES.RATE}global`;
  
  try {
    // Check IP-based rate limit
    const ipCount = await checkSingleLimit(redis, ipKey, RATE_LIMIT_PER_MINUTE);
    
    // Check user-based rate limit if userId provided
    let userCount = 0;
    if (userKey) {
      userCount = await checkSingleLimit(redis, userKey, USER_RATE_LIMIT_PER_MINUTE);
    }
    
    // Check global rate limit
    const globalCount = await checkSingleLimit(redis, globalKey, GLOBAL_RATE_LIMIT_PER_MINUTE);
    
    // Determine the most restrictive limit
    const effectiveLimit = userId ? USER_RATE_LIMIT_PER_MINUTE : RATE_LIMIT_PER_MINUTE;
    const effectiveCount = userId ? userCount : ipCount;
    
    // Check if any limit is exceeded
    const ipExceeded = ipCount > RATE_LIMIT_PER_MINUTE;
    const userExceeded = userId ? userCount > USER_RATE_LIMIT_PER_MINUTE : false;
    const globalExceeded = globalCount > GLOBAL_RATE_LIMIT_PER_MINUTE;
    
    if (ipExceeded || userExceeded || globalExceeded) {
      const ttl = await redis.ttl(ipKey);
      const resetTime = Date.now() + (ttl > 0 ? ttl : WINDOW_SIZE) * 1000;
      
      return {
        allowed: false,
        limit: effectiveLimit,
        remaining: 0,
        resetTime,
        retryAfter: ttl > 0 ? ttl : WINDOW_SIZE
      };
    }

    const remaining = Math.max(0, effectiveLimit - effectiveCount);
    const ttl = await redis.ttl(ipKey);
    const resetTime = Date.now() + (ttl > 0 ? ttl : WINDOW_SIZE) * 1000;

    return {
      allowed: true,
      limit: effectiveLimit,
      remaining,
      resetTime
    };
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to permissive mode:', error);
    // Permissive fallback so users aren't blocked if Redis is down
    const effectiveLimit = userId ? USER_RATE_LIMIT_PER_MINUTE : RATE_LIMIT_PER_MINUTE;
    return {
      allowed: true,
      limit: effectiveLimit,
      remaining: 1,
      resetTime: Date.now() + WINDOW_SIZE * 1000
    };
  }
}

/**
 * Checks a single rate limit key
 */
async function checkSingleLimit(redis: any, key: string, limit: number): Promise<number> {
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, WINDOW_SIZE);
  
  const results = await multi.exec();
  if (!results || !results[0]) {
    throw new Error('Redis multi-exec failed');
  }
  
  const [, count] = results[0] as [Error | null, number];
  return count;
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
export function withRateLimit(handler: (req: NextRequest, userId?: string) => Promise<Response>) {
  return async (request: NextRequest) => {
    try {
      // Extract userId from request if available (e.g., from JWT token or session)
      const userId = await extractUserIdFromRequest(request);
      
      const rateLimitResult = await checkRateLimit(request, userId);
      
      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult);
      }
      
      const response = await handler(request, userId);
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

/**
 * Extract user ID from request (placeholder implementation)
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  // TODO: Implement user ID extraction from JWT token, session, or other auth mechanism
  // For now, return undefined to use IP-based rate limiting
  return undefined;
}
