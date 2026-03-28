import { Suspense } from 'react';
import { StudioClient } from '@/components/studio/StudioClient';
import { Loader2 } from 'lucide-react';
import { getPopularMovies } from '@/lib/tmdb-simple';

export default async function StudioPage() {
  // Pre-fetch trending/popular movies on the server
  let initialTrendingMovies = [];
  try {
    const popularResponse = await getPopularMovies(1);
    initialTrendingMovies = popularResponse.results.slice(0, 20);
  } catch (error) {
    console.error('Error pre-fetching trending movies:', error);
  }

  return (
    <Suspense 
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen bg-black">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin" />
            <p className="text-[var(--primary)] font-black uppercase tracking-widest text-xs">
              Loading Studio...
            </p>
          </div>
        </div>
      }
    >
      <StudioClient key="studio-page" resetKey={Date.now()} initialTrendingMovies={initialTrendingMovies} />
    </Suspense>
  );
}
