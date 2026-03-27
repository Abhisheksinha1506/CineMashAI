// Supabase table definitions matching Technical Documentation exactly

// Movies Table - matches technical documentation
export const movies = {
  name: 'movies',
  columns: {
    id: 'TEXT PRIMARY KEY',
    tmdb_id: 'INTEGER UNIQUE NOT NULL',
    title: 'TEXT NOT NULL',
    overview: 'TEXT NOT NULL',
    poster_path: 'TEXT',
    release_date: 'TEXT',
    vote_average: 'REAL',
    genre_ids: 'TEXT', // JSON array
    created_at: 'TIMESTAMP DEFAULT NOW()'
  }
};

// Fusions Table - matches technical documentation
export const fusions = {
  name: 'fusions',
  columns: {
    id: 'TEXT PRIMARY KEY',
    share_token: 'TEXT UNIQUE NOT NULL',
    movie_ids: 'TEXT NOT NULL', // JSON array of TMDB movie objects
    fusion_data: 'TEXT NOT NULL', // Full AI response as JSON
    ip_hash: 'TEXT', // for anonymous tracking
    created_at: 'TIMESTAMP DEFAULT NOW()',
    upvotes: 'INTEGER DEFAULT 0'
  }
};

// Fusion Votes Table - matches technical documentation
export const fusionVotes = {
  name: 'fusion_votes',
  columns: {
    id: 'TEXT PRIMARY KEY',
    fusion_id: 'TEXT NOT NULL REFERENCES fusions(share_token)',
    vote_type: 'TEXT CHECK (vote_type IN (\'up\', \'down\'))',
    ip_hash: 'TEXT NOT NULL',
    created_at: 'TIMESTAMP DEFAULT NOW()'
  }
};

// Token Usage Table - matches technical documentation
export const tokenUsage = {
  name: 'token_usage',
  columns: {
    id: 'TEXT PRIMARY KEY',
    user_id: 'TEXT NOT NULL',
    date: 'TEXT NOT NULL', // YYYY-MM-DD format
    tokens_used: 'INTEGER DEFAULT 0'
  }
};

// TypeScript types matching exact database schema
export interface Movie {
  id: string;
  tmdb_id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  created_at: string;
}

export interface Fusion {
  id: string;
  share_token: string;
  movie_ids: string; // JSON string
  fusion_data: string; // JSON string
  ip_hash: string | null;
  created_at: string;
  upvotes: number;
}

export interface FusionVote {
  id: string;
  fusion_id: string;
  vote_type: 'up' | 'down';
  ip_hash: string;
  created_at: string;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  tokens_used: number;
}

// Insert types
export type NewFusion = Omit<Fusion, 'id' | 'created_at' | 'upvotes'>;
export type NewVote = Omit<FusionVote, 'id' | 'created_at'>;
export type NewTokenUsage = Omit<TokenUsage, 'id'>;
