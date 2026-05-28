'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'system', setTheme: () => {} });

function applyIcons(resolved: 'light' | 'dark') {
  document.querySelectorAll<HTMLLinkElement>('link[data-theme-icon="svg"]').forEach(el => {
    el.href = resolved === 'dark' ? '/icons/icon-dark.svg' : '/icons/icon-light.svg';
  });
  document.querySelectorAll<HTMLLinkElement>('link[data-theme-icon="png"]').forEach(el => {
    el.href = resolved === 'dark' ? '/icons/apple-touch-icon-dark.png' : '/icons/apple-touch-icon-light.png';
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  useEffect(() => {
    try {
      const stored = (localStorage.getItem('nila-theme') ?? 'system') as ThemeMode;
      const valid = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
      setThemeState(valid);
      // Sync icons to stored preference on first load
      const resolved = valid === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : valid;
      applyIcons(resolved);
    } catch {}
  }, []);

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    try { localStorage.setItem('nila-theme', t); } catch {}

    const html = document.documentElement;
    if (t === 'dark')       html.setAttribute('data-theme', 'dark');
    else if (t === 'light') html.setAttribute('data-theme', 'light');
    else                    html.removeAttribute('data-theme');

    // Update icons so correct version is cached if user adds to home screen after changing theme
    const resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    applyIcons(resolved);
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
