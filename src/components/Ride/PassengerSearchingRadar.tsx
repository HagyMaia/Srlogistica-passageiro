'use client';

import { Radio, X, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';

interface PassengerSearchingRadarProps {
  trip: PassengerTrip;
  onCancel: () => void;
}

export function PassengerSearchingRadar({ trip, onCancel }: PassengerSearchingRadarProps) {
  return (
    <div className="w-full rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-5 shadow-2xl">
      {/* Cabeçalho do Radar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-brand-700 dark:text-brand">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-brand/30 opacity-75"></span>
            <Radio size={24} className="relative animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Procurando motorista...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Enviando pedido para parceiros próximos</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400">Valor</span>
          <div className="text-base font-black text-brand-700 dark:text-brand">
            {formatCurrency(trip.estimatedFare)}
          </div>
        </div>
      </div>

      {/* Animação do Radar com Ondas Circulares */}
      <div className="relative my-6 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 dark:bg-dark-950/60 border border-slate-100 dark:border-dark-800">
        <div className="absolute h-24 w-24 rounded-full border border-brand/40 animate-ping" style={{ animationDuration: '2.5s' }} />
        <div className="absolute h-16 w-16 rounded-full border border-brand/60 animate-ping" style={{ animationDuration: '1.8s' }} />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand text-dark-950 shadow-lg shadow-brand/40 font-black">
          🚗
        </div>
      </div>

      {/* Detalhes da Rota em Espera */}
      <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-dark-950/40 p-3 text-xs border border-slate-100 dark:border-dark-800">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-400">Embarque:</span>
          <span className="font-bold truncate max-w-[200px]">{trip.origin.address}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-400">Destino:</span>
          <span className="font-bold truncate max-w-[200px]">{trip.destination.address}</span>
        </div>
      </div>

      {/* Botão Cancelar Busca */}
      <div className="mt-4">
        <Button
          variant="outline"
          size="lg"
          full
          onClick={onCancel}
          className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
        >
          <X size={16} /> Cancelar Pedido
        </Button>
      </div>
    </div>
  );
}
