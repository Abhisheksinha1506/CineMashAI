'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Star, Plus, Film } from 'lucide-react';
import { Movie } from '@/types';
import { searchMovies, getPopularMovies, getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MovieBrowserProps {
  selectedMovies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  onMovieRemove: (movieId: string) => void;
}

export function MovieBrowser({ selectedMovies, onMovieSelect, onMovieRemove }: MovieBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPopularMovies();
  }, []);

  const loadPopularMovies = async () => {
    try {
      setIsLoadingPopular(true);
      const response = await getPopularMovies();
      setPopularMovies(response.results.slice(0, 12));
    } catch (error) {
      console.error('Error loading popular movies:', error);
    } finally {
      setIsLoadingPopular(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await searchMovies(searchQuery);
        setSearchResults(response.results.slice(0, 20));
      } catch (error) {
        console.error('Error searching movies:', error);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSelected = (movieId: string) => selectedMovies.some((m) => m.id === movieId);

  const PosterCard = ({ movie }: { movie: Movie }) => {
    const selected = isSelected(movie.id);
    const canAdd = selectedMovies.length < 4 && !selected;

    return (
      <motion.div
        whileHover={canAdd ? { scale: 1.04, y: -2 } : {}}
        whileTap={canAdd ? { scale: 0.97 } : {}}
        onClick={() => canAdd && onMovieSelect(movie)}
        className={cn(
          'relative group rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer poster-hover',
          selected
            ? 'border-[#00f0ff]/60 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
            : canAdd
            ? 'border-white/[0.06] hover:border-[#00f0ff]/30 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]'
            : 'border-white/[0.03] opacity-50 cursor-not-allowed'
        )}
      >
        <div className="aspect-poster relative">
          <img
            src={getMoviePosterUrl(movie.poster_path, 'w342')}
            alt={movie.title}
            crossOrigin="anonymous"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Info overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <p className="text-white text-[10px] font-black uppercase tracking-tight line-clamp-2 leading-tight">
              {movie.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-[#00f0ff] font-bold flex items-center">
                <Star className="h-2 w-2 mr-0.5 fill-current" />
                {movie.vote_average?.toFixed(1)}
              </span>
              <span className="text-[9px] text-white/40 font-medium">
                {movie.release_date?.split('-')[0]}
              </span>
            </div>
          </div>

          {/* Selected checkmark */}
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 bg-[#00f0ff]/10 backdrop-blur-[1px] flex items-center justify-center"
            >
              <div className="h-10 w-10 rounded-full bg-[#00f0ff] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                <Plus className="h-5 w-5 text-black rotate-45" />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      {/* Search Bar */}
      <div className="relative group flex-shrink-0">
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#00f0ff]/0 via-[#00f0ff]/0 to-[#00f0ff]/0 group-focus-within:from-[#00f0ff]/20 group-focus-within:via-[#ff00aa]/10 group-focus-within:to-[#00f0ff]/20 blur-sm transition-all duration-500" />
        <div className="relative rounded-2xl border border-white/[0.07] group-focus-within:border-[#00f0ff]/30 bg-white/[0.03] transition-all duration-300">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-[#00f0ff] transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search any movie, actor, or franchise from TMDb"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-11 pr-10 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none rounded-2xl"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-[#00f0ff] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Your Selection Panel */}
      <div className="flex-shrink-0 rounded-2xl p-4 border border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Director's Cut</p>
            <h3 className="text-[13px] font-black text-white uppercase tracking-tight">Your Selection</h3>
          </div>
          <div className={cn(
            'h-8 w-8 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all',
            selectedMovies.length >= 2
              ? 'border-[#00f0ff] text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              : 'border-zinc-700 text-zinc-500'
          )}>
            {selectedMovies.length}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <AnimatePresence mode="popLayout">
            {selectedMovies.map((movie) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group aspect-poster rounded-lg overflow-hidden border border-[#00f0ff]/20"
              >
                <img
                  src={getMoviePosterUrl(movie.poster_path, 'w185')}
                  alt={movie.title}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => onMovieRemove(movie.id)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#ff00aa]/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_8px_rgba(255,0,170,0.5)]"
                >
                  <X className="h-3 w-3 text-white" />
                </motion.button>
                <p className="absolute bottom-1 left-1 right-1 text-[8px] font-black text-white uppercase line-clamp-1 leading-tight">
                  {movie.title}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {Array.from({ length: Math.max(0, 4 - selectedMovies.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-poster rounded-lg border border-dashed border-white/[0.06] flex flex-col items-center justify-center gap-1 bg-white/[0.01]"
            >
              <Plus className="h-3 w-3 text-zinc-700" />
              <span className="text-[8px] text-zinc-700 font-bold uppercase">Film {selectedMovies.length + i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Browse Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
        <AnimatePresence mode="wait">
          {searchResults.length > 0 ? (
            <motion.div
              key="search-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">
                  {searchResults.length} results
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-zinc-600 hover:text-[#00f0ff] transition-colors uppercase tracking-wider font-semibold"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {searchResults.map((movie) => (
                  <PosterCard key={movie.id} movie={movie} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="popular"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Trending Now heading */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gradient-to-r from-[#00f0ff]/20 to-transparent" />
                <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex-shrink-0">
                  Trending Now
                </p>
                <div className="h-px flex-1 bg-gradient-to-l from-[#00f0ff]/20 to-transparent" />
              </div>

              {isLoadingPopular ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-poster rounded-xl bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {popularMovies.map((movie) => (
                    <PosterCard key={movie.id} movie={movie} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
