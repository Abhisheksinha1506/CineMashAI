import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { hashIP } from '@/lib/utils';
import crypto from 'crypto';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccess: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory rate limit cache
const rateLimitCache = new Map<string, RateLimitEntry>();
const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20');
const RATE_LIMIT_MEMORY_LIMIT = parseInt(process.env.RATE_LIMIT_MEMORY_LIMIT || '10000');
const RATE_LIMIT_CLEANUP_INTERVAL = parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL || '60');
const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds

// Cleanup expired entries periodically
const cleanupRateLimitCache = () => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (now > entry.resetTime) {
      rateLimitCache.delete(key);
    }
  }
  
  // Remove oldest entries if cache is too large
  if (rateLimitCache.size > RATE_LIMIT_MEMORY_LIMIT) {
    const entries = Array.from(rateLimitCache.entries());
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    const toDelete = entries.slice(0, rateLimitCache.size - RATE_LIMIT_MEMORY_LIMIT);
    toDelete.forEach(([key]) => rateLimitCache.delete(key));
  }
};

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitCache, RATE_LIMIT_CLEANUP_INTERVAL * 1000);
}

// Fallback to database when memory cache is not available
async function getRateLimitFromDB(ipHash: string): Promise<RateLimitEntry | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: usageData, error: selectError } = await supabaseServer
      .from('token_usage')
      .select('*')
      .eq('user_id', ipHash)
      .eq('date', today)
      .limit(1);
    
    if (selectError) throw selectError;
    const usage = usageData?.[0];
    
    if (!usage) {
      return null;
    }
    
    // Rough approximation of rate limit based on token usage
    const estimatedRequests = Math.floor((usage.tokens_used || 0) / 1000); 
    
    return {
      count: estimatedRequests,
      resetTime: Date.now() + WINDOW_SIZE,
      lastAccess: Date.now()
    };
  } catch (error) {
    console.error('Rate limit DB fallback error:', error);
    return null;
  }
}

// Save rate limit to database (fallback/persistence)
async function saveRateLimitToDB(ipHash: string, entry: RateLimitEntry): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing to determine if insert or update
    const { data: existing } = await supabaseServer
      .from('token_usage')
      .select('tokens_used')
      .eq('user_id', ipHash)
      .eq('date', today)
      .limit(1);
      
    if (existing && existing.length > 0) {
      // Update
      const newTokens = (existing[0].tokens_used || 0) + 1000;
      await supabaseServer
        .from('token_usage')
        .update({ tokens_used: newTokens })
        .eq('user_id', ipHash)
        .eq('date', today);
    } else {
      // Insert
      await supabaseServer
        .from('token_usage')
        .insert({
          id: crypto.randomUUID(),
          user_id: ipHash,
          date: today,
          tokens_used: 1000
        });
    }
  } catch (error) {
    console.error('Rate limit DB save error:', error);
  }
}

export async function checkRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const ipHash = hashIP(request);
  const now = Date.now();
  
  // Check memory cache first
  let entry = rateLimitCache.get(ipHash);
  
  if (!entry) {
    // Try to get from database as fallback
    const dbEntry = await getRateLimitFromDB(ipHash);
    if (dbEntry) {
      entry = dbEntry;
    }
    
    if (entry && now < entry.resetTime) {
      rateLimitCache.set(ipHash, entry);
    } else {
      // Create new entry
      entry = {
        count: 0,
        resetTime: now + WINDOW_SIZE,
        lastAccess: now
      };
    }
  }
  
  // Check if window has expired
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + WINDOW_SIZE;
  }
  
  // Update last access time
  entry.lastAccess = now;
  
  // Check if rate limit exceeded
  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    // Save to database for persistence
    await saveRateLimitToDB(ipHash, entry);
    
    return {
      allowed: false,
      limit: RATE_LIMIT_PER_MINUTE,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    };
  }
  
  // Increment count
  entry.count++;
  
  // Save to cache
  rateLimitCache.set(ipHash, entry);
  
  // Save to database periodically (every 10 requests)
  if (entry.count % 10 === 0) {
    await saveRateLimitToDB(ipHash, entry);
  }
  
  return {
    allowed: true,
    limit: RATE_LIMIT_PER_MINUTE,
    remaining: RATE_LIMIT_PER_MINUTE - entry.count,
    resetTime: entry.resetTime
  };
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

// Get client IP address from request
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

// Rate limit middleware for API routes
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
      console.error('Rate limit middleware error:', error);
      throw error;
    }
  };
}
