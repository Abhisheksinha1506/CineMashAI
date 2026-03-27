-- Add fusion cache table for caching identical fusion requests
-- This table stores fusion results to avoid regenerating identical movie combinations

CREATE TABLE IF NOT EXISTS fusion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL, -- Hash of movie_ids + constraints
  movie_ids TEXT NOT NULL, -- JSON array of sorted movie IDs
  constraints TEXT DEFAULT '', -- User constraints (can be empty)
  fusion_data JSONB NOT NULL, -- Complete fusion result
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When cache entry expires
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 1, -- Number of times this cache was accessed
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fusion_cache_cache_key ON fusion_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_fusion_cache_expires_at ON fusion_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_fusion_cache_created_at ON fusion_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_fusion_cache_access_count ON fusion_cache(access_count DESC);

-- Partial index for active cache entries (not expired)
CREATE INDEX IF NOT EXISTS idx_fusion_cache_active ON fusion_cache(cache_key) 
WHERE expires_at > NOW();

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_fusion_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM fusion_cache 
  WHERE expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically clean up expired entries (optional)
-- This would run on updates but might be too frequent for production
-- CREATE OR REPLACE FUNCTION auto_cleanup_fusion_cache()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM cleanup_expired_fusion_cache();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Add RLS policies if needed (optional, depends on your security model)
-- ALTER TABLE fusion_cache ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (if you want cache to be publicly readable)
-- CREATE POLICY "Public read access for fusion cache" ON fusion_cache
--   FOR SELECT USING (true);

-- Policy for service role write access (for backend services)
-- CREATE POLICY "Service role write access for fusion cache" ON fusion_cache
--   FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments for documentation
COMMENT ON TABLE fusion_cache IS 'Cache table for storing fusion generation results to avoid duplicate AI API calls';
COMMENT ON COLUMN fusion_cache.cache_key IS 'SHA-256 hash of movie_ids + constraints for unique identification';
COMMENT ON COLUMN fusion_cache.movie_ids IS 'JSON array of sorted movie IDs used in the fusion';
COMMENT ON COLUMN fusion_cache.constraints IS 'User-provided constraints for the fusion generation';
COMMENT ON COLUMN fusion_cache.fusion_data IS 'Complete AI-generated fusion result as JSONB';
COMMENT ON COLUMN fusion_cache.expires_at IS 'Timestamp when this cache entry should expire';
COMMENT ON COLUMN fusion_cache.access_count IS 'Number of times this cached fusion has been accessed';
COMMENT ON COLUMN fusion_cache.last_accessed IS 'Last time this cache entry was accessed';
