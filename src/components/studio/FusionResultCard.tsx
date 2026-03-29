'use client';

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import {
  Clapperboard, Users, Palette, ArrowLeft, Database
} from 'lucide-react';
import { Scene, CastMember } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// Custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 240, 255, 0.3);
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 240, 255, 0.5);
  }
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
`;

// Hook to inject custom scrollbar styles
const useCustomScrollbar = () => {
  useEffect(() => {
    const styleId = 'custom-scrollbar-styles';
    
    // Check if styles already exist
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = customScrollbarStyles;
      document.head.appendChild(styleElement);
    }
    
    // Cleanup function
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
};

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
  onRegenerate?: () => void;
  onBackToStudio?: () => void;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Palette },
  { id: 'cast', label: 'Cast', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

// Memoized poster component to prevent unnecessary re-renders
const PosterCollage = memo(({ sourceMovies }: { sourceMovies: any[] }) => {
  const posterCollage = useMemo(() => {
    if (sourceMovies.length === 0) return null;
    
    const posters = sourceMovies.slice(0, 4).map(movie => ({
      url: movie.poster_path ? getMoviePosterUrl(movie.poster_path, 'w500') : null,
      title: movie.title
    }));
    
    if (posters.length === 1) {
      return (
        <div className="relative w-full h-full">
          {posters[0].url && (
            <Image
              src={posters[0].url}
              alt={posters[0].title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          )}
        </div>
      );
    }
    
    // Handle multiple posters with optimized layout
    return (
      <div className="grid grid-cols-2 gap-1 w-full h-full">
        {posters.map((poster, index) => (
          <div key={index} className="relative">
            {poster.url && (
              <Image
                src={poster.url}
                alt={poster.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
                priority={index < 2}
              />
            )}
          </div>
        ))}
      </div>
    );
  }, [sourceMovies]);
  
  return posterCollage;
});

PosterCollage.displayName = 'PosterCollage';

// Memoized cast member component
const CastMemberCard = memo(({ member, index }: { member: CastMember; index: number }) => (
  <motion.div
    key={`${member.name}-${index}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
  >
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/[0.05]">
      {member.headshotUrl && (
        <Image
          src={member.headshotUrl}
          alt={member.name}
          fill
          className="object-cover"
          sizes="48px"
        />
      )}
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-white">{member.name}</h4>
      <p className="text-sm text-white/70">{member.role}</p>
      <p className="text-xs text-white/50 mt-1">{member.reason || member.why_fit}</p>
    </div>
  </motion.div>
));

CastMemberCard.displayName = 'CastMemberCard';

// Memoized scene component
const SceneCard = memo(({ scene, index }: { scene: Scene; index: number }) => (
  <motion.div
    key={`${scene.scene}-${index}`}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]"
  >
    <h4 className="font-semibold text-white mb-2">{scene.scene}</h4>
    <p className="text-sm text-white/70 leading-relaxed">{scene.description}</p>
  </motion.div>
));

SceneCard.displayName = 'SceneCard';

const FusionResultCard = memo(({
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
  onRegenerate,
  onBackToStudio,
}: FusionResultCardProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  // Inject custom scrollbar styles
  useCustomScrollbar();

  const scenes = key_scenes || keyScenes || [];
  const cast = suggested_cast || suggestedCast || [];
  
  const { synopsisWordCount, isValidWordCount, validCastCount, isValidCastStructure } = useMemo(() => {
    const wordCount = synopsis.split(/\s+/).filter(word => word.length > 0).length;
    const isWordCountValid = wordCount >= 220 && wordCount <= 280;
    const isCastStructureValid = cast.every(c => 
      c.name && c.role && (c.reason || c.why_fit) && c.headshotUrl
    );
    const vCastCount = cast.filter(c => 
      c.name && c.role && (c.reason || c.why_fit) && c.headshotUrl
    ).length;
    
    return {
      synopsisWordCount: wordCount,
      isValidWordCount: isWordCountValid,
      validCastCount: vCastCount,
      isValidCastStructure: isCastStructureValid
    };
  }, [synopsis, cast]);
  
  // Create poster collage for 2-4 movies
  const posterCollage = useMemo(() => {
    if (sourceMovies.length === 0) return null;
    
    const posters = sourceMovies.slice(0, 4).map(movie => ({
      url: movie.poster_path ? getMoviePosterUrl(movie.poster_path, 'w500') : null,
      title: movie.title
    }));
    
    if (posters.length === 1) {
      return (
        <div className="relative w-full h-full">
          {posters[0].url && (
            <Image
              src={posters[0].url}
              alt={posters[0].title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
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
                <Image
                  src={posters[0].url}
                  alt={posters[0].title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              )}
            </div>
            <div className="absolute inset-0 clip-diagonal-right">
              {posters[1].url && (
                <Image
                  src={posters[1].url}
                  alt={posters[1].title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
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
              <Image
                src={poster.url}
                alt={poster.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
                priority
              />
            )}
          </div>
        ))}
        {/* Diagonal overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
      </div>
    );
  }, [sourceMovies]);


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
          <div className="lg:col-span-5 relative group overflow-hidden border-b lg:border-b-0 lg:border-r border-white/[0.04] dark:border-white/[0.04] light:border-[var(--border)] min-h-[300px] lg:min-h-[450px]">

            {/* Enhanced poster collage with larger posters */}
            <div className="absolute inset-0 opacity-30">
              {posterCollage}
            </div>
            
            {/* Fallback if no posters */}
            {sourceMovies.length === 0 && (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-900 dark:to-black light:from-[var(--border)] light:to-[var(--card)] flex items-center justify-center">
                <Clapperboard className="h-24 w-24 text-zinc-800 dark:text-zinc-800 light:text-zinc-600" />
              </div>
            )}

            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 backdrop-blur-[2px]" />
            
            {/* Enhanced neon border on hover */}
            <div className="absolute inset-0 border-4 border-transparent group-hover:border-[var(--primary)]/30 rounded-none transition-all duration-500" />
            
            {/* Coming Soon Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="w-20 h-20 rounded-full border border-white/10 bg-black/40 flex items-center justify-center mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]"
              >
                <Clapperboard className="h-8 w-8 text-[var(--primary)]/50" />
              </motion.div>
              
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-black text-white leading-tight uppercase tracking-wide mb-6"
                style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              >
                {title}
              </motion.h3>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="px-5 py-2.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 backdrop-blur-sm"
              >
                <p className="text-[10px] font-black text-[var(--primary)]/80 uppercase tracking-[0.25em]">
                  Movie Poster Coming Soon
                </p>
              </motion.div>
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

            {/* Enhanced tab content with fixed height and scrolling */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 h-[450px]">
              <AnimatePresence>
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
                    
                    {/* Enhanced circular headshots with vertical scroll */}
                    <div className="max-h-[320px] overflow-y-auto custom-scrollbar space-y-4 pr-2">
                      {cast.map((c, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all duration-300 group"
                        >
                          {/* Enhanced circular headshot with cyan ring */}
                          <div className="relative flex-shrink-0">
                            {c.headshotUrl && c.headshotUrl !== '' ? (
                              <>
                                <div className="relative w-14 h-14 rounded-full overflow-hidden border-[2px] border-[#00f0ff]/40 group-hover:border-[#00f0ff] transition-all duration-300 z-10">
                                  <Image
                                    src={c.headshotUrl}
                                    alt={c.name}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                    loading="lazy"
                                  />
                                </div>
                                {/* Enhanced cyan glow effect */}
                                <div className="absolute inset-0 rounded-full bg-[#00f0ff]/30 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {/* Additional glow ring on hover */}
                                <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/60 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                              </>
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-[2px] border-[#00f0ff]/40 flex items-center justify-center group-hover:border-[#00f0ff] transition-all duration-300">
                                <span className="text-[18px] font-black text-zinc-600">
                                  {c.name?.charAt(0) || '?'}
                                </span>
                                {/* Enhanced cyan glow effect */}
                                <div className="absolute inset-0 rounded-full bg-[#00f0ff]/30 blur-lg scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                {/* Additional glow ring on hover */}
                                <div className="absolute inset-0 rounded-full border-2 border-[#00f0ff]/60 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-black text-white mb-1 truncate">{c.name}</p>
                            <p className="text-[11px] text-[#00f0ff] font-bold uppercase tracking-widest mb-2">{c.role}</p>
                            {c.why_fit && (
                              <p className="text-[11px] text-zinc-400 italic leading-relaxed line-clamp-2">{c.why_fit}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

        {/* Navigation Buttons Section */}
        <div className="border-t border-white/[0.05] p-6 bg-black/40">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Back to Studio Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBackToStudio}
              className="group relative px-8 py-3 rounded-full text-[14px] font-black uppercase tracking-widest transition-all duration-500 overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center gap-3"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Studio</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>

            {/* Browse Gallery Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/gallery'}
              className="group relative px-8 py-3 rounded-full text-[14px] font-black uppercase tracking-widest transition-all duration-500 overflow-hidden bg-gradient-to-r from-[var(--primary)]/20 to-cyan-400/20 border border-[var(--primary)]/30 hover:border-[var(--primary)]/50 text-[var(--primary)] flex items-center gap-3"
            >
              <Database className="h-5 w-5" />
              <span>Browse Gallery</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/30 to-cyan-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom link removed */}
    </motion.div>
  );
});

FusionResultCard.displayName = 'FusionResultCard';

export default FusionResultCard;
