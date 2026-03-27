import { getPopularMovies } from '@/lib/api/tmdb-client';
import HomePageClient from '@/components/home/HomePageClient';

// Dynamic rendering with ISR - revalidate every 30 minutes
export const revalidate = 1800;
export const dynamic = 'force-dynamic';

async function getHomeData() {
  try {
    // For static generation, we need to use the full URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Fetch popular movies with caching
    const movies = await getPopularMovies(1, { timeout: 8000 });
    
    // Fetch trending fusions from API
    const fusionRes = await fetch(`${baseUrl}/api/trending?limit=3`, {
      cache: 'force-cache',
      next: { revalidate: 300 }
    });
    const fusionData = await fusionRes.json();
    
    return {
      popularMovies: movies.results.slice(0, 18),
      trendingFusions: fusionData.success ? fusionData.data : []
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      popularMovies: [],
      trendingFusions: []
    };
  }
}

export default async function HomePage() {
  const { popularMovies, trendingFusions } = await getHomeData();
  
  return <HomePageClient popularMovies={popularMovies} trendingFusions={trendingFusions} />;
}
