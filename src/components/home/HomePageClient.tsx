'use client';

import { motion } from 'framer-motion';
import { Zap, ArrowRight, Database } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { useEffect, useState } from 'react';

interface HomePageClientProps {
  popularMovies: any[];
  trendingFusions: any[];
}

export default function HomePageClient({ popularMovies, trendingFusions }: HomePageClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate positions for animated background elements
  const [backgroundElements, setBackgroundElements] = useState<{id: number, top: number, left: number}[]>([]);

  useEffect(() => {
    setMounted(true);
    // Only generate on client to avoid hydration mismatch
    setBackgroundElements([...Array(6)].map((_, i) => ({
      id: i,
      top: (i * 16.67) % 100,
      left: (i * 23.45) % 100,
    })));
  }, []);

  return (
    <div className="min-h-screen bg-background text-white relative overflow-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-[-0.05em] uppercase mb-6">
              CineMash AI
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Fuse cinematic universes with AI-powered creativity. Mix heroes, villains, and worlds to create blockbuster mashups that defy imagination.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/studio">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
              >
                <Zap className="h-5 w-5 group-hover:animate-pulse" />
                Create Fusion
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            
            <Link href="/gallery">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-full font-bold text-white border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
              >
                <Database className="h-5 w-5" />
                Browse Gallery
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Animated Background Elements - Only rendered on client */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {mounted && backgroundElements.map((element) => (
            <motion.div
              key={element.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.3, 0], scale: [0, 1, 0] }}
              transition={{
                duration: 4,
                delay: element.id * 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"
              style={{
                top: `${element.top}%`,
                left: `${element.left}%`,
              }}
            />
          ))}
        </div>
      </section>

      {/* Popular Movies Preview */}
      {popularMovies.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-[-0.03em] uppercase mb-4">
              Popular Movies
            </h2>
            <p className="text-gray-400 text-lg">
              Start with these blockbusters to create your cinematic mashup
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8"
          >
            {popularMovies.slice(0, 12).map((movie: any, index: number) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group cursor-pointer"
                onClick={() => window.location.href = `/studio?movie=${movie.id}`}
              >
                <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    style={{ filter: 'blur(2px) brightness(0.8)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-bold line-clamp-2">{movie.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Link href="/studio">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Explore All Movies →
              </motion.button>
            </Link>
          </motion.div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            © 2026 CineMash AI. Powered by artificial intelligence, fueled by creativity.
          </p>
        </div>
      </footer>
    </div>
  );
}
