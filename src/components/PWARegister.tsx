'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('✅ Service Worker registrado com sucesso (PWA):', reg.scope);
          })
          .catch((err) => {
            console.warn('⚠️ Falha ao registrar Service Worker:', err);
          });
      });
    }
  }, []);

  return null;
}
