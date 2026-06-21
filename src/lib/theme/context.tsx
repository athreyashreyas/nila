'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

function applyDataTheme(t: ThemeMode) {
  const html = document.documentElement;
  if (t === 'dark') html.setAttribute('data-theme', 'dark');
  else if (t === 'light') html.setAttribute('data-theme', 'light');
  else html.removeAttribute('data-theme');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  // On mount: re-apply data-theme from localStorage.
  // Critical: Next.js hydration may clear the attribute added by the inline anti-FOUC script.
  useEffect(() => {
    try {
      const stored = (localStorage.getItem('nila-theme') ?? 'system') as ThemeMode;
      const valid: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
      setThemeState(valid);
      applyDataTheme(valid);
    } catch {}
  }, []);

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    try { localStorage.setItem('nila-theme', t); } catch {}
    applyDataTheme(t);
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
