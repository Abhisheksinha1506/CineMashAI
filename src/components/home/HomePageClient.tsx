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

  return (
    <div className="relative flex-1 flex flex-col justify-center">
      <Navbar />
      
      <section className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 min-h-[80vh]">
        
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
            className="mb-6"
          >
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-[-0.05em] uppercase mb-4">
              CineMash AI
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed">
              Fuse cinematic universes with AI-powered creativity. Mix heroes, villains, and worlds to create blockbuster mashups that defy imagination.
            </p>
          </motion.div>
 
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/studio">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full font-bold text-white shadow-lg hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all duration-300 flex items-center gap-2 group"
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
                className="px-8 py-3.5 bg-white/5 backdrop-blur-sm rounded-full font-bold text-white border border-white/10 hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
              >
                <Database className="h-5 w-5" />
                Browse Gallery
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </section>


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
