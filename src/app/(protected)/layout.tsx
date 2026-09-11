'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, loginAsGuest } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Inicia sessão de passageiro rápida para garantir navegação instantânea em todas as abas
      loginAsGuest();
    }
  }, [user, loading, loginAsGuest]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-slate-50 dark:bg-dark-950">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
