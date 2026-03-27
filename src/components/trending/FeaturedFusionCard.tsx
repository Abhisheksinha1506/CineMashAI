import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Sparkles, Calendar } from 'lucide-react';
import Image from 'next/image';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';

interface FeaturedFusionCardProps {
  fusion: any;
  rank: number;
  onRemix?: (id: string) => void;
}

export function FeaturedFusionCard({ fusion, rank, onRemix }: FeaturedFusionCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.2, duration: 0.4, ease: 'easeOut' }}
      className="relative group"
    >
      {/* Rank Badge */}
      <div className="absolute -top-4 -left-4 z-30 w-12 h-12 rounded-full flex items-center justify-center font-black text-[13px] border-2 border-[#050505] shadow-lg"
        style={{
          background: rank === 1
            ? 'linear-gradient(135deg, #f5c842, #e6a800)'
            : 'linear-gradient(135deg, #94a3b8, #64748b)',
          color: '#000',
          boxShadow: rank === 1 ? '0 0 20px rgba(245,200,66,0.5)' : '0 0 16px rgba(148,163,184,0.3)'
        }}
      >
        #{rank}
      </div>

      {/* Main Card */}
      <div className="glassmorphism dark:glassmorphism light:bg-[var(--card)] light:shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-white/[0.1] dark:border-white/[0.1] light:border-[var(--border)] rounded-3xl overflow-hidden hover:border-[var(--primary)]/30 transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        {/* Poster Section */}
        <div className="relative h-80 overflow-hidden">
          {/* Collage Background */}
          <div className="absolute inset-0">
            {fusion.sourceMovies?.slice(0, 3).map((movie: any, idx: number) => (
              <div
                key={movie.id}
                className="absolute inset-0"
                style={{
                  transform: `translate(${idx * 20}%, ${idx * 15}%) scale(${1.2 - idx * 0.1})`,
                  opacity: 0.6 - idx * 0.2,
                  filter: `blur(${idx * 1}px)`
                }}
              >
                <Image
                  src={getMoviePosterUrl(movie.poster_path, 'w500')}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                  placeholder="blur"
                />
              </div>
            ))}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Main Poster */}
          <div className="absolute inset-0 flex items-center justify-center">
            {fusion.posterUrl ? (
              <Image
                src={fusion.posterUrl}
                alt={fusion.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
                placeholder="blur"
                style={{ objectFit: 'contain', maxHeight: '90%', maxWidth: '90%' }}
              />
            ) : (
              <div className="w-48 h-72 bg-gradient-to-br from-[#00f0ff]/20 to-[#ff00aa]/20 rounded-2xl" />
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Title and Tagline */}
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
              {fusion.title}
            </h3>
            <p className="text-[13px] text-zinc-400 italic leading-relaxed">
              {fusion.tagline}
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#ff00aa]" />
                <span className="text-[12px] font-bold text-white">{fusion.upvotes || 0}</span>
              </div>
            </div>
            
            {fusion.created_at && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(fusion.created_at)}</span>
              </div>
            )}
          </div>

          {/* Remix Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRemix?.(fusion.id)}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#00f0ff]/10 to-[#00f0ff]/5 border border-[#00f0ff]/30 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-widest text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-all focus-ring"
          >
            <Sparkles className="h-4 w-4" />
            Remix This Fusion
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
