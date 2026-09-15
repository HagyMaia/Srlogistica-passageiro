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
import { PixPaymentModal } from '@/components/PixPaymentModal';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';

interface PassengerActiveRideSheetProps {
  trip: PassengerTrip;
  onCancel: () => void;
  onSendMessage?: (msg: string) => void;
}

export function PassengerActiveRideSheet({
  trip,
  onCancel,
  onSendMessage
}: PassengerActiveRideSheetProps) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const { chatMessages, unreadChatCount } = usePassengerTripStore();

  const driver = trip.driver;

  const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

  const getStatusDisplay = () => {
    switch (trip.status) {
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
        return {
          title: 'Motorista a caminho',
          subtitle: 'Deslocando-se até seu ponto de embarque',
          badge: 'A Caminho',
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
          subtitle: 'A caminho do seu destino com conforto e segurança',
          badge: 'Em Rota',
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
        };
      default:
        return {
          title: 'Corrida confirmada',
          subtitle: 'Acompanhe pelo mapa em tempo real',
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

        {/* Notificação Especial de Chegada no Local de Embarque */}
        {trip.status === 'DRIVER_ARRIVED' && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-3 flex items-center gap-3 animate-in fade-in">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shrink-0 shadow-md">
              <Car size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                Motorista chegou ao local!
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                Seu motorista está aguardando você no ponto de embarque.
              </p>
            </div>
          </div>
        )}

        {/* Card do Motorista e Veículo (Somente dados reais) */}
        {driver ? (
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-dark-950/60 p-3.5 border border-slate-100 dark:border-dark-800 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                {driver.avatar_url ? (
                  <img
                    src={driver.avatar_url}
                    alt={driver.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-brand shadow-sm shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-dark-800 border-2 border-brand flex items-center justify-center text-brand font-black text-base shrink-0">
                    {driver.name.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full bg-dark-900 px-1.5 py-0.5 text-[9px] font-bold text-brand border border-dark-700 shadow-sm">
                  <Star size={9} fill="#FFC800" />
                  {driver.rating || 4.95}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">{driver.name}</h3>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {driver.vehicle.brand} {driver.vehicle.model} {driver.vehicle.color ? `· ${driver.vehicle.color}` : ''}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="rounded-md bg-dark-900 px-1.5 py-0.5 font-mono text-[10px] font-black text-white border border-dark-700">
                    {driver.vehicle.plate}
                  </span>
                  {driver.total_rides > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {driver.total_rides} corridas
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Valor Final</span>
              <span className="text-sm font-black text-brand-700 dark:text-brand">
                {formatCurrency(trip.estimatedFare)}
              </span>
              {trip.paymentMethod === 'PIX' ? (
                <button
                  type="button"
                  onClick={() => setShowPixModal(true)}
                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full"
                >
                  PIX: 52.967.828/0001-17 📋
                </button>
              ) : (
                <span className="text-[9px] text-slate-400 font-semibold">
                  🏢 Voucher Quinzenal
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-dark-950/60 p-3.5 border border-slate-100 dark:border-dark-800">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-brand/20 flex items-center justify-center text-brand">
                <Car size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Motorista Designado</h3>
                <p className="text-xs text-slate-400">Carregando detalhes do veículo...</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Valor</span>
              <span className="text-base font-black text-brand-700 dark:text-brand">
                {formatCurrency(trip.estimatedFare)}
              </span>
            </div>
          </div>
        )}

        {/* Card Interativo de Notificação / Última Mensagem do Chat */}
        {lastMessage && driver && (
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

          {driver?.phone ? (
            <a
              href={`tel:${driver.phone}`}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 dark:bg-dark-800 p-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-700 transition active:scale-95 border border-slate-200/60 dark:border-dark-700/60"
            >
              <Phone size={18} className="text-emerald-500" />
              <span className="text-[11px] font-bold">Ligar</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 dark:bg-dark-800 p-2.5 text-slate-400 opacity-60 border border-slate-200/60 dark:border-dark-700/60">
              <Phone size={18} />
              <span className="text-[11px] font-bold">Ligar</span>
            </div>
          )}

          <button
            onClick={() => setShowSafetyModal(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-500/10 p-2.5 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition active:scale-95 border border-red-500/20"
          >
            <Shield size={18} className="text-red-500" />
            <span className="text-[11px] font-bold">SOS / Ajuda</span>
          </button>
        </div>

        {/* Resumo da Rota: Origem e Destino com endereços claros */}
        <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-dark-950/40 p-3 text-xs border border-slate-100 dark:border-dark-800">
          <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <MapPin size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Embarque</span>
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {trip.origin?.address || `${trip.origin?.latitude}, ${trip.origin?.longitude}`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-dark-800">
            <Navigation size={15} className="text-brand shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Destino</span>
              <p className="font-bold text-slate-900 dark:text-white truncate">
                {trip.destination?.address || `${trip.destination?.latitude}, ${trip.destination?.longitude}`}
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Cancelamento */}
        {trip.status !== 'IN_PROGRESS' && (
          <div className="pt-0.5">
            <button
              onClick={onCancel}
              className="w-full text-center py-2 text-xs font-bold text-red-500/80 hover:text-red-600 transition"
            >
              Cancelar Viagem
            </button>
          </div>
        )}
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

      {/* Modal de Pagamento PIX Oficial */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        amount={trip.estimatedFare}
        tripId={trip.id}
      />
    </>
  );
}
