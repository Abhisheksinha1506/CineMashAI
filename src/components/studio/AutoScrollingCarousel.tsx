'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Movie } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AutoScrollingCarouselProps {
  movies: Movie[];
  selectedMovies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  className?: string;
}

export function AutoScrollingCarousel({ 
  movies, 
  selectedMovies, 
  onMovieSelect, 
  className = '' 
}: AutoScrollingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate movies for seamless looping
  const duplicatedMovies = [...movies, ...movies];

  const handleManualScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className={cn("relative overflow-hidden group", className)}>
      {/* Gradient edges */}
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--background)] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--background)] to-transparent z-10 pointer-events-none" />

      {/* Navigation Controls */}
      <button
        onClick={() => handleManualScroll('left')}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--primary)] hover:text-black hover:border-transparent"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => handleManualScroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--primary)] hover:text-black hover:border-transparent"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Pause/Play Button */}
      <button
        onClick={togglePause}
        className="absolute top-2 right-2 z-20 h-6 w-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--primary)] hover:text-black hover:border-transparent"
        aria-label={isPaused ? "Play" : "Pause"}
      >
        {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
      </button>

      {/* Auto-scrolling container */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide"
        style={{
          animation: isPaused ? 'none' : 'scroll 30s linear infinite',
          width: 'max-content'
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {duplicatedMovies.map((movie, idx) => {
          const isDuplicate = idx >= movies.length;
          const originalIdx = idx % movies.length;
          const actualMovie = movies[originalIdx];
          
          return (
            <motion.button
              key={`${movie.id}-${isDuplicate ? 'duplicate' : 'original'}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(originalIdx * 0.1, 1) }}
              onClick={() => !isDuplicate && onMovieSelect(actualMovie)}
              disabled={selectedMovies.some((m) => m.id === actualMovie.id) || isDuplicate}
              className="flex-shrink-0 w-32 h-48 relative group"
              style={{ 
                cursor: isDuplicate ? 'default' : 'pointer',
                opacity: isDuplicate ? 0.7 : 1
              }}
            >
              <div className={cn(
                "w-full h-full rounded-xl overflow-hidden border-2 transition-all duration-300 relative",
                selectedMovies.some((m) => m.id === actualMovie.id)
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
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
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
                {selectedMovies.some((m) => m.id === actualMovie.id) && !isDuplicate && (
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
          );
        })}
      </div>

      {/* Custom styles for animation */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
