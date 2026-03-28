import { supabaseServer } from './supabase-server';
import { Movie } from './schema';
import crypto from 'crypto';

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

async function tmdbFetch(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
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

  if (!response.ok) return null;
  return response.json();
}

/**
 * Searches for movies in the local database first (fuzzy search),
 * then falls back to TMDB if results are insufficient.
 */
export async function searchMoviesHybrid(query: string, page = 1) {
  if (!query.trim()) return { results: [], page: 1, total_pages: 0 };

  // 1. Try Local Database (Fuzzy Search)
  const { data: localResults, error } = await supabaseServer
    .from('movies')
    .select('*')
    .ilike('title', `%${query}%`)
    .order('popularity', { ascending: false })
    .limit(20);

  if (!error && localResults && localResults.length >= 1) {
    return {
      results: localResults.map(parseMovieFromDB),
      page: 1,
      total_pages: 1,
      source: 'database'
    };
  }

  // 2. Fallback to TMDB
  console.log(`🌐 API Fallback for "${query}"`);
  const tmdbData = await tmdbFetch('/search/movie', { query, page, include_adult: false });
  
  if (!tmdbData || !tmdbData.results) {
    return { results: [], page: 1, total_pages: 0, source: 'none' };
  }

  // 3. Background Sync: Upsert new movies into DB
  // We don't await this to keep the response fast, but we trigger details/credits fetch.
  syncMoviesToDB(tmdbData.results.slice(0, 5));

  return {
    results: tmdbData.results,
    page: tmdbData.page,
    total_pages: tmdbData.total_pages,
    source: 'api'
  };
}

/**
 * Helper to sync movies from TMDB results into Supabase.
 * Fetches full details and credits for each movie.
 */
async function syncMoviesToDB(tmdbMovies: any[]) {
  for (const movie of tmdbMovies) {
    try {
      // Check if already exists to avoid redundant detail fetches
      const { data: existing } = await supabaseServer
        .from('movies')
        .select('id')
        .eq('tmdb_id', movie.id)
        .single();

      if (existing) continue;

      // Fetch full details + credits
      const details = await tmdbFetch(`/movie/${movie.id}`, { append_to_response: 'credits' });
      if (!details) continue;

      const cast = (details.credits?.cast || [])
        .slice(0, 10)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.character,
          profile_path: c.profile_path
        }));

      const movieData = {
        id: crypto.randomUUID(),
        tmdb_id: details.id,
        title: details.title,
        overview: details.overview || '',
        poster_path: details.poster_path,
        release_date: details.release_date,
        vote_average: details.vote_average,
        popularity: details.popularity,
        genre_ids: JSON.stringify(details.genres?.map((g: any) => g.id) || []),
        cast: JSON.stringify(cast),
      };

      await supabaseServer.from('movies').upsert(movieData, { onConflict: 'tmdb_id' });
    } catch (err) {
      console.error(`❌ Sync failed for movie ${movie.id}:`, err);
    }
  }
}

function parseMovieFromDB(dbMovie: any) {
  const tmdbId = dbMovie.tmdb_id || 0;
  return {
    ...dbMovie,
    id: tmdbId.toString(),
    genre_ids: typeof dbMovie.genre_ids === 'string' ? JSON.parse(dbMovie.genre_ids) : dbMovie.genre_ids,
    cast: typeof dbMovie.cast === 'string' ? JSON.parse(dbMovie.cast) : dbMovie.cast
  };
}
