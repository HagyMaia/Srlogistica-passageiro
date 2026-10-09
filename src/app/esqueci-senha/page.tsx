'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EsqueciSenhaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/recuperar-senha');
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-[#070D18] text-white">
      <div className="h-10 w-10 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-3" />
      <p className="text-xs font-bold text-slate-400">Redirecionando para recuperação de senha...</p>
    </div>
  );
}
