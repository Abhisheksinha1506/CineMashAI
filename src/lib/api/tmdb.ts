import axios from 'axios';
import { Movie, TMDBResponse, Genre } from '@/types';

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    Authorization: `Bearer ${TMDB_READ_TOKEN}`,
  },
});

// Cache for genres to avoid repeated API calls
let genresCache: Genre[] = [];

export async function getGenres(): Promise<Genre[]> {
  if (genresCache.length > 0) return genresCache;
  
  try {
    const response = await tmdbApi.get('/genre/movie/list');
    genresCache = response.data.genres || [];
    return genresCache;
  } catch (error) {
    console.error('Error fetching genres:', error);
    genresCache = [];
    return [];
  }
}

export async function searchMovies(query: string, page = 1): Promise<TMDBResponse> {
  try {
    const [response, genres] = await Promise.all([
      tmdbApi.get('/search/movie', {
        params: {
          query,
          page,
          include_adult: false,
        },
      }),
      getGenres()
    ]);
    
    return {
      results: response.data.results.map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: movie.genre_ids,
        genres: genres.filter(genre => movie.genre_ids.includes(genre.id)),
      })),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  } catch (error) {
    console.error('Error searching movies:', error);
    throw error;
  }
}

export async function getPopularMovies(page = 1): Promise<TMDBResponse> {
  try {
    const [response, genres] = await Promise.all([
      tmdbApi.get('/movie/popular', {
        params: {
          page,
        },
      }),
      getGenres()
    ]);
    
    return {
      results: response.data.results.map((movie: any) => ({
        id: movie.id.toString(),
        title: movie.title,
        overview: movie.overview,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: movie.genre_ids,
        genres: genres.filter(genre => movie.genre_ids.includes(genre.id)),
      })),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  } catch (error) {
    console.error('Error getting popular movies:', error);
    throw error;
  }
}

export function getMoviePosterUrl(posterPath: string | null, size = 'w500'): string {
  if (!posterPath) return '/placeholder-movie.jpg';
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export async function getMovieCast(movieId: string): Promise<any[]> {
  try {
    const response = await tmdbApi.get(`/movie/${movieId}/credits`);
    return response.data.cast.slice(0, 10); // Get top 10 cast members
  } catch (error) {
    console.error('Error fetching movie cast:', error);
    return [];
  }
}
