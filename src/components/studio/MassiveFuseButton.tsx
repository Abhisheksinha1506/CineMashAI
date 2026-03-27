'use client';

import { Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MassiveFuseButtonProps {
  selectedCount: number;
  isGenerating: boolean;
  onFuse: () => void;
}

export function MassiveFuseButton({ selectedCount, isGenerating, onFuse }: MassiveFuseButtonProps) {
  const canFuse = selectedCount >= 2 && selectedCount <= 4 && !isGenerating;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* The Massive Button */}
      <div className="relative">
        {/* Outer pulse ring (only when enabled) */}
        {canFuse && (
          <>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[var(--primary)]/20"
            />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[var(--primary)]/15"
            />
          </>
        )}

        <motion.button
          onClick={canFuse ? onFuse : undefined}
          whileHover={canFuse ? { scale: 1.05 } : undefined}
          whileTap={canFuse ? { scale: 0.95 } : undefined}
          disabled={!canFuse}
          className={`relative px-8 py-4 rounded-full text-[14px] font-black uppercase tracking-widest transition-all duration-500 overflow-hidden focus-ring ${
            canFuse
              ? 'massive-fuse-button'
              : 'massive-fuse-button disabled'
          }`}
        >
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
                className="flex items-center gap-3"
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>FUSING...</span>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <Zap className="h-5 w-5" />
                <span>FUSE NOW</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Hint Text */}
      {!canFuse && !isGenerating && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-zinc-600 font-medium text-center max-w-xs"
        >
          {selectedCount === 0 
            ? 'Select 2–4 movies to begin'
            : selectedCount === 1
            ? 'Select 1–3 more movies'
            : 'Maximum 4 movies allowed'
          }
        </motion.p>
      )}

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i < selectedCount
                ? 'w-4 bg-[#00f0ff] shadow-[0_0_6px_rgba(0,240,255,0.6)]'
                : 'w-2 bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
