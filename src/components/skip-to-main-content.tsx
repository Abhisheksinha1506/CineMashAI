'use client';

import { useEffect, useState } from 'react';

export function SkipToMainContent() {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !isFocused) {
        setIsFocused(true);
      }
    };

    const handleMouseDown = () => {
      setIsFocused(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isFocused]);

  const handleSkip = () => {
    const main = document.querySelector('main');
    if (main) {
      main.focus();
      main.scrollIntoView({ behavior: 'smooth' });
    }
    setIsFocused(false);
  };

  return (
    <button
      onClick={handleSkip}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={`
        fixed top-0 left-0 z-[9999] p-4 bg-[var(--primary)] text-[var(--background)] 
        font-black text-sm uppercase tracking-wider rounded-br-lg
        transform -translate-y-full focus:translate-y-0
        transition-transform duration-200 focus-ring
        ${isFocused ? 'translate-y-0' : ''}
      `}
      aria-label="Skip to main content"
    >
      Skip to main content
    </button>
  );
}
