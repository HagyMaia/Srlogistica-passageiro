import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SR Logística - App do Passageiro',
    short_name: 'SR Passageiro',
    description: 'Aplicativo de transporte e rotas corporativas da SR Logística & Transporte.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1220',
    theme_color: '#FFC800',
    orientation: 'portrait',
    icons: [
      {
        src: '/images/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/images/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    categories: ['transportation', 'business', 'productivity'],
    lang: 'pt-BR'
  };
}
