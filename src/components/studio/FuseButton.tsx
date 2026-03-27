'use client';

import { Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FuseButtonProps {
  selectedCount: number;
  isGenerating: boolean;
  onFuse: () => void;
}

export function FuseButton({ selectedCount, isGenerating, onFuse }: FuseButtonProps) {
  const canFuse = selectedCount >= 2 && selectedCount <= 4 && !isGenerating;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-2">
      {/* The Big Button */}
      <div className="relative flex-shrink-0">
        {/* Outer pulse ring (only when enabled) */}
        {canFuse && (
          <>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[#00f0ff]/20"
            />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[#00f0ff]/15"
            />
          </>
        )}

        <motion.button
          onClick={canFuse ? onFuse : undefined}
          whileHover={canFuse ? { scale: 1.06 } : undefined}
          whileTap={canFuse ? { scale: 0.97 } : undefined}
          disabled={!canFuse}
          className={cn(
            'relative flex flex-col items-center gap-2 rounded-full border-2 transition-all duration-500 overflow-hidden',
            'w-20 h-20',
            canFuse
              ? 'border-[#00f0ff] bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.35),inset_0_0_20px_rgba(0,240,255,0.05)]'
              : isGenerating
              ? 'border-[#00f0ff]/40 bg-[#00f0ff]/5 text-[#00f0ff]/50'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
          )}
        >
          {/* Inner glow fill */}
          {canFuse && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#00f0ff]/10 to-transparent" />
          )}

          <div className="relative flex flex-col items-center gap-1">
            {isGenerating ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-[8px] font-black uppercase tracking-widest">Fusing</span>
              </>
            ) : (
              <>
                <Zap className={cn('h-6 w-6', canFuse && 'animate-spark')} />
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {canFuse ? 'Fuse' : 'Fuse'}
                </span>
              </>
            )}
          </div>
        </motion.button>
      </div>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCount}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-center space-y-1"
        >
          {isGenerating ? (
            <div className="space-y-2">
              {/* Film strip loader */}
              <div className="flex items-center gap-1 justify-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 2.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                    className="w-1 h-4 rounded-full bg-[#00f0ff]"
                  />
                ))}
              </div>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-tight">
                Directing<br />your fusion
              </p>
            </div>
          ) : (
            <>
              {/* Progress dots */}
              <div className="flex items-center gap-1 justify-center">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-all duration-300',
                      i < selectedCount
                        ? 'bg-[#00f0ff] shadow-[0_0_6px_rgba(0,240,255,0.6)]'
                        : 'bg-zinc-800'
                    )}
                  />
                ))}
              </div>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest leading-tight">
                {selectedCount < 2 ? `Need ${2 - selectedCount} more` : 'Ready!'}
              </p>
              <p className="text-[8px] text-zinc-700 font-medium">
                {selectedCount}/4 selected
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Vertical "NOW" label */}
      <div className="flex-1 flex items-end justify-center pb-4">
        <p
          className="text-[9px] font-black tracking-[0.4em] uppercase opacity-20"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Now
        </p>
      </div>
    </div>
  );
}
