'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FeaturedFusionCard } from '@/components/trending/FeaturedFusionCard';
import { useRealtimeGallery } from '@/hooks/useRealtime';

interface TrendingFusionsClientProps {
  initialFusions: any[];
}

export default function TrendingFusionsClient({ initialFusions }: TrendingFusionsClientProps) {
  const [fusions, setFusions] = useState(initialFusions);
  
  // Real-time gallery updates
  const { fusions: realtimeFusions, loading: realtimeLoading } = useRealtimeGallery();

  // Merge real-time updates with trending fusions
  useEffect(() => {
    if (realtimeFusions.length > 0 && !realtimeLoading) {
      setFusions(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newFusions = realtimeFusions.filter(f => !existingIds.has(f.id));
        const merged = [...newFusions, ...prev];
        // Sort by upvotes for trending
        return merged.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 3);
      });
    }
  }, [realtimeFusions, realtimeLoading]);

  if (fusions.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <motion.div
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-[#00f0ff]/20 dark:border-[#00f0ff]/20 light:border-[var(--primary)]/30"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--primary)]">Trending Now</span>
        </motion.div>

        <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 tracking-[-0.03em] uppercase mb-4">
          Featured Fusions
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Discover the most creative cinematic mashups from our community
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {fusions.map((fusion: any, index: number) => (
          <motion.div
            key={fusion.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <FeaturedFusionCard
              fusion={fusion}
              rank={index + 1}
              onRemix={(share_token) => (window.location.href = `/studio?remix=${share_token}`)}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mt-12"
      >
        <a href="/trending">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            View All Trending →
          </motion.button>
        </a>
      </motion.div>
    </section>
  );
}
