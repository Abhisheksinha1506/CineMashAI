import { unstable_cache } from 'next/cache';
import { supabaseServer } from '@/lib/supabase-server';
import { Navbar } from '@/components/layout/navbar';
import { TrendingPageSidebar } from '@/components/trending/TrendingPageSidebar';
import { FeaturedFusionCard } from '@/components/trending/FeaturedFusionCard';
import { GalleryFusionCard } from '@/components/gallery/GalleryFusionCard';
import { TrendingUp, ArrowUp, Zap, Film } from 'lucide-react';
import Link from 'next/link';
import ClientTrendingPage from '@/components/trending/ClientTrendingPage';

// Static generation with ISR - revalidate every 5 minutes
export const revalidate = 300;
export const dynamic = 'auto';

// Cache trending data with Next.js unstable_cache
const getCachedTrendingData = unstable_cache(
  async (limit: number) => {
    try {
      const { data, error } = await supabaseServer
        .from('fusions')
        .select('*')
        .order('upvotes', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Map database results to frontend format
      const formattedResults = data.map((fusion: any) => {
        let movieIds = [];
        let fusionData = {};
        
        try {
          movieIds = typeof fusion.movie_ids === 'string' ? JSON.parse(fusion.movie_ids) : fusion.movie_ids;
          fusionData = typeof fusion.fusion_data === 'string' ? JSON.parse(fusion.fusion_data) : fusion.fusion_data;
        } catch (e) {
          console.error('Error parsing fusion data:', e);
        }

        return {
          id: fusion.id,
          share_token: fusion.share_token,
          createdAt: fusion.created_at,
          upvotes: fusion.upvotes || 0,
          movieIds,
          ...fusionData as any
        };
      });

      return {
        success: true,
        data: formattedResults,
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    } catch (error) {
      console.error('Trending fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch trending fusions',
        data: [],
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    }
  },
  ['trending', 'fusions'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['trending', 'fusions']
  }
);

export default async function TrendingPage() {
  // Fetch initial data server-side
  const initialResult = await getCachedTrendingData(24);
  
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      
      <ClientTrendingPage initialData={initialResult} />
    </div>
  );
}
