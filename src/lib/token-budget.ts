import { supabaseServer } from '@/lib/supabase-server';
import { hashIP } from '@/lib/utils';
import { memoryCache, CACHE_CONFIGS, generateCacheKey } from './cache';
import crypto from 'crypto';

interface TokenBudget {
  userId: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  resetDate: string;
}

interface TokenUsageResult {
  allowed: boolean;
  budget: TokenBudget;
  error?: string;
}

const DAILY_TOKEN_BUDGET = parseInt(process.env.AI_DAILY_TOKEN_BUDGET || '500000');

// Get today's date in UTC
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

// Get tomorrow's date in UTC (for reset time)
function getTomorrowUTC(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Calculate seconds until next reset (midnight UTC)
function getSecondsUntilReset(): number {
  const now = new Date();
  const nextReset = new Date();
  nextReset.setUTCHours(0, 0, 0, 0);
  nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  
  return Math.floor((nextReset.getTime() - now.getTime()) / 1000);
}

// Get or create token usage record for user (with caching)
async function getTokenUsage(userId: string): Promise<TokenBudget> {
  const today = getTodayUTC();
  const cacheKey = generateCacheKey('token_usage', { userId, date: today });
  
  // Try memory cache first
  const cached = memoryCache.get<TokenBudget>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const { data: usageData, error: selectError } = await supabaseServer
      .from('token_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1);
    
    if (selectError) throw selectError;
    const usage = usageData?.[0];
    
    const tokensUsed = usage ? (usage.tokens_used ?? 0) : 0;
    
    const budget: TokenBudget = {
      userId,
      dailyLimit: DAILY_TOKEN_BUDGET,
      used: tokensUsed,
      remaining: Math.max(0, DAILY_TOKEN_BUDGET - tokensUsed),
      resetDate: getTomorrowUTC()
    };
    
    // Cache for 1 minute (rate limiting cache)
    memoryCache.set(cacheKey, budget, CACHE_CONFIGS.TOKEN_USAGE.ttl);
    
    return budget;
  } catch (error) {
    console.error('Error getting token usage:', error);
    throw new Error('Failed to get token usage');
  }
}

// Update token usage for user
export async function updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
  const today = getTodayUTC();
  
  try {
    // Get existing to determine update or insert
    const { data: existing } = await supabaseServer
      .from('token_usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1);
      
    if (existing && existing.length > 0) {
      const newTotal = (existing[0].tokens_used || 0) + tokensUsed;
      await supabaseServer
        .from('token_usage')
        .update({ tokens_used: newTotal })
        .eq('user_id', userId)
        .eq('date', today);
    } else {
      await supabaseServer
        .from('token_usage')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          date: today,
          tokens_used: tokensUsed
        });
    }
    
    // Invalidate cache for this user
    const cacheKey = generateCacheKey('token_usage', { userId, date: today });
    memoryCache.delete(cacheKey);
    
  } catch (error) {
    console.error('Error updating token usage:', error);
    throw new Error('Failed to update token usage');
  }
}

// Check if user has sufficient token budget
export async function checkTokenBudget(userId: string, tokensRequested: number): Promise<TokenUsageResult> {
  try {
    const budget = await getTokenUsage(userId);
    
    if (budget.remaining < tokensRequested) {
      return {
        allowed: false,
        budget,
        error: `Insufficient token budget. Requested: ${tokensRequested}, Available: ${budget.remaining}`
      };
    }
    
    return {
      allowed: true,
      budget
    };
  } catch (error) {
    return {
      allowed: false,
      budget: {
        userId,
        dailyLimit: DAILY_TOKEN_BUDGET,
        used: 0,
        remaining: 0,
        resetDate: getTomorrowUTC()
      },
      error: 'Failed to check token budget'
    };
  }
}

// Consume tokens from user's budget
export async function consumeTokens(userId: string, tokensUsed: number): Promise<TokenUsageResult> {
  try {
    // Check budget first
    const checkResult = await checkTokenBudget(userId, tokensUsed);
    
    if (!checkResult.allowed) {
      return checkResult;
    }
    
    // Update usage
    await updateTokenUsage(userId, tokensUsed);
    
    // Get updated budget
    const updatedBudget = await getTokenUsage(userId);
    
    return {
      allowed: true,
      budget: updatedBudget
    };
  } catch (error) {
    return {
      allowed: false,
      budget: {
        userId,
        dailyLimit: DAILY_TOKEN_BUDGET,
        used: 0,
        remaining: 0,
        resetDate: getTomorrowUTC()
      },
      error: 'Failed to consume tokens'
    };
  }
}

// Get token budget information
export async function getTokenBudget(userId: string): Promise<TokenBudget> {
  return getTokenUsage(userId);
}

// Reset daily token usage (called at midnight UTC)
export async function resetDailyTokenUsage(): Promise<void> {
  // In PostgreSQL/Drizzle, we don't need to do anything explicit here 
  // if we're just checking usage by date. Old records can stay.
  console.log('Daily token usage reset context updated');
}

// Get token budget headers for HTTP responses
export function getTokenBudgetHeaders(budget: TokenBudget): Record<string, string> {
  return {
    'X-TokenBudget-Limit': budget.dailyLimit.toString(),
    'X-TokenBudget-Used': budget.used.toString(),
    'X-TokenBudget-Remaining': budget.remaining.toString(),
    'X-TokenBudget-Reset': budget.resetDate,
    'X-TokenBudget-Reset-In': getSecondsUntilReset().toString()
  };
}

// Create token budget exceeded response
export function createTokenBudgetResponse(result: TokenUsageResult): Response {
  const headers = getTokenBudgetHeaders(result.budget);
  
  return new Response(
    JSON.stringify({
      error: 'Token budget exceeded',
      message: result.error || 'Daily token budget exceeded',
      budget: {
        limit: result.budget.dailyLimit,
        used: result.budget.used,
        remaining: result.budget.remaining,
        resetDate: result.budget.resetDate
      }
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

// Middleware for token budget checking
export function withTokenBudget(tokensRequired: number) {
  return function(handler: (req: Request, budget: TokenBudget) => Promise<Response>) {
    return async (req: Request) => {
      const userId = hashIP(req);
      const result = await checkTokenBudget(userId, tokensRequired);
      
      if (!result.allowed) {
        return createTokenBudgetResponse(result);
      }
      
      await updateTokenUsage(userId, tokensRequired);
      const updatedBudget = await getTokenBudget(userId);
      const response = await handler(req, updatedBudget);
      
      if (response instanceof Response) {
        const headers = getTokenBudgetHeaders(updatedBudget);
        Object.entries(headers).forEach(([key, value]) => {
          if (response.headers) {
            response.headers.set(key, value);
          }
        });
      }
      
      return response;
    };
  };
}

// Estimate tokens for common operations
export const TOKEN_COSTS = {
  SEARCH_MOVIES: 10,
  GET_MOVIE_DETAILS: 5,
  GET_MOVIE_CREDITS: 5,
  GET_POPULAR_MOVIES: 15,
  GENERATE_FUSION: 1000,
  GENERATE_FUSION_IMAGE: 2000,
  CHAT_MESSAGE: 100
} as const;

// Get token cost for an operation
export function getTokenCost(operation: keyof typeof TOKEN_COSTS): number {
  return TOKEN_COSTS[operation] || 100;
}
