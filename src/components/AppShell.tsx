'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthRoute =
    pathname === '/welcome' ||
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname?.startsWith('/recuperar-senha') ||
    pathname?.startsWith('/esqueci-senha') ||
    pathname?.startsWith('/redefinir-senha');

  return (
    <div
      className={
        isAuthRoute
          ? 'min-h-dvh w-full flex flex-col relative bg-dark-950 text-white selection:bg-brand selection:text-dark-950 overflow-x-hidden'
          : 'mx-auto min-h-dvh max-w-md w-full flex flex-col relative bg-[color:var(--surface)] dark:bg-dark-900 shadow-2xl overflow-x-hidden pb-16'
      }
    >
      {children}
      {!isAuthRoute && <BottomNav />}
    </div>
  );
}
