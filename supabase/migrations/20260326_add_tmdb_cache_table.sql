-- TMDB Cache Table for Multi-Layer Caching
-- Provides cross-instance cache sharing for TMDB API responses

CREATE TABLE IF NOT EXISTS tmdb_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- Hashed URL + theme combination
  response_data JSONB NOT NULL, -- TMDB API response data
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When cache entry expires
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1, -- Number of times this cache was accessed
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tmdb_cache_cache_key ON tmdb_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_tmdb_cache_expires_at ON tmdb_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_tmdb_cache_created_at ON tmdb_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_tmdb_cache_access_count ON tmdb_cache(access_count DESC);

-- Partial index for active cache entries (not expired)
CREATE INDEX IF NOT EXISTS idx_tmdb_cache_active ON tmdb_cache(cache_key) 
WHERE expires_at > NOW();

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_tmdb_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tmdb_cache 
  WHERE expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE tmdb_cache IS 'Cache table for storing TMDB API responses to reduce rate limiting and improve performance';
COMMENT ON COLUMN tmdb_cache.cache_key IS 'SHA-256 hash of the full TMDB URL including query parameters and theme';
COMMENT ON COLUMN tmdb_cache.response_data IS 'Complete TMDB API response as JSONB for direct proxy return';
COMMENT ON COLUMN tmdb_cache.expires_at IS 'Timestamp when this cache entry should expire';
COMMENT ON COLUMN tmdb_cache.access_count IS 'Number of times this cached TMDB response has been accessed';
COMMENT ON COLUMN tmdb_cache.last_accessed IS 'Last time this cache entry was accessed';

-- Row Level Security (optional - uncomment if needed)
-- ALTER TABLE tmdb_cache ENABLE ROW LEVEL SECURITY;

-- Policy for service role access (backend services)
-- CREATE POLICY "Service role access for tmdb cache" ON tmdb_cache
--   FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
