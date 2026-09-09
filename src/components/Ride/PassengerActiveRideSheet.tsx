'use client';

import { useState } from 'react';
import {
  Car,
  Phone,
  MessageSquare,
  Shield,
  Star,
  MapPin,
  Navigation,
  CreditCard,
  XCircle,
  Clock,
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/utils';
import { PassengerChatModal } from './PassengerChatModal';
import { PassengerSafetyModal } from './PassengerSafetyModal';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';

interface PassengerActiveRideSheetProps {
  trip: PassengerTrip;
  onCancel: () => void;
  onSendMessage?: (msg: string) => void;
  onSimulateNext?: () => void; // Apenas para testes/demonstração
}

export function PassengerActiveRideSheet({
  trip,
  onCancel,
  onSendMessage,
  onSimulateNext
}: PassengerActiveRideSheetProps) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const { chatMessages, unreadChatCount } = usePassengerTripStore();

  const driver = trip.driver || {
    id: 'driver-default',
    name: 'Carlos Eduardo da Silva',
    phone: '(92) 98492-3316',
    rating: 4.96,
    total_rides: 1420,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    vehicle: {
      brand: 'Chevrolet',
      model: 'Onix Plus',
      color: 'Prata Metálico',
      plate: 'ABC-1D23',
      category: 'POPULAR'
    }
  };

  const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

  const getStatusDisplay = () => {
    switch (trip.status) {
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
        return {
          title: 'Motorista a caminho',
          subtitle: 'Chegando ao seu local de embarque em ~3 min',
          badge: 'Chegando',
          color: 'bg-amber-500/10 text-amber-600 dark:text-brand border-amber-500/30'
        };
      case 'DRIVER_ARRIVED':
        return {
          title: 'Motorista no local!',
          subtitle: 'Aguardando no ponto de embarque',
          badge: 'No Local',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
        };
      case 'IN_PROGRESS':
        return {
          title: 'Viagem em andamento',
          subtitle: 'A caminho do seu destino com conforto',
          badge: 'Em Rota',
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
        };
      default:
        return {
          title: 'Corrida confirmada',
          subtitle: 'Acompanhe pelo mapa',
          badge: 'Ativa',
          color: 'bg-brand/10 text-brand-700 dark:text-brand border-brand/30'
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <>
      <div className="w-full rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-4 shadow-2xl space-y-3.5">
        {/* Status Banner */}
        <div className={`flex items-center justify-between rounded-2xl border p-3 ${statusInfo.color}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">{statusInfo.title}</h4>
              <p className="text-[11px] opacity-80">{statusInfo.subtitle}</p>
            </div>
          </div>
          <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border border-current">
            {statusInfo.badge}
          </span>
        </div>

        {/* Card do Motorista e Veículo */}
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-dark-950/60 p-3.5 border border-slate-100 dark:border-dark-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={driver.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                alt={driver.name}
                className="h-13 w-13 rounded-2xl object-cover border-2 border-brand"
              />
              <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full bg-dark-900 px-1.5 py-0.2 text-[10px] font-bold text-brand border border-dark-700">
                <Star size={10} fill="#FFC800" />
                {driver.rating}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{driver.name}</h3>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {driver.vehicle.brand} {driver.vehicle.model} · {driver.vehicle.color}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-md bg-dark-900 px-2 py-0.5 font-mono text-[11px] font-black text-white border border-dark-700">
                  {driver.vehicle.plate}
                </span>
                <span className="text-[10px] text-slate-400">
                  {driver.total_rides} corridas
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Valor Final</span>
            <span className="text-base font-black text-brand-700 dark:text-brand">
              {formatCurrency(trip.estimatedFare)}
            </span>
            <span className="text-[10px] text-slate-400">
              {trip.paymentMethod === 'VOUCHER' ? '🏢 Voucher Quinzenal' : 'PIX'}
            </span>
          </div>
        </div>

        {/* Card Interativo de Notificação / Última Mensagem do Chat */}
        {lastMessage && (
          <button
            onClick={() => setShowChatModal(true)}
            className="flex items-center justify-between w-full p-2.5 rounded-2xl bg-amber-500/10 dark:bg-dark-800/90 border border-brand/30 hover:border-brand text-left transition active:scale-[0.99] group shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-dark-950">
                  <MessageCircle size={16} />
                </div>
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white animate-pulse">
                    {unreadChatCount}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-brand-800 dark:text-brand">
                    Chat com {driver.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400">• {lastMessage.timestamp}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {lastMessage.sender === 'passenger' ? `Você: ${lastMessage.text}` : lastMessage.text}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-black text-brand-800 dark:text-brand pl-2 shrink-0">
              <span>Abrir</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )}

        {/* Botões de Ação Imediata (Chat, Ligar, SOS) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowChatModal(true)}
            className="relative flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 dark:bg-dark-800 p-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-700 transition active:scale-95 border border-slate-200/60 dark:border-dark-700/60"
          >
            <MessageSquare size={18} className="text-brand-600 dark:text-brand" />
            <span className="text-[11px] font-bold">Chat Motorista</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-md">
                {unreadChatCount}
              </span>
            )}
          </button>

          <a
            href={`tel:${driver.phone}`}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 dark:bg-dark-800 p-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-700 transition active:scale-95 border border-slate-200/60 dark:border-dark-700/60"
          >
            <Phone size={18} className="text-emerald-500" />
            <span className="text-[11px] font-bold">Ligar</span>
          </a>

          <button
            onClick={() => setShowSafetyModal(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-500/10 p-2.5 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition active:scale-95 border border-red-500/20"
          >
            <Shield size={18} className="text-red-500" />
            <span className="text-[11px] font-bold">SOS / Ajuda</span>
          </button>
        </div>

        {/* Resumo da Rota */}
        <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-dark-950/40 p-3 text-xs border border-slate-100 dark:border-dark-800">
          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
            <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 block">Embarque</span>
              <p className="font-bold truncate">{trip.origin.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
            <Navigation size={14} className="text-brand shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-slate-400 block">Destino</span>
              <p className="font-bold truncate">{trip.destination.address}</p>
            </div>
          </div>
        </div>

        {/* Botão de Cancelamento ou Simulação de Passo para Demonstração */}
        <div className="flex items-center gap-2 pt-0.5">
          {trip.status !== 'IN_PROGRESS' && (
            <button
              onClick={onCancel}
              className="flex-1 text-center py-2 text-xs font-bold text-slate-500 hover:text-red-500 transition"
            >
              Cancelar Viagem
            </button>
          )}

          {onSimulateNext && (
            <button
              onClick={onSimulateNext}
              className="px-3 py-1.5 rounded-xl bg-brand/20 text-brand-800 dark:text-brand text-[11px] font-black hover:bg-brand/30 transition"
              title="Avançar status da corrida (Modo Demonstração)"
            >
              Simular Avanço ➔
            </button>
          )}
        </div>
      </div>

      {/* Modal de Chat em Tempo Real com o Motorista */}
      <PassengerChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        trip={trip}
      />

      {/* Modal de Segurança / SOS */}
      <PassengerSafetyModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        tripId={trip.id}
      />
    </>
  );
}
