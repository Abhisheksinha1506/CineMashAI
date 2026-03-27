'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Film, Search, X, Zap, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Movie } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import Image from 'next/image';

interface StudioToolbarProps {
  selectedMovies: Movie[];
  searchQuery: string;
  searchResults: Movie[];
  onSearchChange: (query: string) => void;
  onMovieSelect: (movie: Movie) => void;
  onMovieRemove: (movieId: string) => void;
  onMovieReorder?: (fromIndex: number, toIndex: number) => void;
  onClearAll: () => void;
  showSearchResults: boolean;
  setShowSearchResults: (show: boolean) => void;
}

export function StudioToolbar({
  selectedMovies,
  searchQuery,
  searchResults,
  onSearchChange,
  onMovieSelect,
  onMovieRemove,
  onMovieReorder,
  onClearAll,
  showSearchResults,
  setShowSearchResults,
}: StudioToolbarProps) {
  const [draggedChip, setDraggedChip] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchResults(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setShowSearchResults]);

  const handleDragStart = (movieId: string) => {
    setDraggedChip(movieId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetMovieId: string) => {
    e.preventDefault();
    if (draggedChip && draggedChip !== targetMovieId && onMovieReorder) {
      const draggedIndex = selectedMovies.findIndex(m => m.id === draggedChip);
      const targetIndex = selectedMovies.findIndex(m => m.id === targetMovieId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        onMovieReorder(draggedIndex, targetIndex);
      }
    }
    setDraggedChip(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, movieId: string) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onMovieRemove(movieId);
    }
  };

  return (
    <div className="relative w-full">
      {/* Global Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-[var(--primary)] transition-colors" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search movies, actors, or genres... (⌘K)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setShowSearchResults(true)}
          className="global-search-bar w-full pl-11 pr-4 py-2 rounded-xl text-sm bg-white/[0.03] border border-white/[0.08] text-[var(--text)] placeholder:text-zinc-500 focus:outline-none focus:border-[var(--primary)]/30 focus:bg-white/[0.05] transition-all"
          aria-label="Search movies from TMDb database"
          role="searchbox"
          aria-expanded={showSearchResults && searchResults.length > 0}
        />
        
        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showSearchResults && searchQuery && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 left-0 right-0 bg-[#0c0c0e] border border-white/[0.1] rounded-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar z-50 shadow-2xl"
              role="listbox"
            >
              {searchResults.slice(0, 8).map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => {
                    onMovieSelect(movie);
                    onSearchChange('');
                    setShowSearchResults(false);
                  }}
                  disabled={selectedMovies.some((m) => m.id === movie.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  role="option"
                >
                  <Image
                    src={getMoviePosterUrl(movie.poster_path, 'w92')}
                    alt={movie.title}
                    width={40}
                    height={56}
                    className="w-10 h-14 object-cover rounded shadow-lg"
                    unoptimized
                  />
                  <div className="flex-1">
                    <p className="text-[var(--text)] text-sm font-semibold truncate">{movie.title}</p>
                    <p className="text-zinc-500 text-xs">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
