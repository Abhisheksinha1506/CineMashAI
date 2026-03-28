const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

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
