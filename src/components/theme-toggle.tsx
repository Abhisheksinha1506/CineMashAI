'use client';

import { useTheme } from '@/components/theme-provider-custom';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAccessibility } from '@/components/accessibility-provider';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { announceToScreenReader } = useAccessibility();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    announceToScreenReader(`Switched to ${newTheme} mode`);
  };

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-full bg-white/[0.06] border border-white/[0.08]" aria-hidden="true" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleThemeToggle}
      className="relative h-9 w-9 rounded-full glassmorphism border border-white/[0.08] hover:border-[var(--primary)]/30 flex items-center justify-center text-zinc-400 hover:text-[var(--primary)] transition-all group focus-ring"
      aria-label={`Toggle dark/light mode. Currently in ${isDark ? 'dark' : 'light'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDark}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark 
            ? 'radial-gradient(circle, rgba(0,240,255,0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)',
        }}
      />
      
      {/* Icon transition */}
      <motion.div
        key={resolvedTheme}
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 180, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative"
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </motion.div>

      {/* Subtle ring animation */}
      <motion.div
        className="absolute inset-0 rounded-full border border-transparent"
        animate={{
          borderColor: isDark 
            ? ['rgba(0,240,255,0)', 'rgba(0,240,255,0.3)', 'rgba(0,240,255,0)']
            : ['rgba(255,215,0,0)', 'rgba(255,215,0,0.3)', 'rgba(255,215,0,0)'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
}
