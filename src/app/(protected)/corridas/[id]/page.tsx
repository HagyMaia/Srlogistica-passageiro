'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Navigation, Star, ShieldCheck, Car, Calendar, Receipt, DollarSign } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function CorridaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  // Dados mockados / carregados da corrida
  const ride = {
    id: resolvedParams.id,
    date: new Date().toISOString(),
    pickup: 'Av. Mário Ypiranga, 1300 - Adrianópolis, Manaus',
    dropoff: 'Av. Djalma Batista, 482 - Parque 10 de Novembro, Manaus',
    distance: '4.8 km',
    duration: '14 min',
    category: 'SR Pop',
    driver: {
      name: 'Carlos Eduardo da Silva',
      vehicle: 'Chevrolet Onix Plus · Prata (ABC-1D23)',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      rating: 4.96
    },
    payment: {
      method: 'PIX',
      base: 5.50,
      km: 10.08,
      time: 4.90,
      discount: 0.00,
      total: 20.48
    }
  };

  return (
    <div className="flex flex-col min-h-dvh p-5 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/corridas"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detalhe da Viagem</span>
          <h1 className="text-base font-black text-slate-900 dark:text-white">Recibo #{ride.id.slice(-6)}</h1>
        </div>
      </div>

      {/* Card do Motorista */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={ride.driver.avatar}
            alt={ride.driver.name}
            className="h-12 w-12 rounded-2xl object-cover border border-brand"
          />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{ride.driver.name}</h3>
            <p className="text-xs text-slate-400">{ride.driver.vehicle}</p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-brand mt-0.5">
              <Star size={12} fill="#FFC800" /> {ride.driver.rating}
            </div>
          </div>
        </div>
      </div>

      {/* Rota */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm space-y-3 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Itinerário</span>
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Ponto de Embarque</span>
            <p className="font-bold text-slate-800 dark:text-slate-200">{ride.pickup}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Navigation size={16} className="text-brand shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Ponto de Desembarque</span>
            <p className="font-bold text-slate-800 dark:text-slate-200">{ride.dropoff}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-dark-700 text-slate-400 font-medium">
          <span>Distância: {ride.distance}</span>
          <span>Duração: {ride.duration}</span>
        </div>
      </div>

      {/* Detalhamento Financeiro / Recibo */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm space-y-2.5 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Detalhamento do Preço</span>
        
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Tarifa Base</span>
          <span>{formatCurrency(ride.payment.base)}</span>
        </div>

        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Distância ({ride.distance})</span>
          <span>{formatCurrency(ride.payment.km)}</span>
        </div>

        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Tempo no trânsito ({ride.duration})</span>
          <span>{formatCurrency(ride.payment.time)}</span>
        </div>

        <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-dark-700 text-sm font-black text-slate-900 dark:text-white">
          <span>Total Pago ({ride.payment.method})</span>
          <span className="text-brand-700 dark:text-brand">{formatCurrency(ride.payment.total)}</span>
        </div>
      </div>

      {/* Ação: Solicitar Novamente */}
      <Link href="/mapa" className="w-full block">
        <Button variant="primary" size="lg" full>
          Solicitar Viagem Semelhante
        </Button>
      </Link>
    </div>
  );
}
