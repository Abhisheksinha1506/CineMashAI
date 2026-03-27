'use client';

import {
  Download, Share2, MessageSquare, Clapperboard, Users,
  Palette, Star, Clock, Film, ChevronRight, Sparkles, RefreshCw
} from 'lucide-react';
import { Scene, CastMember } from '@/types';
import { getMoviePosterUrl } from '@/lib/tmdb-simple';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

interface FusionResultCardProps {
  title: string;
  tagline: string;
  synopsis: string;
  key_scenes?: Scene[];
  keyScenes?: Scene[];
  suggested_cast?: CastMember[];
  suggestedCast?: CastMember[];
  runtime: string | number;
  rating: string;
  box_office_vibe: string;
  movie_ids: string[];
  share_token: string;
  sourceMovies?: any[];
  onSaveToGallery?: () => void;
  onRemix?: () => void;
  onShareLink?: () => void;
  onRegenerate?: () => void;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Palette },
  { id: 'cast', label: 'Cast', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

export function FusionResultCard({
  title,
  tagline,
  synopsis,
  key_scenes,
  keyScenes,
  suggested_cast,
  suggestedCast,
  runtime,
  rating,
  box_office_vibe,
  sourceMovies = [],
  share_token,
  onSaveToGallery,
  onShareLink,
  onRegenerate,
}: FusionResultCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copied, setCopied] = useState(false);

  const scenes = key_scenes || keyScenes || [];
  const cast = suggested_cast || suggestedCast || [];
  
  // Validate synopsis word count
  const synopsisWordCount = synopsis.split(/\s+/).filter(word => word.length > 0).length;
  const isValidWordCount = synopsisWordCount >= 220 && synopsisWordCount <= 280;
  
  // Validate key scenes count
  const isValidScenesCount = scenes.length === 6;
  
  // Validate cast data structure
  const isValidCastStructure = cast.every(c => 
    c.name && c.role && (c.reason || c.why_fit) && c.headshotUrl
  );
  const validCastCount = cast.filter(c => 
    c.name && c.role && (c.reason || c.why_fit) && c.headshotUrl
  ).length;
  
  // Create poster collage for 2-4 movies
  const renderPosterCollage = () => {
    if (sourceMovies.length === 0) return null;
    
    const posters = sourceMovies.slice(0, 4).map(movie => ({
      url: movie.poster_path ? getMoviePosterUrl(movie.poster_path, 'w500') : null,
      title: movie.title
    }));
    
    if (posters.length === 1) {
      return (
        <div className="relative w-full h-full">
          {posters[0].url && (
            <img
              src={posters[0].url}
              alt={posters[0].title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      );
    }
    
    if (posters.length === 2) {
      return (
        <div className="relative w-full h-full">
          {/* Diagonal split for 2 posters */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 clip-diagonal-left">
              {posters[0].url && (
                <img
                  src={posters[0].url}
                  alt={posters[0].title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="absolute inset-0 clip-diagonal-right">
              {posters[1].url && (
                <img
                  src={posters[1].url}
                  alt={posters[1].title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // For 3-4 posters, create a grid with diagonal overlay
    return (
      <div className="relative w-full h-full grid grid-cols-2 grid-rows-2">
        {posters.map((poster, idx) => (
          <div key={idx} className="relative overflow-hidden">
            {poster.url && (
              <img
                src={poster.url}
                alt={poster.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
        {/* Diagonal overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
      </div>
    );
  };

  const copyShare = () => {
    const url = `${window.location.origin}/fusion/${share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    onShareLink?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative w-full max-w-6xl mx-auto"
    >
      {/* Enhanced ambient glow behind card */}
      <div className="absolute -inset-8 bg-gradient-to-r from-[var(--primary)]/10 via-transparent to-[var(--secondary)]/10 blur-[60px] rounded-full -z-10 transition-colors duration-300" />

      <div className="rounded-[2.5rem] overflow-hidden border border-[var(--primary)]/15 bg-[#0a0a0c] dark:bg-[#0a0a0c] light:bg-[var(--card)] shadow-[0_0_80px_rgba(0,0,0,0.9)] dark:shadow-[0_0_80px_rgba(0,0,0,0.9)] light:shadow-[0_4px_32px_rgba(0,0,0,0.15)] transition-colors duration-300">
        {/* Top Border Badge */}
        <div className="relative border-t border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/5 via-transparent to-[var(--primary)]/5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex justify-center py-3"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 glassmorphism border border-[var(--primary)]/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest">
                Fresh Fusion • Powered by Groq
              </span>
              <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">

          {/* ── Enhanced Poster Collage Column ─────────────────────── */}
          <div className="lg:col-span-5 relative group overflow-hidden border-r border-white/[0.04] dark:border-white/[0.04] light:border-[var(--border)]" style={{ minHeight: '600px' }}>

            {/* Enhanced poster collage with larger posters */}
            <div className="absolute inset-0">
              {renderPosterCollage()}
            </div>
            
            {/* Fallback if no posters */}
            {sourceMovies.length === 0 && (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-900 dark:to-black light:from-[var(--border)] light:to-[var(--card)] flex items-center justify-center">
                <Clapperboard className="h-24 w-24 text-zinc-800 dark:text-zinc-800 light:text-zinc-600" />
              </div>
            )}

            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            
            {/* Enhanced neon border on hover */}
            <div className="absolute inset-0 border-4 border-transparent group-hover:border-[var(--primary)]/30 rounded-none transition-all duration-500" />
            
            {/* Enhanced neon title overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-center"
              >
                <h2 
                  className="text-5xl lg:text-6xl font-black tracking-[-0.06em] text-white uppercase leading-tight mb-3"
                  style={{ 
                    textShadow: '0 0 60px rgba(0,240,255,0.8), 0 0 120px rgba(255,0,170,0.6), 0 0 180px rgba(0,240,255,0.4)'
                  }}
                >
                  {title}
                </h2>
                <p 
                  className="text-xl lg:text-2xl italic text-[#ff00aa] font-light tracking-wide"
                  style={{ 
                    textShadow: '0 0 30px rgba(255,0,170,1), 0 0 60px rgba(255,0,170,0.6)'
                  }}
                >
                  "{tagline}"
                </p>
              </motion.div>
            </div>

            {/* Gold stamp */}
            <div className="absolute top-5 left-5 rotate-[-8deg] z-10">
              <div className="bg-gradient-to-r from-[#f5c842] to-[#e6a800] text-black px-4 py-1.5 rounded font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(245,200,66,0.4)]">
                Potential Blockbuster
              </div>
            </div>

            {/* Rating badge */}
            <div className="absolute top-5 right-5 z-10">
              <div className="px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 text-white text-[11px] font-black backdrop-blur-sm">
                {rating}
              </div>
            </div>

            {/* Bottom title block */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
              {/* Source DNA pills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {sourceMovies.map((movie, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
                    <img
                      src={getMoviePosterUrl(movie.poster_path, 'w92')}
                      className="h-3 w-2 object-cover rounded-[1px]"
                      alt=""
                    />
                    <span className="text-[9px] font-bold text-white/60 uppercase">{movie.title?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              <motion.h2
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black tracking-[-0.04em] text-white uppercase leading-tight mb-2"
                style={{ textShadow: '0 0 30px rgba(0,240,255,0.2)' }}
              >
                {title}
              </motion.h2>
              <p className="text-[#00f0ff] text-[11px] font-black tracking-[0.25em] uppercase opacity-80">
                {tagline}
              </p>

              {/* Runtime */}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {runtime}
                </span>
                <span className="h-px w-3 bg-white/20" />
                <span className="flex items-center gap-1">
                  <Star className="h-2.5 w-2.5 text-[#f5c842] fill-current" />
                  {rating}
                </span>
              </div>
            </div>
          </div>

          {/* ── Enhanced Content Area ─────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col bg-[#0a0a0c]">
            
            {/* Enhanced tabs */}
            <div className="flex border-b border-white/[0.04]">
              {TABS.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative',
                    activeTab === tab.id
                      ? 'text-[#00f0ff] bg-white/[0.02]'
                      : 'text-zinc-600 hover:text-white hover:bg-white/[0.02]'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00f0ff]"
                      style={{ boxShadow: '0 0 12px rgba(0,240,255,0.8)' }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Enhanced tab content with increased padding */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 max-h-[600px]">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="space-y-6"
                  >
                    {/* Synopsis */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#00f0ff]/50">The Logline</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-medium ${
                            isValidWordCount 
                              ? 'text-green-500' 
                              : 'text-yellow-500'
                          }`}>
                            {synopsisWordCount} words
                          </span>
                          {!isValidWordCount && (
                            <span className="text-[9px] text-yellow-500" title="Target: 220-280 words">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[15px] text-zinc-200 leading-relaxed font-light italic">
                        "{synopsis}"
                      </p>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                        <p className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-1">Box Office Vibe</p>
                        <p className="text-[12px] font-bold text-white leading-snug">{box_office_vibe}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.05]">
                        <p className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-1">Production</p>
                        <p className="text-[12px] font-bold text-white">{runtime} · {rating}</p>
                      </div>
                    </div>
                  </motion.div>
                )}



                {activeTab === 'cast' && (
                  <motion.div
                    key="cast"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#00f0ff]/50">Dream Cast</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-medium ${
                          isValidCastStructure 
                            ? 'text-green-500' 
                            : 'text-yellow-500'
                        }`}>
                          {validCastCount}/{cast.length} complete
                        </span>
                        {!isValidCastStructure && (
                          <span className="text-[9px] text-yellow-500" title="Some cast members missing data">
                            ⚠️
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced circular headshots with cyan rings */}
                    <div className="grid grid-cols-2 gap-6">
                      {cast.map((c, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08, duration: 0.4 }}
                          className="flex flex-col items-center text-center group"
                        >
                          {/* Enhanced circular headshot with cyan ring */}
                          <div className="relative mb-4">
                            {c.headshotUrl && c.headshotUrl !== '' ? (
                              <>
                                <img
                                  src={c.headshotUrl}
                                  alt={c.name}
                                  className="w-20 h-20 rounded-full object-cover border-3 border-[#00f0ff]/40 group-hover:border-[#00f0ff] transition-all duration-300"
                                />
                                {/* Enhanced cyan glow effect */}
                                <div className="absolute inset-0 rounded-full bg-[#00f0ff]/30 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {/* Additional glow ring on hover */}
                                <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/60 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                              </>
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-3 border-[#00f0ff]/40 flex items-center justify-center group-hover:border-[#00f0ff] transition-all duration-300">
                                <span className="text-[22px] font-black text-zinc-600">
                                  {c.name?.charAt(0) || '?'}
                                </span>
                                {/* Enhanced cyan glow effect */}
                                <div className="absolute inset-0 rounded-full bg-[#00f0ff]/30 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {/* Additional glow ring on hover */}
                                <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/60 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-[15px] font-black text-white mb-2">{c.name}</p>
                            <p className="text-[12px] text-[#00f0ff] font-bold uppercase tracking-widest mb-3">{c.role}</p>
                            {c.why_fit && (
                              <p className="text-[10px] text-zinc-400 italic max-w-[160px] mx-auto leading-relaxed">{c.why_fit}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Enhanced action bar with individual glows */}
            <div className="p-6 border-t border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,240,255,0.6)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onSaveToGallery}
                className="flex flex-col items-center justify-center gap-2 h-12 rounded-xl bg-[#00f0ff] text-black font-black text-[10px] uppercase tracking-widest transition-all focus-ring"
                style={{ boxShadow: '0 0 20px rgba(0,240,255,0.4)' }}
                aria-label="Save fusion to gallery"
                tabIndex={0}
              >
                <Download className="h-4 w-4" />
                Save
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(255,0,170,0.6)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = `/studio?remix=${share_token}`}
                className="flex flex-col items-center justify-center gap-2 h-12 rounded-xl bg-[#ff00aa] text-white font-black text-[10px] uppercase tracking-widest transition-all focus-ring"
                style={{ boxShadow: '0 0 20px rgba(255,0,170,0.4)' }}
                aria-label="Remix this fusion"
                tabIndex={0}
              >
                <Sparkles className="h-4 w-4" />
                Remix
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,240,255,0.6)' }}
                whileTap={{ scale: 0.98 }}
                onClick={copyShare}
                className="flex flex-col items-center justify-center gap-2 h-12 rounded-xl border border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-[#00f0ff]/20 focus-ring"
                style={{ boxShadow: '0 0 20px rgba(0,240,255,0.3)' }}
                aria-label={copied ? 'Link copied to clipboard' : 'Copy share link'}
                tabIndex={0}
              >
                {copied ? (
                  <span className="text-[14px]">✓</span>
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                {copied ? 'Copied!' : 'Share'}
              </motion.button>
              
              {/* Refine button removed */}

              {/* Regenerate Button */}
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,240,255,0.6)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onRegenerate}
                className="flex flex-col items-center justify-center gap-2 h-12 rounded-xl border border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-[#00f0ff]/20 focus-ring"
                style={{ boxShadow: '0 0 20px rgba(0,240,255,0.3)' }}
                aria-label="Regenerate fusion"
                tabIndex={0}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom link removed */}
    </motion.div>
  );
}
