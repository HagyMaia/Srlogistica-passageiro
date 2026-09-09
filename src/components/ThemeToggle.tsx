'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/90 dark:border-dark-700/80 bg-white/95 dark:bg-dark-800/95 text-slate-700 dark:text-brand shadow-lg backdrop-blur-md transition hover:scale-105 active:scale-95 ${className}`}
      aria-label="Alternar Tema Claro/Escuro"
      title={resolvedTheme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={19} className="text-amber-400" />
      ) : (
        <Moon size={19} className="text-slate-800" />
      )}
    </button>
  );
}
