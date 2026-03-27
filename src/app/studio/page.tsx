'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { StudioToolbar } from '@/components/studio/StudioToolbar';
import { CreativeCanvas } from '@/components/studio/CreativeCanvas';
import { FloatingFuseButton } from '@/components/studio/FloatingFuseButton';
import { TrendingMoviesRow } from '@/components/studio/TrendingMoviesRow';
import { Movie, FusionResult, ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { searchMovies, getPopularMovies, getMoviePosterUrl } from '@/lib/api/tmdb-client';

export default function StudioPage() {
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fusionResult, setFusionResult] = useState<(FusionResult & { share_token?: string }) | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  
  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<Movie[]>([]);
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  // Load trending movies on mount
  useEffect(() => {
    const loadTrendingMovies = async () => {
      try {
        const response = await getPopularMovies(1, { timeout: 15000 });
        setTrendingMovies(response.results.slice(0, 15));
      } catch (error) {
        console.error('Error loading trending movies:', error);
        // Fallback movies if TMDB is completely down/timed out
        const fallbackMovies: Movie[] = [
          { id: '27205', title: 'Inception', poster_path: '/edv5CZvfkjSfm9kvH1PSTC9SSTZ.jpg', release_date: '2010-07-15' },
          { id: '157336', title: 'Interstellar', poster_path: '/gEU2QniE6EzuH6vCU2oefbP9vM7.jpg', release_date: '2014-11-05' },
          { id: '155', title: 'The Dark Knight', poster_path: '/qJ2tW6WMUDp92SKyYw9Statusm.jpg', release_date: '2008-07-16' },
          { id: '603', title: 'The Matrix', poster_path: '/f89U3Y9S9SKyYw9Statusm.jpg', release_date: '1999-03-31' },
          { id: '11', title: 'Star Wars', poster_path: '/6FfwsMvHJm2AbGv9S9SKyYw9Statusm.jpg', release_date: '1977-05-25' }
        ] as any[];
        setTrendingMovies(fallbackMovies);
      }
    };
    loadTrendingMovies();
  }, []);

  // Handle global search
  useEffect(() => {
    const handleGlobalSearch = async () => {
      if (!globalSearchQuery.trim()) {
        setGlobalSearchResults([]);
        return;
      }
      try {
        const response = await searchMovies(globalSearchQuery, 1, { timeout: 10000 });
        setGlobalSearchResults(response.results.slice(0, 8));
      } catch (error) {
        console.error('Error searching movies:', error);
        setGlobalSearchResults([]);
      }
    };
    
    const timeoutId = setTimeout(handleGlobalSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [globalSearchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.global-search-bar') && !target.closest('.search-results-dropdown')) {
        setShowGlobalResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMovieSelect = useCallback((movie: Movie) => {
    if (selectedMovies.length < 4 && !selectedMovies.some((m) => m.id === movie.id)) {
      setSelectedMovies((prev) => [...prev, movie]);
    }
  }, [selectedMovies]);

  const handleMovieRemove = useCallback((movieId: string) => {
    setSelectedMovies((prev) => prev.filter((m) => m.id !== movieId));
  }, []);

  const handleMovieReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedMovies((prev) => {
      const newMovies = [...prev];
      const [movedMovie] = newMovies.splice(fromIndex, 1);
      newMovies.splice(toIndex, 0, movedMovie);
      return newMovies;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedMovies([]);
  }, []);

  const handleReset = useCallback(() => {
    setFusionResult(null);
    setSelectedMovies([]);
  }, []);

  const handleFusionUpdate = useCallback((updatedFusion: FusionResult) => {
    setFusionResult(updatedFusion);
  }, []);

  const handleFuse = useCallback(async () => {
    if (selectedMovies.length < 2 || selectedMovies.length > 4) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/fuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          movieIds: selectedMovies.map((m) => Number(m.id)) 
        }),
      });
      const result = await response.json();
      if (result.success) {
        setFusionResult(result.data);
      } else {
        throw new Error(result.error || 'Failed to generate fusion');
      }
    } catch (error: any) {
      console.error('Fusion error:', error);
      alert(error.message || 'Something went wrong while fusing.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedMovies]);

  const handleRegenerate = useCallback(async () => {
  if (selectedMovies.length < 2 || selectedMovies.length > 4) return;
  
  setIsGenerating(true);
  try {
    const response = await fetch('/api/fuse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        movieIds: selectedMovies.map((m) => Number(m.id)) 
      }),
    });
    const result = await response.json();
    if (result.success) {
      setFusionResult(result.data);
    } else {
      throw new Error(result.error || 'Failed to regenerate fusion');
    }
  } catch (error: any) {
    console.error('Regeneration error:', error);
    alert(error.message || 'Something went wrong while regenerating.');
  } finally {
    setIsGenerating(false);
  }
}, [selectedMovies]);

  const handleSaveToGallery = useCallback(() => {
    // Trigger confetti animation
    triggerConfetti();
    console.log('Save to gallery');
  }, []);

  const triggerConfetti = () => {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(confetti);
    }

    // Remove container after animation
    setTimeout(() => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden">
      {/* Scanlines and film grain */}
      <div className="scanlines-background" />
      <div className="film-grain-texture" />
      
      <Navbar>
        <StudioToolbar
          selectedMovies={selectedMovies}
          searchQuery={globalSearchQuery}
          searchResults={globalSearchResults}
          onSearchChange={setGlobalSearchQuery}
          onMovieSelect={handleMovieSelect}
          onMovieRemove={handleMovieRemove}
          onMovieReorder={handleMovieReorder}
          onClearAll={handleClearAll}
          showSearchResults={showGlobalResults}
          setShowSearchResults={setShowGlobalResults}
        />
      </Navbar>

      {/* Creative Canvas */}
      <CreativeCanvas
        selectedMovies={selectedMovies}
        fusionResult={fusionResult}
        trendingMovies={trendingMovies}
        isGenerating={isGenerating}
        onMovieSelect={handleMovieSelect}
        onMovieRemove={handleMovieRemove}
        onClearAll={handleClearAll}
        onSaveToGallery={() => console.log('Save to gallery')}
        onFusionUpdate={handleFusionUpdate}
        onRegenerate={handleRegenerate}
        onReset={handleReset}
      />

      {/* Floating Fuse Button */}
      <FloatingFuseButton
        selectedCount={selectedMovies.length}
        isGenerating={isGenerating}
        onFuse={handleFuse}
      />
    </div>
  );
}
