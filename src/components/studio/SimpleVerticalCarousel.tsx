'use client';

import { Movie } from '@/types';
import { getMoviePosterUrl } from '@/lib/api/tmdb-client';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SimpleVerticalCarouselProps {
  movies: Movie[];
  selectedMovies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  className?: string;
  direction?: 'up' | 'down';
  showTwoColumns?: boolean;
}

export function SimpleVerticalCarousel({ 
  movies, 
  selectedMovies, 
  onMovieSelect, 
  className = '',
  direction = 'up',
  showTwoColumns = true
}: SimpleVerticalCarouselProps) {
  // Use unique IDs for duplicated elements to avoid key collisions
  const renderMovies = (isDuplicate = false) => (
    movies.map((movie, idx) => (
      <div key={`${movie.id}-${isDuplicate ? 'duplicate' : 'original'}`} className="scroll-item">
        <Image
          src={getMoviePosterUrl(movie.poster_path, 'w342')}
          alt={movie.title}
          width={240}
          height={160}
          className={cn(
            "movie-poster",
            selectedMovies.some((m) => m.id === movie.id) ? "selected" : "",
            isDuplicate && "duplicate-item"
          )}
          onClick={() => !isDuplicate && onMovieSelect(movie)}
          unoptimized
        />
      </div>
    ))
  );

  return (
    <div className={cn("carousel-root", className)}>
      <div className="carousel-grid">
        {/* First/Only Column */}
        <div className={cn("column", direction === 'up' ? "up" : "down")}>
          <div className="scroll-wrapper">
            {renderMovies(false)}
            {renderMovies(true)}
          </div>
        </div>

        {/* Optional Second Column */}
        {showTwoColumns && (
          <div className={cn("column", direction === 'up' ? "down" : "up")}>
            <div className="scroll-wrapper">
              {renderMovies(false)}
              {renderMovies(true)}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .carousel-root {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .carousel-grid {
          display: flex;
          gap: 12px;
          width: 100%;
          justify-content: center;
        }

        .column {
          --column-height: 400px;
          --image-height: 150px;
          --row-gap: 12px;
          
          flex: 1;
          min-width: 140px;
          max-width: 220px;
          height: var(--column-height);
          overflow: hidden;
          position: relative;
          -webkit-mask-image: linear-gradient(
            to bottom, 
            transparent 0%, 
            black 10%, 
            black 90%, 
            transparent 100%
          );
          mask-image: linear-gradient(
            to bottom, 
            transparent 0%, 
            black 10%, 
            black 90%, 
            transparent 100%
          );
        }

        .scroll-wrapper {
          display: flex;
          flex-direction: column;
        }

        .up .scroll-wrapper {
          animation: scrollUp 20s linear infinite;
        }

        .down .scroll-wrapper {
          animation: scrollDown 20s linear infinite;
        }

        .scroll-item {
          width: 100%;
          padding: 0 4px;
        }

        .movie-poster {
          width: 100%;
          height: var(--image-height);
          margin-bottom: var(--row-gap);
          object-fit: cover;
          cursor: pointer;
          border-radius: 12px;
          border: 2px solid transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .movie-poster:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .movie-poster.selected {
          border-color: #00f0ff;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.4);
        }

        .duplicate-item {
          opacity: 0.8;
        }

        @keyframes scrollUp {
          from { transform: translateY(0); }
          to { transform: translateY(calc(-50%)); }
        }

        @keyframes scrollDown {
          from { transform: translateY(calc(-50%)); }
          to { transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .column {
            --column-height: 380px;
            --image-height: 140px;
          }
        }
      `}</style>
    </div>
  );
}
