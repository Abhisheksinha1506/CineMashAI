'use client';

import { useState, useEffect } from 'react';
import { Heart, Eye, TrendingUp, Zap } from 'lucide-react';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PopularFusionsProps {
  className?: string;
}

export function Sidebar({ className }: PopularFusionsProps) {
  const [popularFusions, setPopularFusions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const response = await fetch('/api/gallery?sort=popular&limit=5');
        const result = await response.json();
        if (result.success) {
          setPopularFusions(result.data);
        }
      } catch (error) {
        console.error('Error fetching popular fusions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPopular();
  }, []);

  return (
    <div className={cn(
      'w-72 hidden lg:flex flex-col gap-0 border-l border-white/[0.05] overflow-y-auto custom-scrollbar',
      className
    )}>
      {/* Header */}
      <div className="p-5 border-b border-white/[0.05] glass-strong sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-[#00f0ff]" />
          </div>
          <div>
            <h3 className="text-[13px] font-black tracking-wider text-white uppercase">
              Trending
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium">Most popular fusions</p>
          </div>
        </div>
      </div>

      {/* Fusions list */}
      <div className="flex-1 p-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.04] animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-12 rounded-md bg-white/[0.05]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/[0.05] rounded w-3/4" />
                  <div className="h-2 bg-white/[0.03] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : popularFusions.length > 0 ? (
          popularFusions.map((fusion, idx) => (
            <Link key={fusion.id} href={`/fusion/${fusion.share_token}`}>
              <motion.div
                whileHover={{ x: 3, backgroundColor: 'rgba(0,240,255,0.03)' }}
                className="rounded-xl p-3 border border-transparent hover:border-[#00f0ff]/10 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex gap-3 items-start">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#00f0ff]/5 border border-[#00f0ff]/10 flex items-center justify-center">
                    <span className="text-[9px] font-black text-[#00f0ff]/60">#{idx + 1}</span>
                  </div>

                  {/* Stacked poster thumbnails */}
                  <div className="flex -space-x-2 flex-shrink-0 mt-0.5">
                    {fusion.sourceMovies?.slice(0, 2).map((movie: any, mIdx: number) => (
                      <div key={mIdx} className="w-7 h-10 rounded-md overflow-hidden border border-black shadow-md">
                        <img
                          src={getMoviePosterUrl(movie.poster_path, 'w92')}
                          alt={movie.title}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[12px] font-bold text-white truncate group-hover:text-[#00f0ff] transition-colors leading-tight">
                      {fusion.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 italic line-clamp-1 mt-0.5">
                      {fusion.tagline}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Heart className="h-2.5 w-2.5 text-[#ff00aa]" />
                        {fusion.upvotes}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Eye className="h-2.5 w-2.5" />
                        {((fusion.upvotes || 0) * 3 + 45).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))
        ) : (
          <div className="py-10 text-center">
            <Zap className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-xs text-zinc-500 italic">No fusions yet — be the first!</p>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="p-4 border-t border-white/[0.05]">
        <Link href="/gallery" className="flex items-center justify-center gap-1.5 text-[11px] text-[#00f0ff]/60 hover:text-[#00f0ff] transition-colors font-semibold tracking-wider uppercase">
          View Full Gallery
          <span className="text-xs">→</span>
        </Link>
      </div>
    </div>
  );
}
