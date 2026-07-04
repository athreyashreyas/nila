'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isThemeId, type ThemeId } from './themes';

// Kept for callers that still import ThemeMode; it is now the full theme id.
export type ThemeMode = ThemeId;

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

function applyDataTheme(t: ThemeId) {
  const html = document.documentElement;
  if (t === 'system') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', t);
  // Keep the browser UI chrome (iOS status bar tint) in step with the palette by
  // reading the resolved --background off the root once the class is applied.
  requestAnimationFrame(() => {
    try {
      const bg = getComputedStyle(html).getPropertyValue('--background').trim();
      if (bg) {
        let meta = document.querySelector('meta[name="theme-color"]:not([media])');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', bg);
      }
    } catch {}
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('system');

  // On mount: re-apply data-theme from localStorage. Next's hydration can clear
  // the attribute set by the inline anti-FOUC script, so we restore it here.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nila-theme');
      const valid: ThemeId = isThemeId(stored) ? stored : 'system';
      setThemeState(valid);
      applyDataTheme(valid);
    } catch {}
  }, []);

  function setTheme(t: ThemeId) {
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
