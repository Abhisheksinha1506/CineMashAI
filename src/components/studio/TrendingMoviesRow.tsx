'use client';

import { Movie } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface TrendingMoviesRowProps {
  trendingMovies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  selectedMovies: Movie[];
}

export function TrendingMoviesRow({ trendingMovies, onMovieSelect, selectedMovies }: TrendingMoviesRowProps) {
  const isSelected = (movie: Movie) => selectedMovies.some((m) => m.id === movie.id);

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-[12px] font-black uppercase tracking-widest text-[#00f0ff]">Trending Now</h3>

      {/* Trending Movies Grid */}
      <div className="grid grid-cols-5 gap-3">
        {trendingMovies.slice(0, 5).map((movie, idx) => (
          <motion.button
            key={movie.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => !isSelected(movie) && onMovieSelect(movie)}
            disabled={isSelected(movie)}
            className={`trending-poster relative focus-ring ${
              isSelected(movie) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            aria-label={`Select ${movie.title}`}
          >
            <Image
              src={getMoviePosterUrl(movie.poster_path, 'w342')}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 20vw, 150px"
              unoptimized
              priority={idx < 3}
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A"
              placeholder="blur"
            />
            
            {/* Title Overlay */}
            <div className="trending-poster-overlay">
              <div className="text-left">
                <p className="text-white text-[10px] font-black uppercase tracking-wide leading-tight line-clamp-2">
                  {movie.title}
                </p>
                <p className="text-zinc-400 text-[8px] mt-1">
                  {movie.release_date?.split('-')[0]}
                </p>
              </div>
            </div>

            {/* Selected Indicator */}
            {isSelected(movie) && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-[#00f0ff] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
