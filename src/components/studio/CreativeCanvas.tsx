'use client';

import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, Zap, Film, Loader2, ChevronLeft, ChevronRight, X, ArrowLeft, Sparkles } from 'lucide-react';
import { Movie, FusionResult, ChatMessage } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import FusionResultCard from './FusionResultCard';
import { TrendingMoviesRow } from './TrendingMoviesRow';
import { SimpleVerticalCarousel } from './SimpleVerticalCarousel';
import { RefinementChat } from './RefinementChat';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CreativeCanvasProps {
  selectedMovies: Movie[];
  fusionResult: FusionResult & { share_token?: string } | null;
  trendingMovies: Movie[];
  isGenerating: boolean | string;
  isRemixMode?: boolean;
  remixFusionData?: any;
  onMovieSelect: (movie: Movie) => void;
  onMovieRemove: (movieId: string) => void;
  onClearAll: () => void;
  onSaveToGallery: () => void;
  onRegenerate?: () => void;
  onReset?: () => void;
  onFuse?: () => void;
  onFusionUpdate?: (updatedFusion: FusionResult) => void;
}

// Memoized movie selector component
const MovieSelector = memo(({ 
  movie, 
  onSelect, 
  onRemove 
}: { 
  movie: Movie; 
  onSelect: (movie: Movie) => void; 
  onRemove: (movieId: string) => void;
}) => (
  <motion.div
    key={movie.id}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="relative group"
  >
    <div className="relative w-32 h-48 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.1]">
      {movie.poster_path && (
        <Image
          src={getMoviePosterUrl(movie.poster_path, 'w342')}
          alt={movie.title}
          fill
          className="object-cover"
          sizes="128px"
        />
      )}
      <button
        onClick={() => onRemove(movie.id)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
    <p className="text-xs text-white/80 text-center mt-2 line-clamp-2">{movie.title}</p>
  </motion.div>
));

MovieSelector.displayName = 'MovieSelector';

const CreativeCanvas = memo(({
  selectedMovies,
  fusionResult,
  trendingMovies,
  isGenerating,
  isRemixMode = false,
  remixFusionData,
  onMovieSelect,
  onMovieRemove,
  onClearAll,
  onSaveToGallery,
  onRegenerate,
  onReset,
  onFuse,
  onFusionUpdate,
}: CreativeCanvasProps) => {
  const [generationTime, setGenerationTime] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGenerationTime(Math.random() * 2 + 1.5);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Chat refinement logic removed as requested

  // Film-strip spinner component
  const FilmStripSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Film strip animation */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 relative"
        >
          {/* Film strip holes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-[var(--primary)]/60 rounded-full" />
              ))}
            </div>
          </div>
          {/* Outer ring */}
          <div className="absolute inset-0 border-2 border-[var(--primary)]/30 rounded-full" />
          {/* Rotating segments */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-t-2 border-[var(--primary)] rounded-full"
          />
        </motion.div>
      </div>

      {/* Loading text with typewriter effect */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <p className="text-[18px] font-black text-[var(--text)] dark:text-white uppercase tracking-wider">
          {typeof isGenerating === 'string' ? isGenerating : 'Directing your masterpiece...'}
        </p>
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex justify-center gap-1"
        >
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-2 h-2 bg-[var(--primary)] rounded-full" />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Film-grain watermark background */}
      <div className="absolute inset-0 film-grain-texture opacity-[0.02] pointer-events-none" />

      {/* Subtle film-reel watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-[0.03] pointer-events-none">
        <div className="relative w-full h-full">
          <div className="absolute inset-0 rounded-full border-4 border-dashed border-zinc-800 dark:border-zinc-800 light:border-[var(--border)] animate-spin-slow" style={{ animationDuration: '20s' }} />
          <div className="absolute inset-4 rounded-full border-2 border-dashed border-zinc-900 dark:border-zinc-900 light:border-[var(--border)] animate-spin-slow" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />
          <Film className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 text-zinc-800 dark:text-zinc-800 light:text-[var(--border)]" />
        </div>
      </div>


      {/* Trending movies moved to sides of selection grid below */}

      {/* Main Content Area */}
      <div className="flex-1 relative z-10 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 mb-4">
        <AnimatePresence>
          {isGenerating ? (
            /* Loading State */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[400px]"
            >
              <div className="scale-75 sm:scale-90">
                <FilmStripSpinner />
              </div>
            </motion.div>
          ) : fusionResult ? (
            /* Fusion Result Display */
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="max-w-4xl mx-auto"
            >
              {/* Back to Studio / New Production Action */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={onReset}
                  className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest pl-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Start New Production
                </button>

                {/* Generation Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 glassmorphism border border-[var(--primary)]/30 rounded-full">
                    <Zap className="h-3 w-3 text-[var(--primary)]" />
                    <span className="text-[11px] font-medium text-[var(--primary)]">
                      Generated in {generationTime.toFixed(1)}s with Groq
                    </span>
                  </div>
                </motion.div>

                <div className="w-32" /> {/* Spacer to balance layout */}
              </div>

              {/* Full-width Fusion Result Card */}
              <FusionResultCard
                title={fusionResult.title}
                tagline={fusionResult.tagline}
                synopsis={fusionResult.synopsis}
                key_scenes={fusionResult.key_scenes}
                keyScenes={fusionResult.keyScenes}
                suggested_cast={fusionResult.suggested_cast}
                suggestedCast={fusionResult.suggestedCast}
                runtime={fusionResult.runtime}
                rating={fusionResult.rating}
                box_office_vibe={fusionResult.box_office_vibe || 'Blockbuster Hit'}
                movie_ids={fusionResult.movie_ids || selectedMovies.map((m) => m.id)}
                share_token={fusionResult.share_token || ''}
                sourceMovies={fusionResult.sourceMovies}
                onRegenerate={onRegenerate}
                onBackToStudio={onReset}
              />

              {/* Refinement Chat removed as requested */}
            </motion.div>
          ) : (
            /* Empty State - Movie Selection */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-2 sm:py-4"
            >
              {/* Large Clapperboard Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative mx-auto w-10 h-10 sm:w-12 sm:h-12 mb-1 sm:mb-2"
              >
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-zinc-800 animate-spin-slow" style={{ animationDuration: '12s' }} />
                <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-900 to-black border border-white/[0.04] flex items-center justify-center">
                  <Clapperboard className="h-8 w-8 text-zinc-700" />
                </div>
              </motion.div>

              {/* Main Message */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-1 mb-2 sm:mb-4"
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mb-2">
                  <h2 className="text-xl sm:text-2xl font-black text-[var(--text)] dark:text-white uppercase tracking-tight">
                    Step 1: Pick Your Movies
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <span className="flex items-center gap-1.5 text-[var(--primary)]">
                      <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse" />
                      DIRECT
                    </span>
                    <span className="w-px h-2 bg-zinc-700" />
                    <span className="text-zinc-600">FUSE</span>
                    <span className="w-px h-2 bg-zinc-700" />
                    <span className="text-zinc-600">MASTER</span>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-zinc-400 dark:text-zinc-400 light:text-zinc-500 max-w-xl mx-auto">
                  {isRemixMode
                    ? `Expand "${remixFusionData?.fusionData?.title || 'this fusion'}" with 1-3 more movies.`
                    : 'Choose 2-4 films to create your fusion.'
                  }
                </p>
              </motion.div>

              {/* Progress Indicator - Director's Deck with Side Carousels */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full flex items-center justify-center gap-2 sm:gap-6 mb-3 sm:mb-4"
              >
                {/* Left Side Trending Column */}
                {trendingMovies.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="hidden xl:block w-36 shrink-0"
                  >
                    <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-[var(--primary)]/60 text-left px-1">
                      Trending
                    </div>
                    <SimpleVerticalCarousel
                      movies={trendingMovies.slice(0, 8)}
                      selectedMovies={selectedMovies}
                      onMovieSelect={onMovieSelect}
                      direction="up"
                      showTwoColumns={false}
                    />
                  </motion.div>
                )}

                {/* Main Selection Grid */}
                <div className="flex-1 max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-3xl p-2 bg-white/[0.01] border border-white/[0.03]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    {[0, 1, 2, 3].map((i) => {
                      const movie = selectedMovies[i];
                      return (
                        <div key={i} className="relative group">
                          <AnimatePresence mode="wait">
                            {movie ? (
                              <motion.div
                                key={`filled-${movie.id}`}
                                initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                exit={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                                className={`aspect-poster relative rounded-2xl overflow-hidden border-2 ${movie.isFusion
                                  ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                                  : 'border-[var(--primary)] shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                                  }`}
                              >
                                {movie.isFusion ? (
                                  // Fusion movie placeholder
                                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex flex-col items-center justify-center">
                                    <div className="absolute inset-0 bg-black/20" />
                                    <div className="relative z-10 text-center px-4">
                                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                        <Sparkles className="h-8 w-8 text-purple-300" />
                                      </div>
                                      <div className="text-purple-300 text-[10px] font-black uppercase tracking-widest mb-2">
                                        Coming Soon
                                      </div>
                                      <div className="text-white text-[11px] font-black uppercase tracking-tight line-clamp-2">
                                        {movie.title}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Regular movie poster
                                  <>
                                    <Image
                                      src={getMoviePosterUrl(movie.poster_path, 'w500')}
                                      alt={movie.title}
                                      fill
                                      className="object-cover"
                                      sizes="200px"
                                      unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                  </>
                                )}

                                {/* Fusion Badge */}
                                {movie.isFusion && (
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[8px] text-purple-300 font-black uppercase tracking-widest">
                                    FUSION
                                  </div>
                                )}

                                <button
                                  onClick={() => onMovieRemove(movie.id)}
                                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-[var(--secondary)] hover:border-transparent transition-all"
                                  aria-label="Remove movie"
                                >
                                  <X className="h-4 w-4" />
                                </button>

                                {!movie.isFusion && (
                                  <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <p className="text-white text-[10px] font-black uppercase tracking-tight line-clamp-1">
                                      {movie.title}
                                    </p>
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <motion.div
                                key={`empty-${i}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="aspect-poster rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-2 group-hover:border-[var(--primary)]/30 transition-all"
                              >
                                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                                  <Film className="h-5 w-5 text-zinc-700 group-hover:text-[var(--primary)]/50 transition-colors" />
                                </div>
                                <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Film {i + 1}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side Trending Column */}
                {trendingMovies.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="hidden xl:block w-36 shrink-0"
                  >
                    <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-[var(--primary)]/60 text-right px-1">
                      Latest
                    </div>
                    <SimpleVerticalCarousel
                      movies={trendingMovies.slice(7, 15)}
                      selectedMovies={selectedMovies}
                      onMovieSelect={onMovieSelect}
                      direction="down"
                      showTwoColumns={false}
                    />
                  </motion.div>
                )}
              </motion.div>


              {/* Interaction Controls - Centered Layout */}
              <AnimatePresence>
                {selectedMovies.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex flex-col items-center gap-3 mt-6"
                  >
                    {/* Primary Action - Fuse Now (Centered) */}
                    {selectedMovies.length >= 2 && selectedMovies.length <= 4 && (
                      <motion.button
                        key="fuse-btn"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onFuse}
                        disabled={!!isGenerating}
                        className={cn(
                          "group relative px-10 py-3 rounded-full text-[14px] font-black uppercase tracking-widest transition-all duration-500 overflow-hidden",
                          isGenerating
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-[var(--primary)] to-cyan-400 text-black shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_50px_rgba(0,240,255,0.5)]"
                        )}
                      >
                        <div className="relative flex items-center gap-3">
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>{typeof isGenerating === 'string' ? 'Processing...' : 'Fusing Productions...'}</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5 fill-current" />
                              <span>{isRemixMode ? 'Create Remix' : 'Fuse Now'}</span>
                            </>
                          )}
                        </div>

                        {/* Animated Glow Effect */}
                        {!isGenerating && (
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                      </motion.button>
                    )}

                    {/* Secondary Action - Reset Deck (Larger and positioned higher) */}
                    <button
                      onClick={onClearAll}
                      className="group flex flex-col items-center gap-1.5 px-8 py-2 rounded-2xl border border-white/5 hover:border-[var(--secondary)]/30 hover:bg-[var(--secondary)]/5 text-zinc-500 hover:text-[var(--secondary)] transition-all duration-300"
                    >
                      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Reset Production Deck</span>
                      <div className="h-0.5 w-6 group-hover:w-12 group-hover:bg-[var(--secondary)]/40 transition-all duration-300" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

CreativeCanvas.displayName = 'CreativeCanvas';

export default CreativeCanvas;
