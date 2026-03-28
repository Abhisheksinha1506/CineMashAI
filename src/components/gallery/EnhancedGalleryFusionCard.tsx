'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Sparkles, Calendar } from 'lucide-react';
import Image from 'next/image';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';

interface EnhancedGalleryFusionCardProps {
  id: string;
  title: string;
  tagline: string;
  posterUrl?: string;
  sourceMovies?: any[];
  upvotes?: number;
  created_at?: string;
  share_token?: string;
  onRemix?: (share_token: string) => void;
  onVoteUpdate?: (newUpvotes: number) => void;
  onClick?: () => void;
}

export function EnhancedGalleryFusionCard({
  id,
  title,
  tagline,
  posterUrl,
  sourceMovies = [],
  upvotes = 0,
  created_at,
  share_token,
  onRemix,
  onVoteUpdate,
  onClick,
}: EnhancedGalleryFusionCardProps) {
  const [currentUpvotes, setCurrentUpvotes] = useState(upvotes);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isVoting || hasVoted || !share_token) return;

    // Optimistic Update
    setIsVoting(true);
    setHasVoted(true);
    const previousUpvotes = currentUpvotes;
    setCurrentUpvotes(prev => prev + 1);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: share_token,
          voteType: 'up'
        })
      });

      const result = await response.json();
      if (result.success) {
        const newUpvotes = result.data.newUpvotes;
        setCurrentUpvotes(newUpvotes);
        onVoteUpdate?.(newUpvotes);
      } else {
        // Rollback
        setHasVoted(false);
        setCurrentUpvotes(previousUpvotes);
      }
    } catch (error) {
      console.error('Vote error:', error);
      // Rollback
      setHasVoted(false);
      setCurrentUpvotes(previousUpvotes);
    } finally {
      setIsVoting(false);
    }
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const eyeCount = (upvotes || 0) * 12 + 450;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: '0 0 40px rgba(0,240,255,0.2)'
      }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--primary)]/30 transition-all duration-300 cursor-pointer"
    >
      {/* Collage Header */}
      <div className="relative h-48 overflow-hidden">
        {/* Collage Background */}
        <div className="absolute inset-0">
          {sourceMovies.slice(0, 3).map((movie, idx) => (
            <div
              key={movie.id}
              className="absolute inset-0"
              style={{
                transform: `translate(${idx * 15}%, ${idx * 10}%) scale(${1.1 - idx * 0.05})`,
                opacity: 0.7 - idx * 0.2,
                filter: `blur(${idx * 0.5}px)`
              }}
            >
              <Image
                src={getMoviePosterUrl(movie.poster_path, 'w500')}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                placeholder="blur"
              />
            </div>
          ))}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Main Poster */}
        <div className="absolute inset-0 flex items-center justify-center">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
              placeholder="blur"
              style={{ objectFit: 'contain', maxHeight: '85%', maxWidth: '85%' }}
            />
          ) : (
            <div className="w-32 h-44 bg-gradient-to-br from-[#00f0ff]/20 to-[#ff00aa]/20 rounded-xl" />
          )}
        </div>

        {/* Date Badge */}
        {created_at && (
          <div className="absolute top-3 right-3 px-2 py-1 glassmorphism dark:glassmorphism light:bg-[var(--card)]/80 border border-white/[0.2] dark:border-white/[0.2] light:border-[var(--border)] rounded-full">
            <div className="flex items-center gap-1 text-[9px] text-zinc-300 dark:text-zinc-300 light:text-zinc-600">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(created_at)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title and Tagline */}
        <div>
          <h3 className="text-[16px] font-black text-[var(--text)] dark:text-white light:text-[var(--text)] uppercase tracking-tight leading-tight mb-1">
            {title}
          </h3>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-400 light:text-zinc-500 italic leading-relaxed line-clamp-2">
            {tagline}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className={`flex items-center gap-1.5 transition-colors ${
                hasVoted 
                  ? 'text-[var(--secondary)]' 
                  : 'text-[var(--secondary)] hover:text-[var(--secondary)]'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleVote}
              disabled={isVoting || hasVoted}
              aria-label={hasVoted ? `Already upvoted ${title}` : `Upvote ${title}`}
              title={hasVoted ? 'Already upvoted' : 'Upvote this fusion'}
            >
              <Heart className={`h-4 w-4 ${hasVoted ? 'fill-current' : ''} ${isVoting ? 'animate-pulse' : ''}`} />
              <span className="text-[12px] font-bold text-[var(--text)] dark:text-white light:text-[var(--text)]">{currentUpvotes}</span>
            </button>
          </div>
        </div>

        {/* Remix Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemix?.(share_token || id);
          }}
          title="Create a new fusion based on this one"
          className="w-full px-4 py-3 bg-gradient-to-r from-[var(--primary)]/10 to-[var(--primary)]/5 border border-[var(--primary)]/30 rounded-xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all focus-ring shadow-[0_0_15px_rgba(0,240,255,0.1)]"
        >
          <Sparkles className="h-4 w-4" />
          Remix Mashup
        </motion.button>
      </div>
    </motion.div>
  );
}
