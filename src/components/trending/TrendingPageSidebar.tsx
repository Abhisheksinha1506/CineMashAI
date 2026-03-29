'use client';

import { useState } from 'react';
import { Heart, Eye, TrendingUp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface TrendingPageSidebarProps {
  trendingFusions: any[];
  onRemix?: (share_token: string) => void;
}

export function TrendingPageSidebar({ trendingFusions, onRemix }: TrendingPageSidebarProps) {
  return (
    <div className="hidden lg:block fixed right-0 top-[60px] h-[calc(100vh-60px)] w-80 glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border-l border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] p-6 overflow-y-auto custom-scrollbar z-40">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-[13px] font-black uppercase tracking-widest text-[var(--text)] dark:text-white">
              Trending Fusions
            </h3>
          </div>
        </div>

        {/* Fusion Cards */}
        <div className="space-y-4">
          {trendingFusions.slice(0, 8).map((fusion, idx) => (
            <motion.div
              key={fusion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group"
            >
              <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--primary)]/30 transition-all duration-300">
                {/* Mini poster collage */}
                <div className="relative h-24 overflow-hidden">
                  <div className="absolute inset-0 flex">
                    <div className="flex-1 relative overflow-hidden">
                      {fusion.posterUrl ? (
                        <img
                          src={fusion.posterUrl}
                          alt={fusion.title}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#00f0ff]/20 to-[#ff00aa]/20" />
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                  
                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: idx === 0
                        ? 'linear-gradient(135deg, #f5c842, #e6a800)'
                        : idx === 1
                        ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                        : idx === 2
                        ? 'linear-gradient(135deg, #b45309, #92400e)'
                        : 'linear-gradient(135deg, #1e1e23, #111)',
                      color: idx < 3 ? '#000' : '#fff'
                    }}
                  >
                    #{idx + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-2">
                  <h4 className="text-[12px] font-black text-[var(--text)] dark:text-white uppercase tracking-wide leading-tight truncate">
                    {fusion.title}
                  </h4>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-400 light:text-zinc-500 italic leading-relaxed line-clamp-2">
                    {fusion.tagline}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 dark:text-zinc-500 light:text-zinc-600">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{fusion.upvotes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{Math.floor(Math.random() * 1000) + 100}</span>
                    </div>
                  </div>

                  {/* Remix button */}
                  <button
                    onClick={() => onRemix?.(fusion.share_token)}
                    className="w-full mt-2 px-3 py-2 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[var(--primary)]/20 transition-all focus-ring"
                  >
                    Remix
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View Full Gallery Link */}
        <div className="pt-4 border-t border-white/[0.1]">
          <Link
            href="/gallery"
            className="flex items-center justify-between w-full px-4 py-3 glassmorphism border border-white/[0.1] rounded-2xl hover:border-[#00f0ff]/30 transition-all duration-300 group"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-white">
              View full gallery
            </span>
            <ArrowRight className="h-4 w-4 text-[#00f0ff] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
