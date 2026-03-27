import { Movie, TMDBResponse, Genre } from '@/types';
import { supabase } from './supabase';

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.tmdb.org/3';
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;

if (!TMDB_READ_TOKEN) {
  throw new Error('TMDB_READ_TOKEN is required in environment variables');
}

// Server-side fetch helper
async function tmdbFetch<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  
  // Add parameters
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`TMDB API Error: ${response.status} - ${errorData.status_message || response.statusText}`);
  }

  return response.json();
}

// Cache for genres to avoid repeated API calls
let genresCache: any[] = [];

// Get genres from TMDB with caching
export async function getGenres(): Promise<any[]> {
  if (genresCache.length > 0) return genresCache;
  
  try {
    const response = await tmdbFetch<any>('/genre/movie/list');
    genresCache = response.genres || [];
    return genresCache;
  } catch (error) {
    console.error('Error fetching genres:', error);
    return [];
  }
}

// Search movies with genre mapping
export async function searchMovies(query: string, page = 1): Promise<{ results: Movie[], page: number, total_pages: number, total_results: number }> {
  if (!query.trim()) {
    return {
      results: [],
      page: 1,
      total_pages: 0,
      total_results: 0,
    };
  }

  try {
    const [response, genres] = await Promise.all([
      tmdbFetch<any>('/search/movie', { query, page, include_adult: false }),
      getGenres()
    ]);
    
    return {
      results: response.results.map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: JSON.stringify(movie.genre_ids || []),
        genres: genres.filter(genre => movie.genre_ids?.includes(genre.id)),
      })),
      page: response.page,
      total_pages: response.total_pages,
      total_results: response.total_results,
    };
  } catch (error) {
    console.error('Error searching movies:', error);
    throw error;
  }
}

// Get popular movies with genre mapping
export async function getPopularMovies(page = 1): Promise<{ results: Movie[], page: number, total_pages: number, total_results: number }> {
  try {
    const [response, genres] = await Promise.all([
      tmdbFetch<any>('/movie/popular', { page }),
      getGenres()
    ]);
    
    return {
      results: response.results.map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: JSON.stringify(movie.genre_ids || []),
        genres: genres.filter(genre => movie.genre_ids?.includes(genre.id)),
      })),
      page: response.page,
      total_pages: response.total_pages,
      total_results: response.total_results,
    };
  } catch (error) {
    console.error('Error getting popular movies:', error);
    throw error;
  }
}

// Get movie details by TMDB ID
export async function getMovieDetails(id: string): Promise<any> {
  try {
    const response = await tmdbFetch(`/movie/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    throw error;
  }
}

// Get movie credits by TMDB ID
export async function getMovieCredits(id: string): Promise<{ cast: any[], crew: any[] }> {
  try {
    const response = await tmdbFetch<any>(`/movie/${id}/credits`);
    return response;
  } catch (error) {
    console.error('Error fetching movie credits:', error);
    throw error;
  }
}

// Save movie to database
export async function saveMovie(movie: any): Promise<any> {
  try {
    const { data: existingData, error: dbError } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', movie.id)
      .limit(1);
    if (dbError) throw dbError;
    
    if (!existingData || existingData.length === 0) {
      // Insert new movie
      const { data: newMovies, error: insertError } = await supabase
        .from('movies')
        .insert({
          id: crypto.randomUUID(),
          tmdb_id: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genre_ids: JSON.stringify(movie.genre_ids || []),
          created_at: new Date().toISOString(),
        })
        .select();
      if (insertError) throw insertError;
      return newMovies?.[0];
    }
    
    return existingData[0];
  } catch (error) {
    console.error('Error saving movie:', error);
    throw error;
  }
}

// Get movie poster URL
export function getMoviePosterUrl(posterPath: string | null, size = 'w500'): string {
  if (!posterPath) return '/placeholder-movie.png';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

// Get movie backdrop URL
export function getMovieBackdropUrl(backdropPath: string | null, size = 'w1280'): string {
  if (!backdropPath) return '/placeholder-backdrop.jpg';
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
}
