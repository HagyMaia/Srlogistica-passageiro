'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  ChevronRight,
  Star,
  Shield,
  Clock,
  Car,
  CheckCircle2,
  PhoneCall,
  MapPin,
  Lock,
  ChevronLeft
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG, SR_PIX_CONFIG } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function WelcomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const slides = [
    {
      badge: 'Transporte Executivo & Urbano',
      title: 'Mobilidade de alto padrão para suas viagens diárias',
      subtitle:
        'Solicite viagens com motoristas parceiros rigorosamente selecionados em Manaus ou agende seus trajetos com antecedência garantida.',
      icon: Car,
      iconColor: 'text-brand',
      iconBg: 'bg-brand/15 border-brand/30',
      stats: [
        { label: 'Nota Média', val: '★ 4.96' },
        { label: 'Pontualidade', val: '99.4%' },
        { label: 'Frota', val: '100% Climatizada' }
      ]
    },
    {
      badge: 'Soluções Corporativas B2B',
      title: 'Voucher Corporativo com Faturamento Quinzenal',
      subtitle:
        'Ideal para empresas parceiras. Seus colaboradores e executivos se deslocam sem desembolso no veículo, com gestão e fechamento quinzenal.',
      icon: Building2,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      stats: [
        { label: 'Ciclo', val: 'Quinzenal' },
        { label: 'Relatórios', val: 'Detalhados' },
        { label: 'Sem Reembolso', val: 'Direto na Fatura' }
      ]
    },
    {
      badge: 'Pagamento Prático & Seguro',
      title: 'PIX Direto na Chave Oficial da Empresa',
      subtitle:
        `Transparência total. Pague instantaneamente no app do seu banco com o CNPJ oficial ${SR_PIX_CONFIG.keyFormatted} da SR Logística.`,
      icon: QrCode,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
      stats: [
        { label: 'Chave CNPJ', val: '52.967.828/0001-17' },
        { label: 'Liquidação', val: 'Instantânea' },
        { label: 'Segurança', val: '100% Auditada' }
      ]
    },
    {
      badge: 'Segurança & Central Manaus 24h',
      title: 'Rastreamento em tempo real com apoio local 24h',
      subtitle:
        `Sinta-se protegido em cada quilômetro com botão de emergência SOS, monitoramento contínuo e suporte telefônico e WhatsApp em Manaus.`,
      icon: ShieldCheck,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/15 border-blue-500/30',
      stats: [
        { label: 'Suporte', val: '(92) 98492-3316' },
        { label: 'Monitoramento', val: 'GPS 24h' },
        { label: 'Atendimento', val: 'Humanizado' }
      ]
    }
  ];

  // Auto avanço suave a cada 6 segundos caso o usuário não clique
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

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

  const current = slides[activeSlide];
  const CurrentIcon = current.icon;

  return (
    <div className="relative flex min-h-dvh flex-col justify-between p-5 sm:p-7 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white transition-colors overflow-hidden">
      {/* Background Decorativo Sutil */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 -ml-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Topo / Header Executivo */}
      <div className="relative z-10 flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-brand to-amber-400 text-dark-950 font-black shadow-lg shadow-brand/30 border border-brand/40">
            <Navigation size={26} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                SR Logística
              </span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-brand text-dark-950">
                Executivo
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Mobilidade Corporativa & Urbana
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-black text-slate-900 dark:text-white hover:text-brand px-3.5 py-2 rounded-2xl bg-white dark:bg-dark-800 border border-slate-200/90 dark:border-dark-700 shadow-sm transition hover:scale-105 active:scale-95"
          >
            Entrar
          </Link>
        </div>
      </div>

      {/* Seção Principal / Card Interativo de Alto Padrão */}
      <div className="relative z-10 my-auto py-6 space-y-5 max-w-lg mx-auto w-full">
        {/* Card Destaque Dinâmico */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-dark-700/80 bg-white/95 dark:bg-dark-900/90 backdrop-blur-xl p-6 sm:p-7 shadow-2xl space-y-5 transition-all">
          <div className="flex items-center justify-between">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${current.iconBg} ${current.iconColor} border shadow-inner transition-transform duration-300 scale-100`}
            >
              <CurrentIcon size={30} />
            </div>

            <Badge className="bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 text-[10px] font-black uppercase tracking-wider">
              {current.badge}
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
              {current.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {current.subtitle}
            </p>
          </div>

          {/* Mini Estatísticas / Destaques do Slide */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-dark-800/80">
            {current.stats.map((st, i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-50 dark:bg-dark-950/70 border border-slate-200/50 dark:border-dark-800 p-2.5 text-center"
              >
                <span className="text-[11px] font-black text-slate-900 dark:text-brand block truncate">
                  {st.val}
                </span>
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider truncate">
                  {st.label}
                </span>
              </div>
            ))}
          </div>

          {/* Controle de Navegação dos Slides */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeSlide === idx
                      ? 'w-8 bg-brand'
                      : 'w-2 bg-slate-200 dark:bg-dark-700 hover:bg-slate-300'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setActiveSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
                }
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-700 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-700 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Pilares Profissionais de Qualidade SR */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-dark-900/80 border border-slate-200/80 dark:border-dark-800 p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-brand shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate text-slate-900 dark:text-white">
                Viagens Agendadas
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Aeroportos & Reuniões
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-dark-900/80 border border-slate-200/80 dark:border-dark-800 p-3.5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block truncate text-slate-900 dark:text-white">
                Suporte 24 Horas
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Central em Manaus
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação Executivos & Rodapé */}
      <div className="relative z-10 space-y-3 pt-2 max-w-lg mx-auto w-full">
        {/* Botão de Cadastro Principal */}
        <Link href="/cadastro" className="block">
          <Button
            variant="primary"
            size="xl"
            full
            className="font-black text-sm shadow-xl shadow-brand/25 h-13 rounded-2xl flex items-center justify-center gap-2 group"
          >
            <span>Cadastrar e Solicitar Viagem</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>

        {/* Botão de Login Secundário */}
        <Link href="/login" className="block">
          <Button
            variant="ghost"
            size="lg"
            full
            className="border border-slate-300 dark:border-dark-700 bg-white/90 dark:bg-dark-900/90 text-slate-900 dark:text-white font-black text-xs hover:bg-slate-100 dark:hover:bg-dark-800 h-11 rounded-2xl"
          >
            Já possuo conta de passageiro
          </Button>
        </Link>

        {/* Acesso Demo de 1 Clique */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoLoading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 dark:border-dark-700/80 p-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 transition"
        >
          <Sparkles size={14} className="text-brand-600 dark:text-brand" />
          {demoLoading ? 'Acessando ambiente...' : 'Experimentar Demonstração (1 Toque)'}
        </button>

        {/* Rodapé Oficial com Selo e Telefones */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-dark-800/60 text-center space-y-1">
          <div className="flex justify-center items-center gap-3 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <Lock size={10} className="text-emerald-500" /> Criptografia Segura
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin size={10} className="text-brand" /> Manaus - AM
            </span>
            <span>•</span>
            <a
              href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand transition"
            >
              {SR_SUPPORT_CONFIG.phone1}
            </a>
          </div>

          <div>
            <a
              href={SR_SUPPORT_CONFIG.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand transition"
            >
              <Globe size={11} /> {SR_SUPPORT_CONFIG.websiteUrl} <ExternalLink size={9} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
