'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Film, GalleryHorizontal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Home', href: '/', icon: Film },
  { name: 'Studio', href: '/studio', icon: Zap },
  { name: 'Gallery', href: '/gallery', icon: GalleryHorizontal },
];

export function Navbar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-[100] w-full"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Glass background strip */}
      <div className="absolute inset-0 glass-strong dark:glass-strong border-b border-white/[0.06] transition-colors duration-300" />

      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex h-[64px] items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0" aria-label="CineMash AI - Home">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 border border-[var(--primary)]/20 flex items-center justify-center group-hover:border-[var(--primary)]/40 transition-all">
              <Film className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <span className="hidden sm:block text-[18px] font-black tracking-[-0.05em] text-[var(--text)] uppercase transition-colors duration-300">
              CINE<span className="text-[var(--primary)]" style={{ textShadow: '0 0 12px rgba(0,240,255,0.4)' }}>MASH</span>
            </span>
          </Link>

          {/* Children Slot (e.g. Studio Search) */}
          {children && (
            <div className="flex-1 max-w-2xl px-2">
              {children}
            </div>
          )}

          {/* Nav Links - Hidden if children (search) is present on mobile */}
          <div className={cn("hidden md:flex items-center gap-1", children && "lg:flex")} role="menubar">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold transition-all rounded-full tracking-wide transition-colors duration-300 focus-ring',
                    active
                      ? 'text-[var(--text)]'
                      : 'text-zinc-400 dark:text-zinc-400 light:text-zinc-500 hover:text-[var(--text)] hover:bg-white/[0.04] dark:hover:bg-white/[0.04] light:hover:bg-[var(--border)]/20'
                  )}
                >
                  <item.icon
                    className={cn('h-3.5 w-3.5 transition-colors', active && 'text-[var(--primary)]')}
                    aria-hidden="true"
                  />
                  {item.name}

                  {/* Active underline glow */}
                  {active && (
                    <>
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute -bottom-1 left-1/2 right-1/2 h-[2px] rounded-full bg-[var(--primary)]"
                        style={{ boxShadow: '0 0 12px rgba(0,240,255,0.8)' }}
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                      />
                    </>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Fuse Now Pill */}
            <Link href="/studio">
              <Button
                variant="outline"
                size="sm"
                className="bg-[var(--primary)] text-black dark:text-black light:text-[var(--background)] border-[var(--primary)] hover:bg-[var(--primary)]/90 hover:border-[var(--primary)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300 font-black text-[12px] uppercase tracking-wider focus-ring"
                onClick={() => (window.location.href = '/studio')}
                aria-label="Go to Studio to start fusing movies"
              >
                <Zap className="h-3.5 w-3.5 fill-current animate-spark" aria-hidden="true" />
                Fuse Now
              </Button>
            </Link>

          </div>
        </div>
      </div>
    </motion.nav>
  );
}
