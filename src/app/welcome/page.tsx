'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Navigation,
  Sparkles,
  Calendar,
  Building2,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Globe,
  ExternalLink,
  Star,
  MapPin,
  Clock,
  Car,
  CheckCircle2,
  Lock,
  PhoneCall
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG, SR_PIX_CONFIG } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function WelcomePage() {
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await supabase.auth.signInWithPassword({
        email: 'passageiro@demo.local',
        password: 'demo123'
      });
      window.location.href = '/mapa';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between bg-dark-950 text-white overflow-hidden select-none">
      {/* Imagem de Fundo / Hero Visual de Alta Resolução */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/passenger-hero.png"
          alt="Passageiro solicitando corrida executiva - SR Logística"
          className="h-full w-full object-cover object-top scale-105 filter brightness-[0.92] contrast-[1.05]"
        />

        {/* Gradientes de Fusão e Escurecimento para Legibilidade Perfeita */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/75 to-dark-950/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-dark-950/60 via-transparent to-dark-950" />
      </div>

      {/* Topo / Header com Marca & Acesso Rápido */}
      <div className="relative z-10 flex items-center justify-between p-5 pt-6 sm:p-7">
        <div className="flex items-center gap-2.5 backdrop-blur-md bg-dark-950/50 p-2 pr-3.5 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 via-brand to-amber-300 text-dark-950 font-black shadow-md shadow-brand/40">
            <Navigation size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                SR Logística
              </span>
              <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-brand text-dark-950">
                Executivo
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block font-medium">
              Manaus - AM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-black text-white hover:text-brand px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 shadow-sm transition active:scale-95"
          >
            Entrar
          </Link>
        </div>
      </div>

      {/* Cartão Flutuante Sobre o Hero (Simulação de Viagem Ativa / Confiança) */}
      <div className="relative z-10 px-5 sm:px-7 my-auto space-y-3">
        <div className="max-w-md mx-auto">
          {/* Tag Flutuante de Status do Motorista */}
          <div className="inline-flex items-center gap-2 rounded-2xl bg-dark-900/85 backdrop-blur-xl border border-brand/40 px-3.5 py-2 shadow-2xl animate-pulse">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black text-white">
              Motoristas disponíveis em Manaus
            </span>
            <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
              Chegada em ~3 min
            </span>
          </div>

          {/* Destaque de Avaliação e Segurança */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-200">
            <div className="flex items-center text-amber-400">
              <Star size={14} fill="currentColor" />
              <span className="ml-1 font-black text-white">4.96</span>
            </div>
            <span>•</span>
            <span className="text-slate-300">Frota 100% Climatizada</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">Vistoria Presencial</span>
          </div>
        </div>
      </div>

      {/* Painel Inferior de Boas-Vindas & Ações Principais */}
      <div className="relative z-10 p-5 sm:p-7 pt-4 bg-gradient-to-t from-dark-950 via-dark-950/95 to-transparent space-y-5 max-w-lg mx-auto w-full">
        {/* Título & Descrição */}
        <div className="space-y-2">
          <Badge className="bg-brand/20 text-brand border-brand/30 text-[10px] font-black uppercase tracking-wider">
            Mobilidade Urbana & Corporativa
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            Sua melhor viagem em Manaus começa aqui.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Solicite corridas em instantes ou agende trajetos executivos para aeroportos e compromissos corporativos.
          </p>
        </div>

        {/* Pílulas de Diferenciais Oficiais */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Building2 size={15} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">Voucher Empresa</span>
              <span className="text-[9px] text-slate-400 block truncate">Faturamento Quinzenal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <QrCode size={15} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black text-white block truncate">PIX Oficial</span>
              <span className="text-[9px] text-slate-400 block truncate">CNPJ: 52.967.828/0001-17</span>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-2.5 pt-1">
          {/* Botão Principal de Cadastro */}
          <Link href="/cadastro" className="block">
            <Button
              variant="primary"
              size="xl"
              full
              className="font-black text-sm shadow-2xl shadow-brand/30 h-13 rounded-2xl flex items-center justify-center gap-2 group bg-gradient-to-r from-brand-600 via-brand to-amber-400 text-dark-950 hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <span>Solicitar Minha Corrida</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Botão de Login Secundário */}
          <Link href="/login" className="block">
            <Button
              variant="ghost"
              size="lg"
              full
              className="border border-white/15 bg-white/5 hover:bg-white/10 text-white font-black text-xs h-11 rounded-2xl backdrop-blur-md transition active:scale-[0.99]"
            >
              Já tenho uma conta / Entrar
            </Button>
          </Link>

          {/* Acesso Demo Rápido de 1 Toque */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 p-2 text-[11px] font-bold text-slate-400 hover:text-white hover:border-white/30 transition"
          >
            <Sparkles size={13} className="text-brand" />
            {demoLoading ? 'Conectando...' : 'Testar no Modo Demonstração (1 Clique)'}
          </button>
        </div>

        {/* Rodapé / Informações de Segurança & Contato */}
        <div className="pt-2 border-t border-white/10 text-center space-y-1">
          <div className="flex justify-center items-center gap-3 text-[10px] font-medium text-slate-400">
            <span className="flex items-center gap-1">
              <Lock size={10} className="text-emerald-400" /> Rastreamento 24h
            </span>
            <span>•</span>
            <a
              href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand transition"
            >
              WhatsApp: {SR_SUPPORT_CONFIG.phone1}
            </a>
            <span>•</span>
            <a
              href={SR_SUPPORT_CONFIG.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand inline-flex items-center gap-0.5"
            >
              <Globe size={10} /> Site Oficial <ExternalLink size={8} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
