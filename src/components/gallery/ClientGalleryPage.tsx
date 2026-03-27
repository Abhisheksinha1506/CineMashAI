'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ArrowRight, ArrowUp, Film, Flame, Sparkles } from 'lucide-react';
import { GalleryFusionCard } from '@/components/gallery/GalleryFusionCard';
import { useRealtimeGallery } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { EnhancedGalleryFusionCard } from '@/components/gallery/EnhancedGalleryFusionCard';
import { FilmStripLoader } from '@/components/gallery/FilmStripLoader';
import Link from 'next/link';

const FILTERS = [
  { id: 'all', label: 'All', icon: Film },
  { id: 'popular', label: 'Popular 🔥', icon: Flame },
  { id: 'newest', label: 'Newest ✨', icon: Sparkles },
];

interface ClientGalleryPageProps {
  initialData: {
    success: boolean;
    data: any[];
    error?: string;
    served_from_cache: boolean;
    cache_age_seconds: number;
    cache_hit_count: number;
  };
}

export default function ClientGalleryPage({ initialData }: ClientGalleryPageProps) {
  const [fusions, setFusions] = useState(initialData.success ? initialData.data : []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const fetchGallery = useCallback(async (sort: string = 'newest', limit: number = 24) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gallery?sort=${sort}&limit=${limit}`);
      const result = await response.json();
      if (result.success) setFusions(result.data);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  // Merge real-time updates with existing fusions
  useEffect(() => {
    if (realtimeFusions.length > 0 && !realtimeLoading) {
      setFusions(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newFusions = realtimeFusions.filter(f => !existingIds.has(f.id));
        const merged = [...newFusions, ...prev];
        // Sort based on current filter
        if (selectedFilter === 'popular') {
          return merged.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 24);
        } else {
          return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 24);
        }
      });
    }
  }, [realtimeFusions, realtimeLoading, selectedFilter]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = fusions.filter(fusion => 
        fusion.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fusion.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      // Update with filtered results
      setFusions(filtered);
    } else {
      // Reset to original data when search is cleared
      fetchGallery(selectedFilter === 'popular' ? 'popular' : 'newest');
    }
  }, [searchQuery, fetchGallery, selectedFilter]);

  // Handle filter change
  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId);
    fetchGallery(filterId === 'popular' ? 'popular' : 'newest');
  };

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
        <FilmStripLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--primary)]">Creative Gallery</span>
          </motion.div>

          <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 tracking-[-0.05em] uppercase mb-6">
            Fusion Gallery
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Explore the creative masterpieces from our community of cinematic fusion artists
          </motion.p>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
          >
            {/* Search Bar */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search fusions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className={cn(
                    "px-4 py-3 rounded-full font-medium transition-all duration-300 flex items-center gap-2",
                    selectedFilter === filter.id
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-gray-300 hover:bg-white/20"
                  )}
                >
                  <filter.icon className="h-4 w-4" />
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Gallery Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        {fusions.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-6">
              <Film className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-zinc-400 dark:text-zinc-400 light:text-zinc-600 uppercase tracking-tight mb-4">
              No Fusions Yet
            </h3>
            <p className="text-zinc-600 dark:text-zinc-600 light:text-zinc-500 text-lg mb-8 max-w-md mx-auto">
              Be the first to create a cinematic masterpiece and inspire others!
            </p>
            <Link href="/studio">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Sparkles className="h-5 w-5" />
                Create First Fusion
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Featured Fusion */}
            {fusions.length > 0 && selectedFilter === 'popular' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-12"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 tracking-[-0.03em] uppercase mb-4">
                    Featured Fusion
                  </h2>
                  <p className="text-gray-400 text-lg">
                    The most popular cinematic mashup of the week
                  </p>
                </div>
                <EnhancedGalleryFusionCard
                  {...fusions[0]}
                  rank={1}
                  onVoteUpdate={createVoteUpdateHandler(fusions[0].id)}
                  onRemix={createRemixHandler(fusions[0].id)}
                />
              </motion.div>
            )}

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {fusions.map((fusion, index) => (
                  <motion.div
                    key={fusion.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: (selectedFilter === 'popular' && index === 0) ? 0 : index * 0.1 
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
          </>
        )}

        {/* Loading State */}
        {loading && fusions.length > 0 && (
          <div className="text-center py-8">
            <FilmStripLoader />
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
            className="fixed bottom-8 right-8 p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
