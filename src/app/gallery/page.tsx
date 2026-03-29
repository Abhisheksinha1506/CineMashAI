import { unstable_cache } from 'next/cache';
import { supabaseServer } from '@/lib/supabase-server';
import { Navbar } from '@/components/layout/navbar';
import { GalleryFusionCard } from '@/components/gallery/GalleryFusionCard';
import { EnhancedGalleryFusionCard } from '@/components/gallery/EnhancedGalleryFusionCard';
import { FilmStripLoader } from '@/components/gallery/FilmStripLoader';
import { Search, Filter, ArrowRight, ArrowUp, Film, Flame, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ClientGalleryPage from '@/components/gallery/ClientGalleryPage';

// Static generation with ISR - revalidate every 5 minutes
export const revalidate = 300;
export const dynamic = 'auto';

// Cache gallery data with Next.js unstable_cache
const getCachedGalleryData = unstable_cache(
  async (sort: string, limit: number) => {
    try {
      let resultsData;

      if (sort === 'popular') {
        const { data, error } = await supabaseServer
          .from('fusions')
          .select('*')
          .not('ip_hash', 'like', '%sample%')
          .order('upvotes', { ascending: false })
          .limit(limit);
        if (error) throw error;
        resultsData = data;
      } else {
        const { data, error } = await supabaseServer
          .from('fusions')
          .select('*')
          .not('ip_hash', 'like', '%sample%')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        resultsData = data;
      }

      // Map database results to frontend format with enhanced cast data handling
      const formattedResults = resultsData.map((fusion: any) => {
        let movieIds = [];
        let fusionData: any = {};
        
        try {
          movieIds = typeof fusion.movie_ids === 'string' ? JSON.parse(fusion.movie_ids) : fusion.movie_ids;
          fusionData = typeof fusion.fusion_data === 'string' ? JSON.parse(fusion.fusion_data) : fusion.fusion_data;
          
          // Ensure cast data is properly formatted and has valid headshot URLs
          if (fusionData.suggestedCast || fusionData.suggested_cast) {
            const castArray = fusionData.suggestedCast || fusionData.suggested_cast || [];
            const validatedCast = castArray.map((castMember: any, index: number) => ({
              ...castMember,
              id: castMember.id || index.toString(),
              name: castMember.name || 'Unknown Actor',
              role: castMember.role || 'TBD',
              headshotUrl: castMember.headshotUrl && castMember.headshotUrl.startsWith('http') 
                ? castMember.headshotUrl 
                : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop`,
              reason: castMember.reason || castMember.why_fit || 'Perfect fit for this role',
              why_fit: castMember.why_fit || castMember.reason || 'Perfect fit for this role'
            }));
            
            fusionData.suggestedCast = validatedCast;
            fusionData.suggested_cast = validatedCast;
          }
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
      console.error('Gallery fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch gallery',
        data: [],
        served_from_cache: false,
        cache_age_seconds: 0,
        cache_hit_count: 0
      };
    }
  },
  ['gallery', 'fusions'],
  { 
    revalidate: 300, // 5 minutes
    tags: ['gallery', 'fusions']
  }
);

export default async function GalleryPage() {
  // Fetch initial data server-side
  const initialResult = await getCachedGalleryData('newest', 24);
  
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      
      <ClientGalleryPage initialData={initialResult} />
    </div>
  );
}
