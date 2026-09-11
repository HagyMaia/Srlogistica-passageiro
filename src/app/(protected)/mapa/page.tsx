'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MapaPageRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams ? searchParams.toString() : '';
    router.replace(query ? `/?${query}` : '/');
  }, [router, searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 dark:bg-dark-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Carregando tela principal...
        </span>
      </div>
    </div>
  );
}
