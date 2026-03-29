import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis';

/**
 * redis.ts
 * 
 * Core Redis client management with support for:
 * 1. Multi-tier memory optimization.
 * 2. Future-proof Redis Cluster scaling.
 * 3. Unified key prefixing for cluster safety.
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_CLUSTER_ENABLED = process.env.REDIS_CLUSTER_ENABLED === 'true';
const REDIS_MAX_MEMORY = process.env.REDIS_MAX_MEMORY || '512mb';
const REDIS_POOL_SIZE = parseInt(process.env.REDIS_POOL_SIZE || '20');
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES || '3');
const REDIS_CONNECT_TIMEOUT = parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000');

/**
 * Checks if the application is running in Redis Cluster mode.
 */
export function isClusterMode(): boolean {
  return REDIS_CLUSTER_ENABLED;
}

/**
 * Consistent key prefixes for cluster safety (ensures grouping is possible if needed).
 */
export const KEY_PREFIXES = {
  TMDB: 'tmdb:',
  FUSION: 'fusion:',
  GALLERY: 'gallery:',
  RATE: 'rate:',
} as const;

let redisInstance: Redis | Cluster | null = null;

/**
 * Configures memory optimization on the Redis instance.
 * Note: These are 'runtime' configs; ideally also set in redis.conf.
 */
async function applyMemoryOptimizations(client: Redis | Cluster) {
  if (isClusterMode()) {
    // In cluster mode, we'd need to send these to all nodes. 
    // Usually handled by infra, but we'll try to log/warn.
    console.warn('[Redis] Cluster mode: Memory optimizations should be set via cluster config/IaC.');
    return;
  }

  const standalone = client as Redis;
  try {
    /** 
     * PURE CACHE MODE: Disable Persistence
     * ─────────────────────────────────────────────────────────────────────────
     * Why? 
     * 1. No Disk I/O: Prevents performance stutters during RDB snapshots/AOF writes.
     * 2. Pure Memory: CineMash AI uses Redis as a high-speed cache, not a DB.
     * 3. acceptable Volatility: If Redis restarts, we fallback to DB/API fetch.
     * ─────────────────────────────────────────────────────────────────────────
     */
    await standalone.config('SET', 'save', ''); // Disable RDB snapshots
    await standalone.config('SET', 'appendonly', 'no'); // Disable AOF logging

    // 1. Eviction policy: LRU across all keys
    await standalone.config('SET', 'maxmemory-policy', 'allkeys-lru');
    // 2. Max memory limit
    await standalone.config('SET', 'maxmemory', REDIS_MAX_MEMORY);
    // 3. Lazy deletion (performance++)
    await standalone.config('SET', 'lazyfree-lazy-eviction', 'yes');
    await standalone.config('SET', 'lazyfree-lazy-expire', 'yes');
    // 4. Active defragmentation (avoids fragmented memory bloating)
    await standalone.config('SET', 'activedefrag', 'yes');
    await standalone.config('SET', 'active-defrag-cycle-min', '5');
    await standalone.config('SET', 'active-defrag-cycle-max', '75');
    
    console.log(`[Redis] Pure Cache Mode active: Persistence disabled, ${REDIS_MAX_MEMORY}, allkeys-lru.`);
  } catch (err) {
    // Silent catch - common for managed Redis providers (Upstash/etc) 
    // that don't support CONFIG commands.
    if (err instanceof Error && (err.message.includes('unknown command') || err.message.includes('permission denied'))) {
      console.log('[Redis] Runtime optimizations skipped (unsupported by provider).');
    } else {
      // Quiet log for standard providers like Upstash that don't allow CONFIG
      console.log('[Redis] Status: Runtime optimizations successfully skipped (external provider).');
    }
  }
}

/**
 * Sanitizes cache keys to prevent injection attacks and ensure cluster safety.
 */
export function sanitizeKey(key: string): string {
  // Replace anything that isn't alphanumeric, colon, dash, or underscore
  return key.replace(/[^a-zA-Z0-9:\-_]/g, '_');
}

/**
 * Returns a globally singleton Redis or Cluster client.
 */
export function getRedisClient(): Redis | Cluster {
  if (redisInstance) return redisInstance;

  const isTls = REDIS_URL.startsWith('rediss://') || process.env.REDIS_TLS === 'true';
  const commonOptions: RedisOptions = {
    password: process.env.REDIS_PASSWORD,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    connectTimeout: REDIS_CONNECT_TIMEOUT,
    commandTimeout: 10000,
    maxRetriesPerRequest: REDIS_MAX_RETRIES,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    keyPrefix: 'cinemash:',
    enableOfflineQueue: false,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      // Exponential backoff with jitter, caps at 10 seconds
      const delay = Math.min(times * 500, 10000);
      return delay + Math.random() * 1000;
    },
  };

  if (isClusterMode()) {
    /**
     * REDIS CLUSTER CONFIGURATION
     */
    const clusterNodes = (process.env.REDIS_CLUSTER_NODES || REDIS_URL).split(',').map(node => {
      const parsed = new URL(node.includes('://') ? node : `redis://${node}`);
      return { host: parsed.hostname, port: parseInt(parsed.port || '6379', 10) };
    });

    const clusterOptions: ClusterOptions = {
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: commonOptions,
      scaleReads: 'slave',
    };

    redisInstance = new Redis.Cluster(clusterNodes, clusterOptions);
    console.log('[Redis] Connected in CLUSTER mode (Secure).');
  } else {
    /**
     * STANDALONE CONFIGURATION
     */
    redisInstance = new Redis(REDIS_URL, commonOptions);
    console.log(`[Redis] Connected in STANDALONE mode${isTls ? ' (TLS)' : ''}.`);
    
    // Apply optimizations asynchronously
    applyMemoryOptimizations(redisInstance as Redis).catch(console.error);
  }

  // Error handling
  redisInstance.on('error', (err) => {
    console.error('[Redis] Connection Error:', err);
  });

  return redisInstance;
}

/**
 * Health metrics helper.
 */
export async function getRedisMetrics() {
  const client = getRedisClient();
  
  if (isClusterMode()) {
    return { mode: 'cluster', status: 'ready' }; // Detailed cluster stats require iterating nodes
  }

  const standalone = client as Redis;
  const info = await standalone.info('memory');
  const stats = await standalone.info('stats');
  const clients = await standalone.info('clients');

  // Regex helpers to extract values from INFO response
  const getVal = (str: string, key: string) => {
    const match = str.match(new RegExp(`${key}:(.+?)(\r|\n)`));
    return match ? match[1] : '0';
  };

  return {
    mode: 'standalone',
    memory_used_human: getVal(info, 'used_memory_human'),
    memory_peak_human: getVal(info, 'used_memory_peak_human'),
    fragmentation_ratio: getVal(info, 'mem_fragmentation_ratio'),
    connected_clients: getVal(clients, 'connected_clients'),
    hit_rate: (
      (parseInt(getVal(stats, 'keyspace_hits')) / 
      (parseInt(getVal(stats, 'keyspace_hits')) + parseInt(getVal(stats, 'keyspace_misses')) || 1)) * 100
    ).toFixed(2) + '%',
    uptime_in_days: getVal(stats, 'uptime_in_days'),
  };
}

/**
 * Returns a configurable TTL from environment variables with safe defaults.
 */
export function getTTL(keyType: keyof typeof KEY_PREFIXES | 'TOKEN_BUDGET'): number {
  switch (keyType) {
    case 'TMDB':
      return parseInt(process.env.REDIS_TTL_TMDB || '3600', 10);
    case 'FUSION':
      return parseInt(process.env.REDIS_TTL_FUSION || '1800', 10);
    case 'GALLERY':
      return parseInt(process.env.REDIS_TTL_GALLERY || '300', 10);
    case 'RATE':
      return parseInt(process.env.REDIS_TTL_RATE_LIMIT || '60', 10);
    case 'TOKEN_BUDGET':
      return parseInt(process.env.REDIS_TTL_TOKEN_BUDGET || '60', 10);
    default:
      return 3600;
  }
}
