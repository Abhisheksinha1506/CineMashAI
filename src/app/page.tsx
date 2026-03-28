import { getPopularMovies } from '@/lib/api/tmdb-client';
import HomePageClient from '@/components/home/HomePageClient';

// Dynamic rendering with ISR - revalidate every 30 minutes
export const revalidate = 1800;
export const dynamic = 'force-dynamic';

async function getHomeData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Fetch trending fusions from API
    let trendingFusions = [];
    try {
      const fusionRes = await fetch(`${baseUrl}/api/trending?limit=3`, {
        cache: 'force-cache',
        next: { revalidate: 300 }
      });
      const fusionData = await fusionRes.json();
      trendingFusions = fusionData.success ? fusionData.data : [];
    } catch (e) {
      console.warn('Trending fetch failed:', e);
    }
    
    return {
      trendingFusions
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      trendingFusions: []
    };
  }
}

export default async function HomePage() {
  const { trendingFusions } = await getHomeData();
  
  return <HomePageClient popularMovies={[]} trendingFusions={trendingFusions} />;
}
