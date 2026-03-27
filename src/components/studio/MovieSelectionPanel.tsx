'use client';

import { Movie } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film } from 'lucide-react';
import Image from 'next/image';

interface MovieSelectionPanelProps {
  selectedMovies: Movie[];
  onMovieRemove: (movieId: string) => void;
}

export function MovieSelectionPanel({ selectedMovies, onMovieRemove }: MovieSelectionPanelProps) {
  return (
    <div className="movie-selection-card rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-black uppercase tracking-widest text-[#00f0ff]">Your Selection</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-medium">
            {selectedMovies.length}/4
          </span>
          <div className="w-5 h-5 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
            <span className="text-[8px] font-black text-[#00f0ff]">{selectedMovies.length}</span>
          </div>
        </div>
      </div>

      {/* Selected Movies */}
      <AnimatePresence mode="wait">
        {selectedMovies.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {selectedMovies.map((movie, idx) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: idx * 0.1 }}
                className="mini-poster group relative"
              >
                <Image
                  src={getMoviePosterUrl(movie.poster_path, 'w342')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 150px"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                  placeholder="blur"
                />
                <button
                  onClick={() => onMovieRemove(movie.id)}
                  className="mini-poster-remove focus-ring"
                  aria-label={`Remove ${movie.title} from selection`}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8"
          >
            <div className="relative mx-auto w-12 h-12 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-zinc-800 animate-spin-slow" style={{ animationDuration: '10s' }} />
              <div className="w-full h-full rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                <Film className="h-5 w-5 text-zinc-700" />
              </div>
            </div>
            <p className="text-[11px] text-zinc-600 font-medium leading-relaxed">
              Search and click movies to add them here
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
