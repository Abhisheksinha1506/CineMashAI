import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config({ path: '.env' });

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_READ_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables in .env');
  console.log({
    TMDB_READ_TOKEN: TMDB_READ_TOKEN ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'
  });
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const START_YEAR = 1986;
const END_YEAR = 2026;
const REQUESTS_PER_SECOND = 30; 
const DELAY_BETWEEN_REQUESTS = 1000 / REQUESTS_PER_SECOND;

const args = process.argv.slice(2);
const limitFlagIndex = args.indexOf('--limit');
const LIMIT = limitFlagIndex !== -1 ? parseInt(args[limitFlagIndex + 1]) : Infinity;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || 5;
      console.warn(`⚠️ TMDB Rate limited. Waiting ${retryAfter} seconds...`);
      await sleep(retryAfter * 1000);
      return fetchTMDB(endpoint, params);
    }
    const errText = await response.text();
    throw new Error(`TMDB API error: ${response.status} ${response.statusText} - ${errText}`);
  }
  return response.json();
}

async function getLastProcessedYear() {
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('release_date')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data && data.length > 0 && data[0].release_date) {
      const year = new Date(data[0].release_date).getFullYear();
      if (!isNaN(year)) return year;
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch last processed year, starting from default:', err.message);
  }
  return START_YEAR;
}

async function ingestMovies() {
  const resumeYear = await getLastProcessedYear();
  const actualStartYear = Math.max(START_YEAR, resumeYear);
  
  console.log(`🎬 Starting Movie Ingestion (${actualStartYear} - ${END_YEAR})`);
  if (actualStartYear > START_YEAR) {
    console.log(`🔄 Resuming from last record year: ${actualStartYear}`);
  }
  console.log(`🚀 Limit set to: ${LIMIT === Infinity ? 'Unlimited' : LIMIT}`);
  
  let totalIngested = 0;

  for (let year = actualStartYear; year <= END_YEAR; year++) {
    if (totalIngested >= LIMIT) break;
    
    console.log(`\n📅 Processing Year: ${year}`);
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && totalIngested < LIMIT) {
      try {
        const data = await fetchTMDB('/discover/movie', {
          primary_release_year: year,
          sort_by: 'popularity.desc',
          page: page,
          'vote_count.gte': 10
        });

        totalPages = Math.min(data.total_pages, 220); 
        const movies = data.results;

        for (const movie of movies) {
          if (totalIngested >= LIMIT) break;

          try {
            // Fetch credits
            const details = await fetchTMDB(`/movie/${movie.id}`, {
              append_to_response: 'credits'
            });

            const cast = (details.credits?.cast || [])
              .slice(0, 10)
              .map(c => ({
                id: c.id,
                name: c.name,
                role: c.character,
                profile_path: c.profile_path
              }));

            const movieData = {
              id: crypto.randomUUID(),
              tmdb_id: movie.id,
              title: movie.title,
              overview: movie.overview || '',
              poster_path: movie.poster_path,
              release_date: movie.release_date,
              vote_average: movie.vote_average,
              popularity: movie.popularity,
              genre_ids: JSON.stringify(movie.genre_ids || []),
              cast: JSON.stringify(cast),
            };

            const { error } = await supabase
              .from('movies')
              .upsert(movieData, { onConflict: 'tmdb_id' });

            if (error) {
              console.error(`\n❌ Error ingesting "${movie.title}":`, error.message);
            } else {
              totalIngested++;
              process.stdout.write(`✅ [${totalIngested}] Ingested: ${movie.title} (${year})\r`);
            }

            // Respect rate limit
            await sleep(DELAY_BETWEEN_REQUESTS);
          } catch (err) {
            console.error(`\n❌ Failed to fetch details for movie ${movie.id}:`, err.message);
          }
        }

        page++;
      } catch (err) {
        console.error(`\n❌ Error fetching page ${page} for year ${year}:`, err.message);
        await sleep(2000);
        page++; 
      }
    }
  }

  console.log(`\n\n🎉 Ingestion Complete! Total movies ingested: ${totalIngested}`);
}

ingestMovies().catch(err => {
  console.error('\n💥 FATAL ERROR:', err);
  process.exit(1);
});
