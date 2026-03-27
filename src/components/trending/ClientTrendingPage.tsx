'use client';

import { useState, useEffect, useCallback } from 'react';
import { GalleryFusionCard } from '@/components/gallery/GalleryFusionCard';
import { FeaturedFusionCard } from '@/components/trending/FeaturedFusionCard';
import { TrendingUp, ArrowUp, Zap, Film, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRealtimeGallery } from '@/hooks/useRealtime';

interface ClientTrendingPageProps {
  initialData: {
    success: boolean;
    data: any[];
    error?: string;
    served_from_cache: boolean;
    cache_age_seconds: number;
    cache_hit_count: number;
  };
}

export default function ClientTrendingPage({ initialData }: ClientTrendingPageProps) {
  const [fusions, setFusions] = useState(initialData.success ? initialData.data : []);
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Real-time gallery updates
  const { fusions: realtimeFusions, loading: realtimeLoading } = useRealtimeGallery();

  const handleVoteUpdate = (fusionId: string, newUpvotes: number) => {
    setFusions(prev => 
      prev.map(fusion => 
        fusion.id === fusionId 
          ? { ...fusion, upvotes: newUpvotes }
          : fusion
      )
    );
  };

  // Create a wrapper function for each fusion
  const createVoteUpdateHandler = (fusionId: string) => {
    return (newUpvotes: number) => handleVoteUpdate(fusionId, newUpvotes);
  };

  const createRemixHandler = (id: string) => {
    return () => {
      window.location.href = `/studio?remix=${id}`;
    };
  };

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trending?limit=24');
      const result = await response.json();
      if (result.success) setFusions(result.data);
    } catch (error) {
      console.error('Error fetching trending fusions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Merge real-time updates with existing fusions
  useEffect(() => {
    if (realtimeFusions.length > 0 && !realtimeLoading) {
      setFusions(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newFusions = realtimeFusions.filter(f => !existingIds.has(f.id));
        const merged = [...newFusions, ...prev];
        // Sort by upvotes for trending
        return merged.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 24);
      });
    }
  }, [realtimeFusions, realtimeLoading]);

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading && fusions.length === 0) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading trending fusions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-[#00f0ff]/20 dark:border-[#00f0ff]/20 light:border-[var(--primary)]/30"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--primary)]">Live Trends</span>
          </motion.div>

          <h1 className="text-6xl sm:text-8xl font-black text-[var(--text)] dark:text-white light:text-[#1a1a1a] tracking-[-0.05em] uppercase mb-6"
            style={{ textShadow: '0 0 50px rgba(0,240,255,0.3)' }}
          >
            Trending Now
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Discover the most popular cinematic mashups from our creative community
          </motion.p>
        </motion.div>
      </section>

      {/* Featured Fusion */}
      <AnimatePresence mode="wait">
        {fusions.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 tracking-[-0.03em] uppercase mb-4">
                Featured Fusion
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                The hottest cinematic mashup of the week
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-16"
            >
              <FeaturedFusionCard
                fusion={fusions[0]}
                rank={1}
                onRemix={(id) => (window.location.href = `/studio?remix=${id}`)}
              />
            </motion.div>
          </section>
        )}
      </AnimatePresence>

      {/* Masonry Grid - Remaining */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto pb-16">
        {fusions.length > 1 && (
          <div className="space-y-6">
            <h3 className="text-[16px] font-black uppercase tracking-widest text-[var(--primary)]">
              More Trending
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-auto">
              <AnimatePresence mode="wait">
                {fusions.slice(1).map((fusion, index) => (
                  <motion.div
                    key={fusion.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: (index + 1) * 0.1 
                    }}
                  >
                    <GalleryFusionCard
                      {...fusion}
                      onVoteUpdate={createVoteUpdateHandler(fusion.id)}
                      onRemix={createRemixHandler(fusion.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {fusions.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-red-500 mb-6">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-3xl font-black text-zinc-400 dark:text-zinc-400 light:text-zinc-600 uppercase tracking-tight mb-4">
              Quiet on Set...
            </h3>
            <p className="text-zinc-600 dark:text-zinc-600 light:text-zinc-500 text-lg mb-8 max-w-md mx-auto">
              No trending fusions yet. Be the first to break reality!
            </p>
            <Link href="/studio">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Zap className="h-5 w-5" />
                Create First Fusion
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && fusions.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-300">Updating trending...</span>
            </div>
          </div>
        )}
      </section>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
