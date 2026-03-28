'use client';

import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';

interface FloatingFuseButtonProps {
  selectedCount: number;
  isGenerating: boolean;
  isRemixMode?: boolean;
  onFuse: () => void;
}

export function FloatingFuseButton({ selectedCount, isGenerating, isRemixMode = false, onFuse }: FloatingFuseButtonProps) {
  const canFuse = selectedCount >= 2 && selectedCount <= 4 && !isGenerating;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50">
      <motion.button
        onClick={canFuse ? onFuse : undefined}
        whileHover={canFuse ? { scale: 1.05 } : undefined}
        whileTap={canFuse ? { scale: 0.95 } : undefined}
        disabled={!canFuse}
        className={`relative px-6 py-3 rounded-full text-[14px] font-black uppercase tracking-widest transition-all duration-500 overflow-hidden focus-ring ${
          canFuse
            ? 'floating-fuse-button'
            : 'floating-fuse-button disabled'
        }`}
        title={!canFuse ? selectedCount < 2 ? 'Select at least 2 movies' : 'Maximum 4 movies allowed' : undefined}
      >
        {/* Progress ring when loading */}
        {isGenerating && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/30"
            style={{
              borderTopColor: 'var(--primary)',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Pulse rings when enabled */}
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

        {/* Button Content */}
        <div className="relative flex items-center gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>FUSING...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>{isRemixMode ? 'CREATE REMIX' : 'FUSE NOW'}</span>
            </>
          )}
        </div>
      </motion.button>
    </div>
  );
}
