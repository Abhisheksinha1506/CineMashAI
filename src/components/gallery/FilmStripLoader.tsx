'use client';

import { motion } from 'framer-motion';

export function FilmStripLoader() {
  return (
    <div className="flex justify-center py-8">
      <div className="relative">
        {/* Film Strip Container */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="relative"
            >
              {/* Film Frame */}
              <div className="w-8 h-12 bg-gradient-to-b from-zinc-800 to-zinc-900 dark:from-zinc-800 dark:to-zinc-900 light:from-[var(--border)] light:to-[var(--card)] rounded-sm border border-zinc-700 dark:border-zinc-700 light:border-[var(--border)]/50 relative overflow-hidden">
                {/* Film Holes */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black dark:bg-black light:bg-[var(--background)] rounded-full" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black dark:bg-black light:bg-[var(--background)] rounded-full" />
                
                {/* Inner Frame Content */}
                <div className="absolute inset-x-1 inset-y-2 bg-gradient-to-b from-[var(--primary)]/10 to-[var(--secondary)]/10 rounded-sm">
                  <motion.div
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-full h-full rounded-sm"
                  />
                </div>
              </div>

              {/* Sprocket Holes */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-3 bg-zinc-900 dark:bg-zinc-900 light:bg-[var(--card)] rounded-sm" />
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-3 bg-zinc-900 dark:bg-zinc-900 light:bg-[var(--card)] rounded-sm" />
            </motion.div>
          ))}
        </div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 dark:text-zinc-600 light:text-zinc-500 font-medium uppercase tracking-widest"
        >
          Loading more fusions...
        </motion.div>
      </div>
    </div>
  );
}
