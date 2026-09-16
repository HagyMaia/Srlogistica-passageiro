'use client';

import { Calendar, Clock, MapPin, Navigation, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';
import Link from 'next/link';

interface ScheduledSuccessModalProps {
  trip: PassengerTrip;
  onClose: () => void;
}

export function ScheduledSuccessModal({ trip, onClose }: ScheduledSuccessModalProps) {
  const categoryName =
    trip.category === 'CONFORT'
      ? 'SR Confort'
      : trip.category === 'EXECUTIVO'
      ? 'SR Executivo'
      : 'SR Pop';

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-dark-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-6 shadow-2xl space-y-5 animate-slideUp">
        {/* Cabeçalho de Sucesso */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Agendamento Confirmado
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Corrida Agendada!
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Destaque da Data e Hora */}
        <div className="rounded-2xl bg-brand/15 dark:bg-brand/10 border border-brand/30 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-brand">
            <Calendar size={16} />
            <span>Data e Horário do Embarque</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <Clock size={20} className="text-brand-700 dark:text-brand" />
            <span className="text-base font-black text-slate-900 dark:text-white">
              {trip.scheduledFor ? formatDateTime(trip.scheduledFor) : 'Data agendada'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-300">
            Enviaremos uma notificação e localizaremos um motorista parceiro 15 minutos antes.
          </p>
        </div>

        {/* Detalhes da Rota & Categoria */}
        <div className="space-y-3 rounded-2xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200/60 dark:border-dark-800 p-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-dark-800">
            <div className="flex items-center gap-2">
              <Badge className="bg-brand text-dark-950 font-black">{categoryName}</Badge>
              <span className="text-[11px] font-semibold text-slate-500">
                {trip.paymentMethod === 'PIX'
                  ? 'Pagamento via PIX'
                  : 'Voucher Corporativo (Faturamento Quinzenal)'}
              </span>
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-brand">
              {formatCurrency(trip.estimatedFare)}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-semibold">Embarque</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {trip.origin.address || `${trip.origin.latitude}, ${trip.origin.longitude}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Navigation size={16} className="text-brand-600 dark:text-brand shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-semibold">Destino</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                  {trip.destination.address || `${trip.destination.latitude}, ${trip.destination.longitude}`}
                </p>
              </div>
            </div>

            {trip.scheduledNotes && (
              <div className="pt-2 border-t border-slate-200/50 dark:border-dark-800 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700 dark:text-slate-300">Observações: </span>
                <span>{trip.scheduledNotes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-2 pt-1">
          <Link href="/corridas" onClick={onClose} className="w-full block">
            <Button variant="primary" size="lg" full>
              Ver Minhas Viagens Agendadas
              <ArrowRight size={18} />
            </Button>
          </Link>

          <Button variant="ghost" size="md" full onClick={onClose}>
            Voltar ao Mapa
          </Button>
        </div>
      </div>
    </div>
  );
}
