import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });

const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkIds(imdbIds) {
  for (const imdbId of imdbIds) {
    console.log(`\n🔍 Checking IMDB ID: ${imdbId}`);
    
    // 1. Resolve to TMDB ID
    const url = new URL(`${TMDB_BASE_URL}/find/${imdbId}`);
    url.searchParams.append('external_source', 'imdb_id');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${TMDB_READ_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    const movie = data.movie_results?.[0];
    
    if (!movie) {
      console.log('❌ No TMDB mapping found for this IMDB ID.');
      continue;
    }
    
    const tmdbId = movie.id;
    console.log(`✅ TMDB ID found: ${tmdbId} - ${movie.title}`);
    
    // 2. Check Supabase
    const { data: dbMovie, error } = await supabase
      .from('movies')
      .select('title, release_date')
      .eq('tmdb_id', tmdbId)
      .single();
    
    if (error || !dbMovie) {
      console.log('🏢 Status: NOT in database.');
    } else {
      console.log(`🏢 Status: FOUND in database: ${dbMovie.title} (${dbMovie.release_date})`);
    }
  }
}

checkIds(['tt39139925', 'tt33014583']).catch(console.error);
