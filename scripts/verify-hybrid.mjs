import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyHybridSearch() {
  console.log('🧪 Starting Hybrid Search Verification');

  // Test 1: Known DB Movie (Inception)
  console.log('\n--- Test 1: Known DB Movie (Inception) ---');
  const start1 = Date.now();
  const response1 = await fetch('http://localhost:3000/api/movies/search?q=Inception');
  const data1 = await response1.json();
  const end1 = Date.now();
  
  console.log(`⏱️ Response Time: ${end1 - start1}ms`);
  console.log(`📦 Source: ${data1.source}`);
  console.log(`🎬 Results: ${data1.results.length}`);

  // Test 2: Obscure/New Movie (should trigger API fallback)
  // Let's search for something specific like "Everything Everywhere All At Once" if it wasn't in top 50 pages of 2022
  // Or just a very specific title.
  const obscureTitle = 'Poor Things'; 
  console.log(`\n--- Test 2: API Fallback for "${obscureTitle}" ---`);
  
  // First, verify it's NOT in DB
  const { data: before } = await supabase.from('movies').select('id').ilike('title', obscureTitle).single();
  console.log(`🔍 Exists in DB before? ${!!before}`);

  const start2 = Date.now();
  const response2 = await fetch(`http://localhost:3000/api/movies/search?q=${encodeURIComponent(obscureTitle)}`);
  const data2 = await response2.json();
  const end2 = Date.now();

  console.log(`⏱️ Response Time: ${end2 - start2}ms`);
  console.log(`📦 Source: ${data2.source}`);
  
  // Wait a few seconds for background sync
  console.log('⏳ Waiting for background sync...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const { data: after } = await supabase.from('movies').select('id').ilike('title', obscureTitle).limit(1);
  console.log(`🔍 Exists in DB after sync? ${after && after.length > 0}`);
}

verifyHybridSearch().catch(console.error);
