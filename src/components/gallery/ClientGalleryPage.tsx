'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ArrowRight, ArrowUp, Film, Flame, Sparkles } from 'lucide-react';
import { GalleryFusionCard } from '@/components/gallery/GalleryFusionCard';
import { useRealtimeGallery } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import { EnhancedGalleryFusionCard } from '@/components/gallery/EnhancedGalleryFusionCard';
import { FilmStripLoader } from '@/components/gallery/FilmStripLoader';
import { FusionDetailsModal } from '@/components/gallery/FusionDetailsModal';
import { DynamicGuide, GuideButton } from '@/components/ui/DynamicGuide';
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
  const [selectedFusion, setSelectedFusion] = useState<any | null>(null);
  const [featuredFusion, setFeaturedFusion] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
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

  const createRemixHandler = (share_token: string) => {
    return (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      window.location.href = `/studio?remix=${share_token}`;
    };
  };

  const handleViewDetails = (fusion: any) => {
    setSelectedFusion(fusion);
    setIsDetailsOpen(true);
  };

  const fetchGallery = useCallback(async (sort: string = 'newest', limit: number = 24) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gallery?sort=${sort}&limit=${limit}`);
      const result = await response.json();
      if (result.success) {
        setFusions(result.data);
        if (sort === 'popular') {
          setFeaturedFusion(result.data[0]);
        } else {
          // Always try to get featured fusion separately
          const featuredRes = await fetch('/api/gallery?sort=popular&limit=1');
          const featuredData = await featuredRes.json();
          if (featuredData.success && featuredData.data.length > 0) {
            setFeaturedFusion(featuredData.data[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
      // Don't set fallback here to avoid state issues
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies to prevent infinite loop

  useEffect(() => {
    fetchGallery();
  }, []); // Remove fetchGallery dependency to prevent infinite loop

  // Merge real-time updates with existing fusions
  useEffect(() => {
    if (realtimeFusions.length > 0 && !realtimeLoading) {
      setFusions(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const formattedRealtimeFusions = realtimeFusions.map(fusion => {
          let movieIds = [];
          let fusionData = {};
          try {
            movieIds = typeof fusion.movie_ids === 'string' ? JSON.parse(fusion.movie_ids) : fusion.movie_ids;
            if (fusion.fusion_data) {
              fusionData = typeof fusion.fusion_data === 'string' ? JSON.parse(fusion.fusion_data) : fusion.fusion_data;
            }
          } catch (e) {
            console.error('Error parsing real-time fusion data:', e);
          }
          return {
            id: fusion.id,
            share_token: fusion.share_token,
            createdAt: fusion.created_at,
            upvotes: fusion.upvotes || 0,
            movieIds,
            ...(fusionData as any)
          };
        });

        // Update existing ones
        const merged = prev.map(p => {
          const updatedMatch = formattedRealtimeFusions.find(r => r.id === p.id);
          return updatedMatch ? { ...p, ...updatedMatch } : p;
        });

        // Add brand new ones
        const newFusions = formattedRealtimeFusions.filter(f => !existingIds.has(f.id));
        merged.push(...newFusions);

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
  }, [searchQuery, selectedFilter]); // Remove fetchGallery dependency

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
    <div className="min-h-screen relative pt-20">
      {/* Dynamic Guide */}
      <DynamicGuide
        currentPage="gallery"
        isVisible={showGuide}
        onVisibilityChange={setShowGuide}
      />

      {/* Guide Button */}
      <GuideButton
        onClick={() => setShowGuide(!showGuide)}
        isVisible={showGuide}
      />

      {/* Hero Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
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
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
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
                      onRemix={createRemixHandler(fusion.share_token)}
                      onClick={() => handleViewDetails(fusion)}
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

      {/* Fusion Details Modal */}
      <FusionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        fusion={selectedFusion}
        onVoteUpdate={handleVoteUpdate}
      />

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
