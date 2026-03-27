import { unstable_cache } from 'next/cache';
import { supabaseServer } from '@/lib/supabase-server';
import { Navbar } from '@/components/layout/navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Sparkles, Calendar, Clock, Film } from 'lucide-react';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import Link from 'next/link';
import ClientFusionSharePage from '@/components/fusion/ClientFusionSharePage';

// Static generation with ISR - revalidate every hour
export const revalidate = 3600;
export const dynamic = 'auto';

// Cache fusion data by share token
const getCachedFusionByToken = unstable_cache(
  async (shareToken: string) => {
    try {
      const { data: dbData, error: dbError } = await supabaseServer
        .from('fusions')
        .select('*')
        .eq('share_token', shareToken)
        .limit(1);
      if (dbError) throw dbError;
      const fusion = dbData?.[0];

      if (!fusion) {
        return {
          success: false,
          error: 'Fusion not found',
          data: null
        };
      }

      // Parse fusion data
      let fusionData;
      let movieIds: number[] = [];
      try {
        fusionData = typeof fusion.fusion_data === 'string' ? JSON.parse(fusion.fusion_data) : fusion.fusion_data;
        movieIds = typeof fusion.movie_ids === 'string' ? JSON.parse(fusion.movie_ids) : fusion.movie_ids;
      } catch {
        fusionData = {};
        movieIds = [];
      }

      return {
        success: true,
        data: {
          id: fusion.id,
          shareToken: fusion.share_token,
          movieIds,
          fusionData,
          createdAt: fusion.created_at,
          upvotes: fusion.upvotes || 0,
        },
        error: null
      };
    } catch (error) {
      console.error('Fusion fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch fusion',
        data: null
      };
    }
  },
  ['fusion', 'share-token'],
  { 
    revalidate: 3600, // 1 hour
    tags: ['fusion', 'share-token']
  }
);

export default async function FusionSharePage({
  params
}: {
  params: Promise<{ share_token: string }>;
}) {
  const { share_token } = await params;
  
  // Get cached fusion data server-side
  const result = await getCachedFusionByToken(share_token);
  
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      
      <ClientFusionSharePage 
        initialData={result}
        shareToken={share_token}
      />
      
    </div>
  );
}
