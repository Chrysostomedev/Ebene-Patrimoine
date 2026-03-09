'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Theme, ThemeColor, ThemeMode } from '../lib/theme-config';

interface ThemeContextType {
  theme: Theme;
  setThemeColor: (color: ThemeColor) => void;
  setThemeMode: (mode: ThemeMode) => void;
  applyTheme: (color: ThemeColor, mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── standalone helper (pas de closure sur state) ────────────────────────────
function applyThemeToDom(color: ThemeColor, mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  root.setAttribute('data-theme-color', color);

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme-mode', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme-mode', mode);
  }

  localStorage.setItem('theme-color', color);
  localStorage.setItem('theme-mode', mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>({ color: 'slate', mode: 'light' });
  const [mounted, setMounted] = useState(false);

  // Charger le thème sauvegardé au mount
  useEffect(() => {
    const savedColor = (localStorage.getItem('theme-color') as ThemeColor) || 'slate';
    const savedMode  = (localStorage.getItem('theme-mode')  as ThemeMode)  || 'light';
    setTheme({ color: savedColor, mode: savedMode });
    applyThemeToDom(savedColor, savedMode);
    setMounted(true);
  }, []);

  const applyTheme = useCallback((color: ThemeColor, mode: ThemeMode) => {
    applyThemeToDom(color, mode);
  }, []);

  const setThemeColor = useCallback((color: ThemeColor) => {
    setTheme(prev => {
      applyThemeToDom(color, prev.mode);
      return { ...prev, color };
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setTheme(prev => {
      applyThemeToDom(prev.color, mode);
      return { ...prev, mode };
    });
  }, []);

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, setThemeColor, setThemeMode, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};