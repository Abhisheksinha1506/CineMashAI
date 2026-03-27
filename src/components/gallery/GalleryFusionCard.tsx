'use client';

import { useState, useEffect } from 'react';
import { Heart, Eye, Sparkles, Film } from 'lucide-react';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface GalleryFusionCardProps {
  id: string;
  title: string;
  tagline: string;
  posterUrl?: string;
  upvotes: number;
  createdAt: string;
  share_token: string;
  sourceMovies: any[];
  synopsis?: string;
  keyScenes?: any[];
  suggestedCast?: any[];
  onRemix?: () => void;
  onVoteUpdate?: (newUpvotes: number) => void;
}

export function GalleryFusionCard({
  id,
  title,
  tagline,
  posterUrl,
  upvotes,
  createdAt,
  share_token,
  sourceMovies = [],
  synopsis,
  keyScenes,
  suggestedCast,
  onRemix,
  onVoteUpdate,
}: GalleryFusionCardProps) {
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
    
    if (isVoting || hasVoted) return;

    setIsVoting(true);
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
        setHasVoted(true);
        onVoteUpdate?.(newUpvotes);
      }
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  };
  const movie1 = sourceMovies[0] || { title: 'Cinema', poster_path: null };
  const movie2 = sourceMovies[1] || { title: 'Alchemy', poster_path: null };
  const movie3 = sourceMovies[2];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative rounded-2xl overflow-hidden border border-white/[0.06] hover:border-[#00f0ff]/20 transition-all duration-400 bg-[#0c0c0e] hover:shadow-[0_8px_40px_rgba(0,240,255,0.08)] cursor-pointer"
    >
      {/* Subtle top glow line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/0 to-transparent group-hover:via-[#00f0ff]/30 transition-all duration-500" />

      {/* Collage Header */}
      <Link href={`/fusion/${share_token}`}>
        <div className="relative h-44 overflow-hidden">
          {/* Split poster collage */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 relative overflow-hidden">
              <img
                src={getMoviePosterUrl(movie1.poster_path, 'w342')}
                alt={movie1.title}
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            {movie3 ? (
              <>
                <div className="flex-1 relative overflow-hidden">
                  <img
                    src={getMoviePosterUrl(movie2.poster_path, 'w342')}
                    alt={movie2.title}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <img
                    src={getMoviePosterUrl(movie3.poster_path, 'w342')}
                    alt={movie3.title}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 relative overflow-hidden">
                <img
                  src={getMoviePosterUrl(movie2.poster_path, 'w342')}
                  alt={movie2.title}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                />
              </div>
            )}
          </div>

          {/* Divider lines between posters */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div className="flex-1" />
            <div className="w-[1px] bg-black/60" />
            <div className="flex-1" />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/20 to-transparent" />

          {/* Fusion × badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {sourceMovies.slice(0, 3).map((m: any, i: number) => (
              <span key={i} className="text-[10px] font-black text-white/50 uppercase tracking-wider bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                {m.title?.split(' ')[0]}
              </span>
            ))}
          </div>

          {/* Title overlay (appears on hover) */}
          <div className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-black text-base leading-tight uppercase tracking-tight line-clamp-2" style={{ textShadow: '0 0 15px rgba(0,240,255,0.5)' }}>
              {title}
            </h3>
          </div>

          {/* View counts removed to prevent hydration mismatches */}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title always visible */}
        <div>
          <h4 className="text-white font-black text-[14px] leading-tight uppercase tracking-tight line-clamp-1">
            {title}
          </h4>
          <p className="text-zinc-500 text-[11px] italic line-clamp-1 mt-0.5">
            {tagline}
          </p>
        </div>

        {/* Synopsis preview */}
        {synopsis && (
          <p className="text-zinc-400 text-[11px] line-clamp-2 leading-relaxed">
            {synopsis}
          </p>
        )}

        {/* Metadata counts */}
        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
          {keyScenes && (
            <span className="flex items-center gap-1">
              <Film className="h-3 w-3" />
              {keyScenes.length} scenes
            </span>
          )}
          {suggestedCast && (
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {suggestedCast.length} cast
            </span>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-1">
          {/* Stats */}
          <div className="flex items-center gap-3">
            <button
              className={`flex items-center gap-1.5 text-[11px] transition-colors group/heart ${
                hasVoted 
                  ? 'text-[#ff00aa]' 
                  : 'text-zinc-500 hover:text-[#ff00aa]'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleVote}
              disabled={isVoting || hasVoted}
              aria-label={hasVoted ? `Already upvoted ${title}` : `Upvote ${title}`}
              title={hasVoted ? 'Already upvoted' : 'Upvote this fusion'}
            >
              <Heart className={`h-3 w-3 ${hasVoted ? 'fill-current' : ''} group-hover/heart:scale-125 transition-transform ${isVoting ? 'animate-pulse' : ''}`} />
              <span className="font-bold">{currentUpvotes}</span>
            </button>
            <span className="text-[10px] text-zinc-600 font-medium">
              {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Remix button */}
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 12px rgba(255,0,170,0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemix?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff00aa]/10 border border-[#ff00aa]/20 text-[#ff00aa] text-[11px] font-black uppercase tracking-wide hover:bg-[#ff00aa]/15 transition-all"
          >
            <Sparkles className="h-3 w-3" />
            Remix
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
