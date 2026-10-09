'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Smartphone,
  Download,
  CheckCircle2,
  Shield,
  Star,
  Sparkles,
  X
} from 'lucide-react';
import { Button } from '@/components/ui';

export default function WelcomePage() {
  const router = useRouter();
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
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch {
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col justify-between bg-[#070D18] text-white select-none overflow-hidden">
      {/* Imagem de Fundo Hero com Gradiente Executivo */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/passenger-hero.png"
          alt="SR Logística Passageiro"
          className="h-full w-full object-cover object-center scale-100 filter brightness-[0.72] contrast-[1.08]"
        />
        {/* Fusão Suave com Gradiente Escuro Obsidian */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-[#070D18]/75 to-[#070D18]/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Topo / Header Minimalista */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-black tracking-wider uppercase text-white">
            SR LOGÍSTICA
          </span>
        </div>

        <Link
          href="/login"
          className="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition active:scale-95 shadow-sm"
        >
          Entrar
        </Link>
      </header>

      {/* Conteúdo Central & Chamada Visual Conforme Imagem de Referência */}
      <main className="relative z-10 w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto px-6 sm:px-8 space-y-4 my-auto text-left">
        {/* Badge Dourada Executiva */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/50 border border-amber-500/40 backdrop-blur-md text-xs font-bold text-amber-400 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Mobilidade Executiva & Corporativa</span>
        </div>

        {/* Título Principal de Alto Impacto */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.12] tracking-tight">
          Sua viagem executiva em Manaus.
        </h1>

        {/* Subtítulo Descritivo */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-md">
          Corridas corporativas e particulares com conforto, pontualidade e segurança 24h.
        </p>

        {/* Indicadores rápidos de confiança (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center gap-4 pt-1 text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-amber-400" />
            <span>Motoristas Credenciados</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-400" />
            <span>Voucher Corporativo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span>Frota Premium</span>
          </div>
        </div>
      </main>

      {/* Ações Principais no Rodapé */}
      <footer className="relative z-10 w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto px-6 sm:px-8 pb-6 pt-2 space-y-3">
        {/* Botão 1: Começar Agora (Amarelo / Dourado) */}
        <Link href="/cadastro" className="block">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 h-12 sm:h-13 px-5 rounded-2xl bg-[#F59E0B] hover:bg-[#FBBF24] text-[#070D18] font-black text-sm shadow-xl shadow-amber-500/25 transition active:scale-[0.98]"
          >
            <span>Começar Agora</span>
            <ArrowRight size={18} className="stroke-[2.5]" />
          </button>
        </Link>

        {/* Botão 2: Instalar Aplicativo no Celular [Grátis] (Estilo Imagem de Referência) */}
        <button
          type="button"
          onClick={handleInstallApp}
          className="flex w-full items-center justify-between h-11 sm:h-12 px-4 rounded-2xl bg-[#0D281E]/85 hover:bg-[#123629] border border-amber-500/40 hover:border-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg backdrop-blur-md transition active:scale-[0.98] group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#F59E0B] text-[#070D18] font-black shadow-sm group-hover:scale-105 transition">
              <Download size={14} className="stroke-[2.5]" />
            </div>
            <span className="font-bold text-white text-xs sm:text-sm">
              Instalar Aplicativo no Celular
            </span>
          </div>

          <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-amber-900/60 text-amber-300 font-bold border border-amber-500/40">
            Grátis
          </span>
        </button>

        {/* Botão 3: Já tenho uma conta (Transparente / Frosted) */}
        <Link href="/login" className="block">
          <button
            type="button"
            className="flex w-full items-center justify-center h-10 sm:h-11 px-4 rounded-2xl border border-white/15 bg-black/40 hover:bg-white/10 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition active:scale-[0.98]"
          >
            Já tenho uma conta
          </button>
        </Link>

        {/* Nota de Rodapé Oficial */}
        <div className="pt-1 text-center text-[10px] sm:text-[11px] text-slate-400 font-medium">
          SR Logística & Transporte • Manaus - AM
        </div>
      </footer>

      {/* Modal Moderno de Instalação do Aplicativo (PWA & APK Android) */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm sm:max-w-md rounded-3xl bg-[#0B1220] p-6 shadow-2xl border border-slate-800 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Smartphone size={18} />
                </div>
                <h3 className="text-base font-black text-white">Instalar Aplicativo SR</h3>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                  🤖 Adicionar à Tela Inicial (Chrome / Android):
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Toque no menu <strong>⋮ (três pontinhos)</strong> no canto superior do navegador e clique em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                  🍏 No iPhone / iPad (Safari):
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Toque no botão <strong>Compartilhar</strong> (ícone do quadrado com seta para cima) e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-black text-white text-xs flex items-center gap-1.5">
                  📥 Pacote Direto APK (Android):
                </h4>
                <p className="text-[11px] text-slate-400">
                  Baixe e instale o pacote direto oficial do SR Passageiro:
                </p>
                <a
                  href="/sr-passageiro.apk"
                  download="sr-passageiro.apk"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-dark-950 shadow-md hover:bg-amber-400 transition active:scale-95"
                >
                  <Download size={15} /> Baixar sr-passageiro.apk
                </a>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              full
              onClick={() => setIsInstallModalOpen(false)}
              className="py-2.5 font-bold border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
