'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    // Get stored theme or default
    const storedTheme = localStorage.getItem('cinemash-theme') as Theme;
    const initialTheme = storedTheme || defaultTheme;
    setTheme(initialTheme);
  }, [defaultTheme]);

  // Update resolved theme when theme changes
  useEffect(() => {
    if (!mounted) return;

    let resolved: 'dark' | 'light';
    
    if (theme === 'system' && enableSystem) {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = theme as 'dark' | 'light';
    }
    
    setResolvedTheme(resolved);
    
    // Apply theme to DOM
    const root = document.documentElement;
    
    if (attribute === 'class') {
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    } else {
      root.setAttribute(attribute, resolved);
    }

    // Disable transitions temporarily if requested
    if (disableTransitionOnChange) {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Force reflow
      window.getComputedStyle(document.body);
      
      // Remove style after reflow
      setTimeout(() => {
        document.head.removeChild(style);
      }, 1);
    }
  }, [theme, mounted, enableSystem, attribute, disableTransitionOnChange]);

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || !mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const newResolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        
        const root = document.documentElement;
        if (attribute === 'class') {
          root.classList.remove('light', 'dark');
          root.classList.add(newResolved);
        } else {
          root.setAttribute(attribute, newResolved);
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, enableSystem, mounted, attribute]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('cinemash-theme', newTheme);
  };

  const value: ThemeContextType = {
    theme,
    setTheme: handleSetTheme,
    resolvedTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
}
