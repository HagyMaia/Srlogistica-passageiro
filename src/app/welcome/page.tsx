'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Navigation,
  ArrowRight,
  Smartphone,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function WelcomePage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between bg-dark-950 text-white select-none overflow-hidden">
      {/* Imagem de Fundo Hero com Gradiente Suave */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/passenger-hero.png"
          alt="SR Logística Passageiro"
          className="h-full w-full object-cover object-center scale-105 filter brightness-[0.75] contrast-[1.05]"
        />
        {/* Fusão em degradê escuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/80 to-dark-950/40" />
      </div>

      {/* Topo / Header Minimalista */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-amber-300 text-dark-950 font-black shadow-lg shadow-brand/30">
            <Navigation size={20} />
          </div>
          <span className="text-sm font-black tracking-wider uppercase text-white">
            SR Logística
          </span>
        </div>

        <Link
          href="/login"
          className="text-xs font-bold text-slate-200 hover:text-white px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition active:scale-95"
        >
          Entrar
        </Link>
      </header>

      {/* Conteúdo Central & Chamada Limpa */}
      <main className="relative z-10 px-6 max-w-sm mx-auto w-full space-y-3 my-auto text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 border border-brand/30 text-[11px] font-bold text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          Mobilidade Executiva & Corporativa
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
          Sua viagem executiva em Manaus.
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Corridas corporativas e particulares com conforto, pontualidade e segurança 24h.
        </p>
      </main>

      {/* Ações Principais no Rodapé */}
      <footer className="relative z-10 p-6 pt-2 max-w-sm mx-auto w-full space-y-3">
        <Link href="/cadastro" className="block">
          <Button
            variant="primary"
            size="xl"
            full
            className="font-black text-sm h-12 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-brand/25 bg-gradient-to-r from-brand-600 via-brand to-amber-400 text-dark-950 hover:brightness-105 active:scale-[0.99] transition"
          >
            <span>Começar Agora</span>
            <ArrowRight size={18} />
          </Button>
        </Link>

        <Link href="/login" className="block">
          <Button
            variant="ghost"
            size="lg"
            full
            className="border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 rounded-2xl backdrop-blur-md transition active:scale-[0.99]"
          >
            Já tenho uma conta
          </Button>
        </Link>

        {/* Botão sutil de instalação */}
        <button
          type="button"
          onClick={handleInstallApp}
          className="flex w-full items-center justify-center gap-1.5 text-slate-400 hover:text-brand py-1.5 text-[11px] font-medium transition"
        >
          <Smartphone size={13} />
          <span>Instalar / Baixar App no Celular</span>
        </button>

        <div className="pt-2 text-center text-[10px] text-slate-500 font-medium">
          SR Logística & Transporte • Manaus - AM
        </div>
      </footer>

      {/* Modal Limpo de Instalação do Aplicativo */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-dark-900 p-5 shadow-2xl border border-dark-700 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-brand" />
                <h3 className="text-base font-black text-white">Instalar Aplicativo</h3>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20 space-y-1.5">
                <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                  🤖 Instalação Direta (Android):
                </h4>
                <p className="text-[11px] text-slate-300">
                  Toque no menu <strong>⋮ (três pontinhos)</strong> do Google Chrome e selecione <strong>"Instalar aplicativo"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-dark-800 border border-dark-700 space-y-2">
                <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                  📥 Download do APK:
                </h4>
                <a
                  href="/sr-passageiro.apk"
                  download="sr-passageiro.apk"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-xs font-black text-dark-950 shadow-md hover:bg-brand-hover transition"
                >
                  <Download size={14} /> Baixar sr-passageiro.apk
                </a>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              full
              onClick={() => setIsInstallModalOpen(false)}
              className="py-2 font-bold border-dark-700 text-slate-300"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
