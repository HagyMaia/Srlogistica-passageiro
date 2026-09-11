import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SR Logística - App do Passageiro',
    short_name: 'SR Passageiro',
    description: 'Aplicativo oficial de transporte corporativo e mobilidade urbana da SR Logística & Transporte em Manaus.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#0B1220',
    theme_color: '#0B1220',
    orientation: 'portrait',
    lang: 'pt-BR',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    screenshots: [
      {
        src: '/screenshots/screen-mobile-1.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Tela Inicial de Solicitação SR Logística'
      },
      {
        src: '/screenshots/screen-mobile-2.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Acompanhamento de Corrida em Tempo Real'
      },
      {
        src: '/screenshots/screen-desktop-1.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Painel do Passageiro SR Logística'
      }
    ],
    shortcuts: [
      {
        name: 'Solicitar Viagem',
        short_name: 'Solicitar',
        description: 'Chamar um motorista SR Logística agora',
        url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: 'Minhas Viagens',
        short_name: 'Viagens',
        description: 'Ver histórico e agendamentos',
        url: '/corridas',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      }
    ],
    categories: ['transportation', 'business', 'productivity', 'travel']
  };
}
