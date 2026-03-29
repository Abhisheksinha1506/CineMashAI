const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

// Import database functions for fusion handling
import { supabaseServer } from './supabase-server';

// Server-side fetch helper
async function tmdbFetch(endpoint: string, params: Record<string, any> = {}): Promise<any> {
  const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
  if (!TMDB_READ_TOKEN) {
    throw new Error('TMDB_READ_TOKEN is required in environment variables');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  
  // Add other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CineMash-AI/1.0',
    },
    // Server-side caching for 1 hour
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`TMDB API Error: ${response.status} - ${errorData.status_message || response.statusText}`);
  }

  return response.json();
}

// Search movies
export async function searchMovies(query: string, page = 1): Promise<any> {
  if (!query.trim()) {
    return { results: [], page: 1, total_pages: 0, total_results: 0 };
  }

  try {
    const response = await tmdbFetch('/search/movie', { query, page, include_adult: false });
    return response;
  } catch (error) {
    console.error('Error searching movies:', error);
    throw error;
  }
}

// Get popular movies
export async function getPopularMovies(page = 1): Promise<any> {
  try {
    const response = await tmdbFetch('/movie/popular', { page });
    return response;
  } catch (error) {
    console.error('Error getting popular movies:', error);
    throw error;
  }
}

// Get movie details
export async function getMovieDetails(id: string): Promise<any> {
  try {
    const response = await tmdbFetch(`/movie/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
}

// Get movie credits
export async function getMovieCredits(id: string): Promise<any> {
  try {
    const response = await tmdbFetch(`/movie/${id}/credits`);
    return response;
  } catch (error) {
    console.error('Error fetching movie credits:', error);
    throw error;
  }
}

// Search for a person by name
export async function searchPerson(query: string): Promise<any> {
  if (!query.trim()) {
    return { results: [], page: 1, total_pages: 0, total_results: 0 };
  }

  try {
    const response = await tmdbFetch('/search/person', { query, include_adult: false });
    return response;
  } catch (error) {
    console.error('Error searching person:', error);
    throw error;
  }
}

// Get movie poster URL
export function getMoviePosterUrl(posterPath: string | null, size = 'w500'): string {
  if (!posterPath) return '/placeholder-movie.png';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

// Check if an ID is a fusion movie and fetch its details
export async function getFusionDetails(id: string): Promise<any> {
  try {
    const { data, error } = await supabaseServer
      .from('fusions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    // Parse fusion data and source movies
    const fusionData = typeof data.fusion_data === 'string' 
      ? JSON.parse(data.fusion_data) 
      : data.fusion_data;
    
    const sourceMovies = typeof data.source_movies === 'string' 
      ? JSON.parse(data.source_movies) 
      : data.source_movies || [];

    // Create a TMDB-compatible structure for the fusion movie
    return {
      id: data.id,
      title: fusionData.title || 'Untitled Fusion',
      overview: fusionData.synopsis || 'A fusion of multiple movies',
      poster_path: null, // Fusion movies don't have TMDB posters
      release_date: new Date(data.created_at).toISOString().split('T')[0],
      vote_average: 0,
      popularity: 0,
      genre_ids: [],
      // Add fusion-specific metadata
      isFusion: true,
      fusionData: fusionData,
      sourceMovies: sourceMovies,
      share_token: data.share_token,
      upvotes: data.upvotes || 0,
      created_at: data.created_at
    };
  } catch (error) {
    console.error('Error fetching fusion details:', error);
    return null;
  }
}

// Enhanced movie details function that handles both TMDB and fusion movies
export async function getMovieDetailsOrFusion(id: string): Promise<any> {
  // First try to get fusion details (in case it's a fusion movie)
  const fusionDetails = await getFusionDetails(id);
  if (fusionDetails) {
    return fusionDetails;
  }

  // If not a fusion, try to get TMDB details
  try {
    return await getMovieDetails(id);
  } catch (error) {
    // If TMDB also fails, throw a more descriptive error
    throw new Error(`Unable to find movie with ID "${id}". It's neither a valid TMDB movie nor a fusion movie.`);
  }
}
