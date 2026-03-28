'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Heart, Sparkles, Clock, Star, 
  MapPin, Users, Palette, Film, Share2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FusionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fusion: any | null;
  onVoteUpdate?: (id: string, newUpvotes: number) => void;
}

export function FusionDetailsModal({ 
  isOpen, 
  onClose, 
  fusion,
  onVoteUpdate 
}: FusionDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'cast'>('overview');
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentUpvotes, setCurrentUpvotes] = useState(0);

  useEffect(() => {
    if (fusion) {
      setCurrentUpvotes(fusion.upvotes || 0);
      setHasVoted(false);
      setActiveTab('overview');
    }
  }, [fusion]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!fusion) return null;

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (hasVoted) {
      toast.error('You already upvoted this fusion!');
      return;
    }
    
    if (isVoting || !fusion.share_token) return;

    // Optimistic update — prevents double submissions
    setIsVoting(true);
    setHasVoted(true);
    const previousUpvotes = currentUpvotes;
    setCurrentUpvotes(prev => prev + 1);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: fusion.share_token,
          voteType: 'up'
        })
      });

      const result = await response.json();
      if (result.success) {
        const newUpvotes = result.data.newUpvotes;
        setCurrentUpvotes(newUpvotes);
        onVoteUpdate?.(fusion.id, newUpvotes);
      } else {
        // Rollback on failure
        setHasVoted(false);
        setCurrentUpvotes(previousUpvotes);
        console.error('Vote failed:', result.error);
      }
    } catch (error) {
      // Rollback on network error
      setHasVoted(false);
      setCurrentUpvotes(previousUpvotes);
      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const posters = fusion.movieIds?.map((id: any, idx: number) => {
    const sourceMovie = fusion.sourceMovies?.[idx];
    return sourceMovie?.poster_path ? getMoviePosterUrl(sourceMovie.poster_path, 'w500') : null;
  }).filter(Boolean) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl h-[85vh] max-h-[700px] rounded-[2rem] overflow-hidden border border-white/10 bg-[#0c0c0e] shadow-[0_0_100px_rgba(0,240,255,0.15)] flex flex-col lg:flex-row"
          >
            
            {/* Poster Section (Left) */}
            <div className="lg:w-2/5 relative overflow-hidden group border-r border-white/5">
              <div className="absolute inset-0 opacity-30 grid grid-cols-2">
                {posters.map((url: string, idx: number) => (
                  <div key={idx} className="relative h-full">
                    <img 
                      src={url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              
              {/* Fallback pattern if no posters */}
              {posters.length === 0 && (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                  <Film className="h-24 w-24 text-zinc-800" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 backdrop-blur-[2px]" />
              
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="w-20 h-20 rounded-full border border-white/10 bg-black/40 flex items-center justify-center mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                >
                  <Film className="h-8 w-8 text-[#00f0ff]/50" />
                </motion.div>
                
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight uppercase tracking-wide mb-6" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  {fusion.title}
                </h2>
                
                <div className="px-5 py-2.5 rounded-full border border-[#00f0ff]/20 bg-[#00f0ff]/5 backdrop-blur-sm shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                  <p className="text-[10px] font-black text-[#00f0ff]/80 uppercase tracking-[0.25em]">
                    Movie Poster Coming Soon
                  </p>
                </div>
              </div>
            </div>

            {/* Details Section (Right) */}
            <div className="lg:w-3/5 flex flex-col bg-[#0c0c0e]">
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    "flex-1 py-6 text-sm font-black uppercase tracking-[0.2em] transition-all relative",
                    activeTab === 'overview' ? "text-[#00f0ff] bg-white/[0.02]" : "text-zinc-500 hover:text-white"
                  )}
                >
                  Overview
                  {activeTab === 'overview' && (
                    <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('cast')}
                  className={cn(
                    "flex-1 py-6 text-sm font-black uppercase tracking-[0.2em] transition-all relative",
                    activeTab === 'cast' ? "text-[#00f0ff] bg-white/[0.02]" : "text-zinc-500 hover:text-white"
                  )}
                >
                  Cast
                  {activeTab === 'cast' && (
                    <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar text-left">
                <AnimatePresence mode="wait">
                  {activeTab === 'overview' ? (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      {/* Synopsis */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#00f0ff]/50">The Logline</p>
                        </div>
                        <p className="text-[15px] text-zinc-200 leading-relaxed font-light italic">
                          "{fusion.synopsis}"
                        </p>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                          <p className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-1">Box Office Vibe</p>
                          <p className="text-[12px] font-bold text-white leading-snug">{fusion.box_office_vibe || 'A surefire blockbuster'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                          <p className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-1">Production</p>
                          <p className="text-[12px] font-bold text-white">{fusion.runtime || '2h 15m'} · {fusion.rating || 'R'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cast"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-8"
                    >
                      {(fusion.suggested_cast || fusion.suggestedCast || []).map((c: any, i: number) => (
                        <div key={i} className="flex flex-col items-center text-center group">
                          <div className="relative mb-4">
                            {c.headshotUrl ? (
                              <img src={c.headshotUrl} alt={c.name} className="w-16 h-16 rounded-full object-cover border-[3px] border-[#00f0ff]/40 group-hover:border-[#00f0ff] transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.1)]" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-[3px] border-[#00f0ff]/40 flex items-center justify-center group-hover:border-[#00f0ff] transition-all duration-300">
                                <span className="text-[20px] font-black text-zinc-600">{c.name?.[0]}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 rounded-full bg-[#00f0ff]/30 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/60 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                          </div>
                          <div>
                            <h3 className="text-[15px] font-black text-white uppercase tracking-tight leading-none mb-2">{c.name}</h3>
                            <p className="text-[12px] text-[#00f0ff] font-bold uppercase tracking-widest mb-3">{c.role}</p>
                            <p className="text-[12px] text-zinc-400 italic max-w-[200px] leading-relaxed mx-auto">{c.why_fit || c.reason}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/40">
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleVote}
                    disabled={isVoting}
                    className={cn(
                      "flex items-center gap-3 transition-all group",
                      hasVoted ? "text-[#ff038b]" : "text-zinc-500 hover:text-[#ff038b]"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-full border border-current transition-all",
                      hasVoted ? "bg-[#ff038b]/10 shadow-[0_0_20px_rgba(255,3,139,0.3)]" : "group-hover:bg-white/5"
                    )}>
                      <Heart className={cn("h-6 w-6", hasVoted && "fill-current")} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-white leading-none mb-1">{currentUpvotes}</p>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Upvotes</p>
                    </div>
                  </button>

                  <div className="h-10 w-[1px] bg-white/5 hidden sm:block" />

                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-black text-white leading-none mb-1">
                      {fusion.createdAt ? new Date(fusion.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Mar 25, 2026'}
                    </p>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Released</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                  <button
                    onClick={() => window.location.href = `/studio?remix=${fusion.share_token}`}
                    className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-[#ff00aa] to-[#00f0ff] rounded-full text-black font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_50px_rgba(0,240,255,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Remix Fusion
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
