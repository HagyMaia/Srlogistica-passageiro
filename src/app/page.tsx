'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Clock,
  Shield,
  Car,
  Package,
  Sparkles,
  ChevronRight,
  Navigation,
  Star,
  Calendar,
  CalendarCheck,
  HelpCircle,
  Globe,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { SupportModal } from '@/components/SupportModal';
import { PendingApprovalModal } from '@/components/PendingApprovalModal';
import { SR_SUPPORT_CONFIG } from '@/types';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { currentTrip, scheduledTrips, loadScheduledTrips } = usePassengerTripStore();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const isApproved = profile?.is_approved !== false && profile?.status !== 'pending';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/welcome');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.id) {
      loadScheduledTrips(user.id);
    }
  }, [user, loadScheduledTrips]);

  const quickCategories = [
    { id: 'POPULAR', name: 'SR Pop', desc: 'Carros rápidos', icon: Car, bg: 'bg-amber-500/10 text-amber-600 dark:text-brand' },
    { id: 'CONFORT', name: 'SR Confort', desc: 'Espaço e ar', icon: Shield, bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { id: 'EXECUTIVO', name: 'SR Executivo', desc: 'Alto padrão', icon: Sparkles, bg: 'bg-amber-500/10 text-amber-700 dark:text-brand' },
    { id: 'ENTREGA', name: 'SR Entregas', desc: 'Envio rápido', icon: Package, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  ];

  const favoritePlaces = [
    { title: 'Manauara Shopping', subtitle: 'Adrianópolis, Manaus', time: '12 min' },
    { title: 'Amazonas Shopping', subtitle: 'Parque 10 de Novembro', time: '15 min' },
    { title: 'Aeroporto Eduardo Gomes', subtitle: 'Tarumã, Manaus', time: '25 min' },
  ];

  const nextScheduledTrip = scheduledTrips.length > 0 ? scheduledTrips[0] : null;

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-slate-50 dark:bg-dark-950">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Carregando SR Logística...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-dvh p-5 space-y-5 pb-24">
      {/* Header com Saudação do Passageiro */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <span className="text-xs font-semibold text-slate-400">Olá, bem-vindo(a) 👋</span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {profile?.name || 'Passageiro SR'}
          </h1>
        </div>

        <Link
          href="/perfil"
          className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-dark-800 p-2 pr-3 border border-slate-200 dark:border-dark-700 transition hover:scale-105"
        >
          <img
            src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt="Avatar"
            className="h-8 w-8 rounded-full object-cover border border-brand"
          />
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 block">Sua nota</span>
            <span className="text-xs font-black text-slate-900 dark:text-brand">★ {profile?.rating || 4.95}</span>
          </div>
        </Link>
      </div>

      {/* Alerta de Cadastro Pendente no Admin (se não aprovado) */}
      {!isApproved && (
        <button
          onClick={() => setIsPendingModalOpen(true)}
          className="w-full flex items-center justify-between rounded-3xl bg-amber-500/15 border border-amber-500/30 p-4 text-left text-slate-900 dark:text-white transition hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-dark-950 font-black">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Aprovação Pendente no Painel Admin
              </span>
              <span className="text-xs font-black">
                Toque para agilizar liberação via WhatsApp ➔
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
        </button>
      )}

      {/* Alerta de Corrida Ativa (se houver) */}
      {currentTrip && currentTrip.status !== 'IDLE' && (
        <Link
          href="/mapa"
          className="flex items-center justify-between rounded-3xl bg-brand p-4 text-dark-950 font-black shadow-lg shadow-brand/30 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-dark-950 text-brand">
              <Navigation size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Você tem uma viagem em andamento</span>
              <span className="text-xs font-black">Toque para ver o motorista no mapa ➔</span>
            </div>
          </div>
          <ChevronRight size={20} />
        </Link>
      )}

      {/* Alerta de Próxima Corrida Agendada (se houver) */}
      {nextScheduledTrip && (!currentTrip || currentTrip.status === 'IDLE') && (
        <Link
          href="/corridas"
          className="flex items-center justify-between rounded-3xl bg-amber-500/15 border border-amber-500/30 p-3.5 text-slate-900 dark:text-white transition hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-dark-950 font-black">
              <CalendarCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Viagem Agendada
              </span>
              <span className="text-xs font-black">
                {nextScheduledTrip.scheduledFor ? formatDateTime(nextScheduledTrip.scheduledFor) : 'Em breve'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>Ver</span>
            <ChevronRight size={16} />
          </div>
        </Link>
      )}

      {/* Caixa de Busca Principal (Solicitar Imediata) */}
      <Link
        href="/mapa"
        className="flex items-center gap-3 rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-xl transition hover:border-brand/50 group"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-dark-950 font-black shadow-md shadow-brand/25 group-hover:scale-105 transition">
          <Search size={22} />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SR Logística</span>
          <h3 className="text-base font-black text-slate-900 dark:text-white">Para onde vamos agora?</h3>
          <p className="text-xs text-slate-400">Toque para selecionar seu destino</p>
        </div>
      </Link>

      {/* Botão de Destaque: Solicitar Corrida Agendada */}
      <Link
        href="/mapa?mode=schedule"
        className="flex items-center justify-between rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-gradient-to-r from-amber-500/10 via-brand/10 to-transparent p-4 shadow-sm transition hover:border-brand/50 hover:scale-[1.01]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-brand font-black border border-amber-500/30">
            <Calendar size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Solicitar Corrida Agendada</h4>
              <Badge className="bg-brand text-dark-950 text-[9px] font-black px-1.5 py-0.2">Novo</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Programe viagens com data e hora marcada para aeroportos e reuniões
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-400 shrink-0 ml-2" />
      </Link>

      {/* Serviços / Categorias Rápidas */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Serviços Disponíveis</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                href="/mapa"
                className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-dark-700/60 bg-white dark:bg-dark-800 p-3.5 shadow-sm transition hover:scale-[1.02] hover:border-brand/40"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cat.bg}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">{cat.name}</h4>
                  <p className="text-[10px] text-slate-400">{cat.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Destinos Recentes / Favoritos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Destinos Recentes</h3>
          <Link href="/mapa" className="text-xs font-bold text-brand-700 dark:text-brand hover:underline">
            Ver mapa
          </Link>
        </div>

        <div className="space-y-2">
          {favoritePlaces.map((place, idx) => (
            <Link
              key={idx}
              href="/mapa"
              className="flex items-center justify-between rounded-2xl border border-slate-200/70 dark:border-dark-700/50 bg-white dark:bg-dark-800/80 p-3.5 transition hover:bg-slate-50 dark:hover:bg-dark-750"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-700 text-slate-500 dark:text-slate-300">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{place.title}</h4>
                  <p className="text-[11px] text-slate-400">{place.subtitle}</p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-400">{place.time}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Canais de Atendimento & Site Oficial */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex flex-col justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 text-left shadow-sm hover:scale-[1.02] transition"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-2">
            <HelpCircle size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white">Central de Ajuda</h4>
            <p className="text-[10px] text-slate-400">WhatsApp & Suporte 24h</p>
          </div>
        </button>

        <a
          href={SR_SUPPORT_CONFIG.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 text-left shadow-sm hover:scale-[1.02] transition"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-2">
            <Globe size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">Site Oficial</h4>
              <ExternalLink size={10} className="text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400">SR Logística Manaus</p>
          </div>
        </a>
      </div>

      {/* Banner de Vantagem / Segurança SR */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-dark-950 p-5 text-white border border-dark-700 shadow-xl">
        <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles size={14} /> SR Fidelidade & Segurança
        </div>
        <h4 className="text-base font-black">Viaje tranquilo em Manaus</h4>
        <p className="text-xs text-slate-300 mt-1">
          Motoristas credenciados com vistoria presencial e suporte 24h na central SR Logística.
        </p>
      </div>

      {/* Modais de Apoio */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <PendingApprovalModal isOpen={isPendingModalOpen} onClose={() => setIsPendingModalOpen(false)} />
    </div>
  );
}
