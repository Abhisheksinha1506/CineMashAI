export interface Movie {
  id: string;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  genres?: Genre[];
  cast?: CastMember[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: string;
  name: string;
  role: string;
  reason: string;
  why_fit?: string; // New: AI's reasoning based on past roles
  headshotUrl: string;
  actorId?: number; // Add actorId for compatibility with FusionData
}

export interface Scene {
  id: string;
  title: string;
  scene?: string; // For compatibility with new schema
  description: string;
  imageUrl: string;
}

export interface FusionData {
  title: string;
  tagline: string;
  synopsis: string;
  keyScenes: Array<{
    title: string;
    description: string;
    imageUrl: string;
  }>;
  suggestedCast: Array<{
    name: string;
    role: string;
    reason: string;
    why_fit?: string; // AI's reasoning based on past roles
    headshotUrl: string;
    actorId?: number;
  }>;
  runtime: number;
  rating: string;
  boxOffice: string;
}

export interface FusionResult {
  id: string;
  title: string;
  tagline: string;
  synopsis: string;
  posterUrl: string;
  key_scenes?: Scene[]; // Legacy compatibility
  keyScenes: Scene[];   // Current usage
  suggested_cast?: CastMember[]; // Legacy compatibility
  suggestedCast: CastMember[];   // Current usage
  runtime: string | number;
  rating: string;
  boxOffice: string;
  box_office_vibe: string;
  movie_ids?: string[];
  sourceMovies: Movie[];
  share_token?: string;
}

export interface Fusion {
  id: string;
  share_token: string;
  movie1_id: string;
  movie2_id: string;
  movie1: Movie;
  movie2: Movie;
  fusion_image_url: string;
  prompt: string;
  created_at: string;
  likes: number;
}

export interface TMDBResponse {
  results: Movie[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface AIResponse {
  image_url: string;
  revised_prompt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}
