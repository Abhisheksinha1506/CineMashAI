'use client';

import { useState } from 'react';
import { Heart, Eye, TrendingUp, X } from 'lucide-react';
import { GalleryFusionCard } from '@/components/gallery/GalleryFusionCard';
import { motion, AnimatePresence } from 'framer-motion';

interface TrendingSidebarProps {
  trendingFusions?: any[];
  onRemix?: (share_token: string) => void;
}

export function TrendingSidebar({ trendingFusions = [], onRemix }: TrendingSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
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
            {trendingFusions.slice(0, 4).map((fusion, idx) => (
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
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#00f0ff]/20 to-[#ff00aa]/20" />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
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
                        <span>{fusion.views || 432}</span>
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
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="lg:hidden">
        {/* Trigger Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-30 px-4 py-3 glassmorphism-cyan border border-[var(--primary)]/30 rounded-full flex items-center gap-2 focus-ring"
          aria-label="Open trending fusions"
        >
          <TrendingUp className="h-4 w-4 text-[var(--background)]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--background)]">Trending</span>
        </motion.button>

        {/* Bottom Sheet */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 dark:bg-black/80 light:bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bottom-sheet open glassmorphism dark:glassmorphism light:bg-[var(--card)] max-h-[80vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex justify-center py-2">
                  <div className="w-12 h-1 bg-white/30 dark:bg-white/30 light:bg-[var(--border)] rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 py-4 border-b border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
                      <h3 className="text-[16px] font-black text-[var(--text)] dark:text-white uppercase tracking-widest">
                        Trending Fusions
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-8 h-8 rounded-full glassmorphism dark:glassmorphism light:bg-[var(--border)]/20 flex items-center justify-center focus-ring"
                      aria-label="Close trending fusions"
                    >
                      <X className="h-4 w-4 text-[var(--text)]/60 dark:text-white/60" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                  {trendingFusions.slice(0, 4).map((fusion, idx) => (
                    <motion.div
                      key={fusion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <GalleryFusionCard
                        {...fusion}
                        onRemix={() => onRemix?.(fusion.share_token)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
