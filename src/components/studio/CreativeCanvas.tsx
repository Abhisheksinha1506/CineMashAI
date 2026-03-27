'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, Zap, Film, Loader2, ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { Movie, FusionResult, ChatMessage } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { FusionResultCard } from './FusionResultCard';
import { TrendingMoviesRow } from './TrendingMoviesRow';
import { RefinementChat } from './RefinementChat';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CreativeCanvasProps {
  selectedMovies: Movie[];
  fusionResult: FusionResult & { share_token?: string } | null;
  trendingMovies: Movie[];
  isGenerating: boolean;
  onMovieSelect: (movie: Movie) => void;
  onMovieRemove: (movieId: string) => void;
  onClearAll: () => void;
  onSaveToGallery: () => void;
  onRegenerate?: () => void;
  onReset?: () => void;
  onFusionUpdate?: (updatedFusion: FusionResult) => void;
}

export function CreativeCanvas({
  selectedMovies,
  fusionResult,
  trendingMovies,
  isGenerating,
  onMovieSelect,
  onMovieRemove,
  onClearAll,
  onSaveToGallery,
  onRegenerate,
  onReset,
  onFusionUpdate,
}: CreativeCanvasProps) {
  const [generationTime] = useState(() => Math.random() * 2 + 1.5);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
            <div className="grid grid-cols-3 gap-1">
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
          Directing your masterpiece...
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
    <div className="relative min-h-screen pt-20">
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

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-[calc(100vh-4rem)]">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            /* Loading State */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[400px]"
            >
              <FilmStripSpinner />
            </motion.div>
          ) : fusionResult ? (
            /* Fusion Result Display */
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
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
                
                <div className="w-32" /> {/* Spacer to balance the layout */}
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
                onSaveToGallery={onSaveToGallery}
                onRemix={() => console.log('Remix')}
                onShareLink={() => {
                  if (fusionResult.share_token) {
                    const url = `${window.location.origin}/fusion/${fusionResult.share_token}`;
                    navigator.clipboard.writeText(url);
                  }
                }}
                onRegenerate={onRegenerate}
              />
              
              {/* Refinement Chat removed as requested */}
            </motion.div>
          ) : (
            /* Empty State */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 sm:py-16"
            >
              {/* Large Clapperboard Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32 mb-6 sm:mb-8"
              >
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-zinc-800 animate-spin-slow" style={{ animationDuration: '12s' }} />
                <div className="w-full h-full rounded-full bg-gradient-to-br from-zinc-900 to-black border border-white/[0.04] flex items-center justify-center">
                  <Clapperboard className="h-12 w-12 sm:h-16 sm:w-16 text-zinc-700" />
                </div>
                
                {/* Floating particles */}
                <div className="absolute -top-4 -left-4 w-3 h-3 bg-[var(--primary)]/40 rounded-full animate-pulse" />
                <div className="absolute -top-2 -right-6 w-2 h-2 bg-[var(--secondary)]/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute -bottom-4 left-2 w-2.5 h-2.5 bg-[var(--primary)]/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
              </motion.div>

              {/* Main Message */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 sm:space-y-4 mb-8 sm:mb-12"
              >
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text)] dark:text-white uppercase tracking-tight">
                  Step 1: Pick Your Movies
                </h2>
                <p className="text-base sm:text-lg text-zinc-400 dark:text-zinc-400 light:text-zinc-500 max-w-2xl mx-auto">
                  Search for movies you love and select 2-4 films to combine. The crazier the combination, the more interesting the result!
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-500 light:text-zinc-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
                    Step 1
                  </span>
                  <span className="w-px h-3 bg-zinc-600 dark:bg-zinc-600 light:bg-zinc-400" />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full" />
                    Step 2
                  </span>
                  <span className="w-px h-3 bg-zinc-600 dark:bg-zinc-600 light:bg-zinc-400" />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full" />
                    AI Magic
                  </span>
                </div>
              </motion.div>

              {/* Progress Indicator replaced with Director's Deck */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-4xl mx-auto mb-16"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
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
                              className="aspect-poster relative rounded-2xl overflow-hidden border-2 border-[var(--primary)] shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                            >
                              <Image
                                src={getMoviePosterUrl(movie.poster_path, 'w500')}
                                alt={movie.title}
                                fill
                                className="object-cover"
                                sizes="200px"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                              <button
                                onClick={() => onMovieRemove(movie.id)}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-[var(--secondary)] hover:border-transparent transition-all"
                                aria-label="Remove movie"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white text-[10px] font-black uppercase tracking-tight line-clamp-1">
                                  {movie.title}
                                </p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key={`empty-${i}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="aspect-poster rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-3 group-hover:border-[var(--primary)]/30 transition-all"
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

                {/* Clear All Action */}
                <AnimatePresence>
                  {selectedMovies.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-center mt-8"
                    >
                      <button
                        onClick={onClearAll}
                        className="px-6 py-2 rounded-full border border-white/10 hover:border-[var(--secondary)]/50 hover:bg-[var(--secondary)]/5 text-zinc-500 hover:text-[var(--secondary)] text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        Reset Director's Deck
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Trending Picks */}
              {trendingMovies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <h3 className="text-[14px] sm:text-[16px] font-black uppercase tracking-widest text-[var(--primary)]">
                    Trending Picks Right Now
                  </h3>
                  
                  <div className="relative group/carousel">
                    {/* Navigation Buttons */}
                    <button
                      onClick={() => scroll('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-[var(--primary)] hover:text-black hover:border-transparent -translate-x-2"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    
                    <button
                      onClick={() => scroll('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-[var(--primary)] hover:text-black hover:border-transparent translate-x-2"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>

                    {/* Edge Gradients */}
                    <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--background)] to-transparent z-10 pointer-events-none opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                    <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--background)] to-transparent z-10 pointer-events-none" />

                    <div 
                      ref={scrollRef}
                      className="flex gap-3 sm:gap-4 overflow-x-auto pb-6 scrollbar-hide scroll-smooth px-2"
                    >
                      {trendingMovies.map((movie, idx) => (
                        <motion.button
                          key={movie.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + Math.min(idx * 0.05, 0.5) }}
                          onClick={() => onMovieSelect(movie)}
                          disabled={selectedMovies.some((m) => m.id === movie.id)}
                          className="flex-shrink-0 w-32 h-48 sm:w-36 sm:h-54 relative group"
                        >
                          <div className={cn(
                            "w-full h-full rounded-xl overflow-hidden border-2 transition-all duration-300 relative",
                            selectedMovies.some((m) => m.id === movie.id)
                              ? "border-[var(--primary)] shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                              : "border-white/[0.1] hover:border-[var(--primary)]/50"
                          )}>
                             <Image
                               src={getMoviePosterUrl(movie.poster_path, 'w342')}
                               alt={movie.title}
                               fill
                               className="object-cover group-hover:scale-110 transition-transform duration-500"
                               sizes="150px"
                               unoptimized
                               blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                               placeholder="blur"
                             />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                            
                            {/* Title Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                              <p className="text-white text-[10px] sm:text-[11px] font-black leading-tight line-clamp-2 uppercase">
                                {movie.title}
                              </p>
                            </div>

                            {/* Selected Overlay */}
                            {selectedMovies.some((m) => m.id === movie.id) && (
                              <div className="absolute inset-0 bg-[var(--primary)]/10 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
