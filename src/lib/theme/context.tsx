'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nila-theme') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      }
    } catch {}
  }, []);

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    try { localStorage.setItem('nila-theme', t); } catch {}
    const html = document.documentElement;
    if (t === 'dark')  html.setAttribute('data-theme', 'dark');
    else if (t === 'light') html.setAttribute('data-theme', 'light');
    else html.removeAttribute('data-theme');
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
