'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/welcome');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-slate-50 dark:bg-dark-950">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Carregando perfil...</p>
      </div>
    );
  }

  return <>{children}</>;
}
