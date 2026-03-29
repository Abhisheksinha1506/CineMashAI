'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { StudioToolbar } from '@/components/studio/StudioToolbar';
import CreativeCanvas from '@/components/studio/CreativeCanvas';
import { FloatingFuseButton } from '@/components/studio/FloatingFuseButton';
import { TrendingMoviesRow } from '@/components/studio/TrendingMoviesRow';
import { DynamicGuide, GuideButton } from '@/components/ui/DynamicGuide';
import { Movie, FusionResult, ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { searchMovies, getPopularMovies, getMoviePosterUrl } from '@/lib/api/tmdb-client';

interface StudioClientProps {
  resetKey?: number;
  initialTrendingMovies?: Movie[];
}

export function StudioClient({ resetKey, initialTrendingMovies = [] }: StudioClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean | string>(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [fusionResult, setFusionResult] = useState<(FusionResult & { share_token?: string }) | null>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>(initialTrendingMovies);
  const [isRemixMode, setIsRemixMode] = useState(false);
  const [remixFusionData, setRemixFusionData] = useState<any>(null);
  const [userRemovedFusion, setUserRemovedFusion] = useState(false);
  const [shouldClearRemixParam, setShouldClearRemixParam] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  // Reset state when resetKey changes
  useEffect(() => {
    if (resetKey) {
      setSelectedMovies([]);
      setFusionResult(null);
      setIsRemixMode(false);
      setRemixFusionData(null);
      setIsGenerating(false);
      setUserRemovedFusion(false);
      setShouldClearRemixParam(false);
      setShowGuide(true);
    }
  }, [resetKey]);
  
  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<Movie[]>([]);
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle clearing remix parameter when flag is set
  useEffect(() => {
    if (shouldClearRemixParam) {
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.delete('remix');
      const newUrl = `${window.location.pathname}${currentParams.toString() ? '?' + currentParams.toString() : ''}`;
      router.replace(newUrl);
      setShouldClearRemixParam(false);
    }
  }, [shouldClearRemixParam, router]);

  // Handle remix parameter - moved outside useEffect to follow Rules of Hooks
  const handleRemixParam = useCallback(async () => {
    // Prevent hook calls during initial render
    if (!mounted) {
      return;
    }
    
    const remixToken = searchParams.get('remix');
    
    // Don't load remix if user manually removed the fusion or we just reset the state
    if (remixToken && selectedMovies.length === 0 && !userRemovedFusion) {
      try {
        const response = await fetch(`/api/fusion/${remixToken}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setIsRemixMode(true);
          setRemixFusionData(result.data);
          setUserRemovedFusion(false); // Reset flag when successfully loading a new fusion
          
          // Use sourceMovies if available, otherwise fallback to movieIds
          if (result.data.sourceMovies && result.data.sourceMovies.length > 0) {
            // Create a single fusion movie object instead of multiple source movies
            const fusionMovie = {
              id: result.data.id,
              title: result.data.fusionData?.title || 'Remixing',
              poster_path: result.data.fusionData?.poster_path || result.data.sourceMovies[0]?.poster_path || null,
              overview: result.data.fusionData?.synopsis || '',
              release_date: result.data.fusionData?.release_date || '',
              vote_average: result.data.fusionData?.rating || 0,
              genre_ids: result.data.fusionData?.genres?.map((g: any) => g.id) || [],
              isFusion: true,
              share_token: result.data.share_token,
              sourceMovieIds: result.data.movieIds || [],
              sourceMovies: result.data.sourceMovies
            };
            
            setSelectedMovies([fusionMovie]);
          } else if (result.data.movieIds && result.data.movieIds.length > 0) {
            // Create minimal movie objects for backward compatibility
            const validMovies = result.data.movieIds.map((movieId: string) => ({
              id: movieId,
              title: `Movie ${movieId}`,
              poster_path: null,
              release_date: '',
              overview: '',
              vote_average: 0,
              genre_ids: []
            }));
            setSelectedMovies(validMovies);
          } else {
            console.warn('No movie data found for remix');
            setSelectedMovies([]);
          }
        } else {
          console.error('Failed to load remix fusion:', result.error || 'Unknown error');
          setSelectedMovies([]);
        }
      } catch (error) {
        console.error('Error loading remix fusion:', error);
        setSelectedMovies([]);
      }
    }
  }, [searchParams, selectedMovies.length, resetKey, mounted, userRemovedFusion]);

  // Load trending movies on mount (only if not provided by server) and handle remix parameter
  useEffect(() => {
    const loadTrendingMovies = async () => {
      // Skip if we already have trending movies from the server
      if (trendingMovies.length > 0) return;
      
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
    handleRemixParam();
  }, [searchParams, resetKey, handleRemixParam, trendingMovies.length]);

  // Handle global search
  useEffect(() => {
    const handleGlobalSearch = async () => {
      const query = globalSearchQuery.trim().toLowerCase();
      if (!query) {
        setGlobalSearchResults([]);
        return;
      }
      
      // Local Search (Instant)
      const localMatches = trendingMovies.filter(movie => 
        movie.title.toLowerCase().includes(query)
      );
      
      // Update with local matches immediately
      if (localMatches.length > 0) {
        setGlobalSearchResults(localMatches.slice(0, 8));
      }
      
      // TMDB API Search (Network)
      try {
        const response = await searchMovies(globalSearchQuery, 1, { timeout: 10000 });
        const apiResults = response.results.slice(0, 8);
        
        // Merge results: API results usually higher quality, but local results are instant
        // We prioritize API results but keep any local matches if API is slow or returns few results
        setGlobalSearchResults(prev => {
          // If we have API results, we prefer them
          if (apiResults.length > 0) return apiResults;
          // Fail-safe to local matches
          return localMatches.slice(0, 8);
        });
      } catch (error) {
        console.error('Error searching movies:', error);
        // If API fails, keep local results if we have them
        if (localMatches.length === 0) setGlobalSearchResults([]);
      }
    };
    
    const timeoutId = setTimeout(handleGlobalSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [globalSearchQuery, trendingMovies]);

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
    setSelectedMovies((prev) => {
      const updatedMovies = prev.filter((m) => m.id !== movieId);
      
      // Check if we're removing a fusion movie
      const removedMovie = prev.find((m) => m.id === movieId);
      const isRemovingFusion = removedMovie?.isFusion;
      
      // If we removed the last fusion movie, exit remix mode and set flag to clear remix URL
      if (isRemovingFusion && updatedMovies.every(m => !m.isFusion)) {
        setIsRemixMode(false);
        setRemixFusionData(null);
        setUserRemovedFusion(true);
        setShouldClearRemixParam(true);
      }
      
      return updatedMovies;
    });
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
    // Clear remix mode when all movies are cleared
    setIsRemixMode(false);
    setRemixFusionData(null);
    setUserRemovedFusion(true);
    setShouldClearRemixParam(true);
  }, []);

  const handleReset = useCallback(() => {
    setFusionResult(null);
    setSelectedMovies([]);
    setJobId(null);
  }, []);

  const handleFusionUpdate = useCallback((updatedFusion: FusionResult) => {
    setFusionResult(updatedFusion);
  }, []);

  /**
   * Polls the job status API until completion or failure.
   */
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/fuse/status/${id}`);
      const result = await response.json();

      if (result.success) {
        if (result.status === 'completed') {
          setFusionResult(result.data);
          setIsGenerating(false);
          setJobId(null);
        } else {
          // Update status message for the UI
          const statusMessage = result.status === 'active' 
            ? 'CineMash is thinking...' 
            : `Queue position: ${result.status}`;
          setIsGenerating(statusMessage);
          
          // Poll again after a short delay
          setTimeout(() => pollJobStatus(id), 1500);
        }
      } else {
        throw new Error(result.error || 'Job failed');
      }
    } catch (error: any) {
      console.error('[Polling] Error:', error);
      alert(error.message || 'The fusion took too long or failed. Please try again.');
      setIsGenerating(false);
      setJobId(null);
    }
  }, []);

  const handleFuse = useCallback(async () => {
    if (selectedMovies.length < 2 || selectedMovies.length > 4) return;
    
    setIsGenerating('Creating your fusion...');
    try {
      const response = await fetch('/api/fuse-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          movieIds: selectedMovies.map((m) => {
            const id = Number(m.id);
            return isNaN(id) ? 0 : id;
          }) 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Direct result from fuse-simple endpoint
        setFusionResult(result.data);
        setIsGenerating(false);
      } else {
        throw new Error(result.error || 'Failed to create fusion');
      }
    } catch (error: any) {
      console.error('Fusion error:', error);
      alert(error.message || 'Something went wrong while fusing.');
      setIsGenerating(false);
    }
  }, [selectedMovies]);

  const handleRegenerate = useCallback(async () => {
    if (selectedMovies.length < 2 || selectedMovies.length > 4) return;
    
    setIsGenerating('Regenerating fusion...');
    try {
      const response = await fetch('/api/fuse-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          movieIds: selectedMovies.map((m) => {
            const id = Number(m.id);
            return isNaN(id) ? 0 : id;
          }) 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setFusionResult(result.data);
        setIsGenerating(false);
      } else {
        throw new Error(result.error || 'Failed to regenerate fusion');
      }
    } catch (error: any) {
      console.error('Regeneration error:', error);
      alert(error.message || 'Something went wrong while regenerating.');
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

  if (!mounted) return null;

  return (
    <div className="relative flex-1 flex flex-col">
      
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
        isRemixMode={isRemixMode}
        remixFusionData={remixFusionData}
        onMovieSelect={handleMovieSelect}
        onMovieRemove={handleMovieRemove}
        onClearAll={handleClearAll}
        onSaveToGallery={() => console.log('Save to gallery')}
        onFusionUpdate={handleFusionUpdate}
        onRegenerate={handleRegenerate}
        onReset={handleReset}
        onFuse={handleFuse}
      />

      {/* Dynamic Guide */}
      <DynamicGuide
        currentPage="studio"
        selectedMoviesCount={selectedMovies.length}
        isGenerating={isGenerating}
        hasFusionResult={!!fusionResult}
        isVisible={showGuide}
        onVisibilityChange={setShowGuide}
      />

      {/* Guide Button */}
      <GuideButton
        onClick={() => setShowGuide(!showGuide)}
        isVisible={showGuide}
      />
    </div>
  );
}
