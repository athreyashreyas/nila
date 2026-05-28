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
      const stored = (localStorage.getItem('nila-theme') ?? 'system') as ThemeMode;
      const valid = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
      setThemeState(valid);
      // Sync favicon to stored preference on first load
      const resolved = valid === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : valid;
      const iconHref = resolved === 'dark' ? '/icons/icon-dark.svg' : '/icons/icon-light.svg';
      document.querySelectorAll<HTMLLinkElement>('link[data-theme-icon]').forEach(el => {
        el.href = iconHref;
      });
    } catch {}
  }, []);

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    try { localStorage.setItem('nila-theme', t); } catch {}

    const html = document.documentElement;
    if (t === 'dark')       html.setAttribute('data-theme', 'dark');
    else if (t === 'light') html.setAttribute('data-theme', 'light');
    else                    html.removeAttribute('data-theme');

    // Update favicon + apple-touch-icon so the correct icon is cached
    // if the user adds to home screen after changing theme
    const resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t;
    const iconHref = resolved === 'dark' ? '/icons/icon-dark.svg' : '/icons/icon-light.svg';
    document.querySelectorAll<HTMLLinkElement>('link[data-theme-icon]').forEach(el => {
      el.href = iconHref;
    });
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
