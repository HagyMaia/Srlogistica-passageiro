import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'MobiPro 360 - App do Passageiro',
  description: 'Aplicativo do passageiro da SR Logística / MobiPro 360.',
  applicationName: 'SR Passageiro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SR Passageiro'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B1220'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="font-sans antialiased bg-[color:var(--bg)] dark:bg-dark-950 transition-colors min-h-dvh select-none text-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <AuthProvider>
            <div className="mx-auto min-h-dvh max-w-md w-full flex flex-col relative bg-[color:var(--surface)] dark:bg-dark-900 shadow-2xl overflow-x-hidden pb-16">
              {children}
              <BottomNav />
            </div>
            <div className="fixed right-4 bottom-20 z-[1110]">
              <ThemeToggle />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
