import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import BottomNav from '@/components/BottomNav';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'SR Logística - App do Passageiro',
  description: 'Aplicativo de transporte e rotas corporativas da SR Logística & Transporte.',
  applicationName: 'SR Passageiro',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof document !== 'undefined' && document.cookie) {
                    var totalCookieLen = document.cookie.length;
                    if (totalCookieLen > 3000) {
                      var cookies = document.cookie.split(';');
                      for (var i = 0; i < cookies.length; i++) {
                        var c = cookies[i].trim();
                        var eq = c.indexOf('=');
                        var name = eq > -1 ? c.substring(0, eq) : c;
                        var val = eq > -1 ? c.substring(eq + 1) : '';
                        if (name.indexOf('sb-') === 0 && (name.indexOf('.1') > -1 || name.indexOf('.2') > -1 || name.indexOf('.3') > -1 || val.length > 2000)) {
                          document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                          document.cookie = name + '=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                        }
                      }
                    }
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body className="font-sans antialiased bg-[color:var(--bg)] dark:bg-dark-950 transition-colors min-h-dvh select-none text-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <AuthProvider>
            <PWARegister />
            <div className="mx-auto min-h-dvh max-w-md w-full flex flex-col relative bg-[color:var(--surface)] dark:bg-dark-900 shadow-2xl overflow-x-hidden pb-16">
              {children}
              <BottomNav />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
