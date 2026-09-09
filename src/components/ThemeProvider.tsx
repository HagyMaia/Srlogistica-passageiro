'use client';

import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('dark');

  const applyTheme = React.useCallback((t: Theme) => {
    const root = document.documentElement;
    let actualTheme: 'light' | 'dark' = 'dark';

    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = prefersDark ? 'dark' : 'light';
    } else {
      actualTheme = t;
    }

    if (actualTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    setResolvedTheme(actualTheme);
  }, []);

  React.useEffect(() => {
    const saved = (localStorage.getItem('sr-passenger-theme') as Theme) || 'dark';
    setThemeState(saved);
    applyTheme(saved);
  }, [applyTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('sr-passenger-theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
