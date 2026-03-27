'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface AccessibilityContextType {
  reducedMotion: boolean;
  announceToScreenReader: (message: string) => void;
  setFocus: (element: HTMLElement | null) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  reducedMotion: false,
  announceToScreenReader: () => {},
  setFocus: () => {},
});

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcer, setAnnouncer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const announceToScreenReader = (message: string) => {
    if (announcer) {
      announcer.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (announcer) announcer.textContent = '';
      }, 1000);
    }
  };

  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
      // Announce focus change for screen readers
      announceToScreenReader(`Focused on ${element.tagName.toLowerCase()}`);
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      reducedMotion,
      announceToScreenReader,
      setFocus,
    }}>
      {children}
      {/* Screen reader announcer */}
      <div
        ref={setAnnouncer}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />
    </AccessibilityContext.Provider>
  );
}
