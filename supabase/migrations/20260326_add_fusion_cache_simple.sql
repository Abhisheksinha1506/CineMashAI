-- Simplified Fusion Cache Table
-- Theme-agnostic caching for fusion generation results

CREATE TABLE IF NOT EXISTS fusion_cache_simple (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- SHA-256 hash of movie_ids + constraints
  fusion_data JSONB NOT NULL, -- Complete fusion result
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 30 minute expiry
  hit_count INTEGER DEFAULT 1, -- Number of times this cache was hit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fusion_cache_simple_cache_key ON fusion_cache_simple(cache_key);
CREATE INDEX IF NOT EXISTS idx_fusion_cache_simple_expires_at ON fusion_cache_simple(expires_at);
CREATE INDEX IF NOT EXISTS idx_fusion_cache_simple_hit_count ON fusion_cache_simple(hit_count DESC);

-- Partial index for active cache entries (not expired)
CREATE INDEX IF NOT EXISTS idx_fusion_cache_simple_active ON fusion_cache_simple(cache_key) 
WHERE expires_at > NOW();

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_fusion_cache_simple()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM fusion_cache_simple 
  WHERE expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE fusion_cache_simple IS 'Simplified cache table for storing fusion generation results to avoid duplicate AI API calls';
COMMENT ON COLUMN fusion_cache_simple.cache_key IS 'SHA-256 hash of sorted movie IDs and constraints (theme-agnostic)';
COMMENT ON COLUMN fusion_cache_simple.fusion_data IS 'Complete AI-generated fusion result as JSONB';
COMMENT ON COLUMN fusion_cache_simple.expires_at IS 'Timestamp when this cache entry expires (30 minutes)';
COMMENT ON COLUMN fusion_cache_simple.hit_count IS 'Number of times this cached fusion has been accessed';
