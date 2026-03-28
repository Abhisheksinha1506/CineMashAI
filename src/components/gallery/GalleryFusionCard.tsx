'use client';

import { useState, useEffect } from 'react';
import { Heart, Eye, Sparkles, Film } from 'lucide-react';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
  onClick?: () => void;
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
  onClick,
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
    
    if (hasVoted) {
      toast.error('You already upvoted this fusion!');
      return;
    }
    
    if (isVoting) return;

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
  const movie1 = sourceMovies[0] || { title: 'Cinema', poster_path: null };
  const movie2 = sourceMovies[1] || { title: 'Alchemy', poster_path: null };
  const movie3 = sourceMovies[2];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-white/[0.06] hover:border-[#00f0ff]/20 transition-all duration-400 bg-[#0c0c0e] hover:shadow-[0_8px_40px_rgba(0,240,255,0.08)] cursor-pointer"
    >
      {/* Subtle top glow line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/0 to-transparent group-hover:via-[#00f0ff]/30 transition-all duration-500" />

      {/* Collage Header */}
      <div className="relative h-44 overflow-hidden">
          {/* Coming Soon Placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900/80 to-black">
            <div className="w-12 h-12 rounded-full border border-white/5 bg-black/40 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              <Film className="h-5 w-5 text-[#00f0ff]/40" />
            </div>
            <div className="px-3 py-1.5 rounded-full border border-[#00f0ff]/10 bg-[#00f0ff]/5 backdrop-blur-sm">
              <p className="text-[8px] font-black text-[#00f0ff]/70 uppercase tracking-[0.2em]">
                Movie Poster Coming Soon
              </p>
            </div>
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-transparent" />

          {/* Fusion × badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {sourceMovies.slice(0, 3).map((m: any, i: number) => (
              <span key={i} className="text-xs font-black text-white/60 uppercase tracking-wider bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                {m.title?.split(' ')[0]}
              </span>
            ))}
          </div>

        </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title always visible */}
        <div>
          <h4 className="text-white font-black text-base leading-tight uppercase tracking-tight line-clamp-1">
            {title}
          </h4>
          <p className="text-zinc-400 text-sm italic line-clamp-1 mt-0.5">
            {tagline}
          </p>
        </div>

        {/* Synopsis preview */}
        {synopsis && (
          <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">
            {synopsis}
          </p>
        )}

        {/* Metadata counts */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {keyScenes && keyScenes.length > 0 && (
            <span className="flex items-center gap-1">
              <Film className="h-3 w-3" />
              {keyScenes.length} scenes
            </span>
          )}
          {suggestedCast && suggestedCast.length > 0 && (
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
              className={`flex items-center gap-1.5 text-sm transition-colors group/heart ${
                hasVoted 
                  ? 'text-[#ff00aa]' 
                  : 'text-zinc-500 hover:text-[#ff00aa]'
              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleVote}
              disabled={isVoting}
              aria-label={hasVoted ? `Already upvoted ${title}` : `Upvote ${title}`}
              title={hasVoted ? 'Already upvoted' : 'Upvote this fusion'}
            >
              <Heart className={`h-4 w-4 ${hasVoted ? 'fill-current' : ''} group-hover/heart:scale-125 transition-transform ${isVoting ? 'animate-pulse' : ''}`} />
              <span className="font-bold">{currentUpvotes}</span>
            </button>
            <span className="text-xs text-zinc-500 font-medium">
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
            title="Create a new fusion based on this one"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff00aa]/10 border border-[#ff00aa]/20 text-[#ff00aa] text-xs font-black uppercase tracking-wide hover:bg-[#ff00aa]/15 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Remix
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
