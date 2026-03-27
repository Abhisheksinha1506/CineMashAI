-- CineMash AI Database Schema
-- Matches Technical Documentation exactly

-- Movies Table
CREATE TABLE movies (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  poster_path TEXT,
  release_date TEXT,
  vote_average REAL,
  genre_ids TEXT, -- JSON array
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fusions Table
CREATE TABLE fusions (
  id TEXT PRIMARY KEY,
  share_token TEXT UNIQUE NOT NULL,
  movie_ids TEXT NOT NULL, -- JSON array of TMDB movie objects
  fusion_data TEXT NOT NULL, -- Full AI response as JSON
  ip_hash TEXT, -- for anonymous tracking
  created_at TIMESTAMP DEFAULT NOW(),
  upvotes INTEGER DEFAULT 0
);

-- Fusion Votes Table
CREATE TABLE fusion_votes (
  id TEXT PRIMARY KEY,
  fusion_id TEXT NOT NULL REFERENCES fusions(share_token),
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Token Usage Table
CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  tokens_used INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id);
CREATE INDEX idx_fusions_share_token ON fusions(share_token);
CREATE INDEX idx_fusions_upvotes ON fusions(upvotes DESC);
CREATE INDEX idx_fusions_created_at ON fusions(created_at DESC);
CREATE INDEX idx_fusion_votes_fusion_id ON fusion_votes(fusion_id);
CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, date);

-- Row Level Security (RLS)
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fusion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Movies: Read access for all users
CREATE POLICY "Anyone can view movies" ON movies FOR SELECT USING (true);

-- Fusions: Read access for all users, insert for anonymous users
CREATE POLICY "Anyone can view fusions" ON fusions FOR SELECT USING (true);
CREATE POLICY "Anonymous users can create fusions" ON fusions FOR INSERT WITH CHECK (true);

-- Fusion Votes: Read access for all users, insert for anonymous users
CREATE POLICY "Anyone can view fusion votes" ON fusion_votes FOR SELECT USING (true);
CREATE POLICY "Anonymous users can vote" ON fusion_votes FOR INSERT WITH CHECK (true);

-- Token Usage: Read access for service, insert for anonymous users
CREATE POLICY "Service can view token usage" ON token_usage FOR SELECT USING (true);
CREATE POLICY "Anonymous users can create token usage" ON token_usage FOR INSERT WITH CHECK (true);
