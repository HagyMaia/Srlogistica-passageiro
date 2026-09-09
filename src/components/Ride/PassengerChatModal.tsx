'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Phone,
  Check,
  CheckCheck,
  Car,
  Star,
  Mic,
  Smile,
  ShieldCheck,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';

interface PassengerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: PassengerTrip;
}

const QUICK_REPLIES = [
  'Estou no local de embarque.',
  'Estou descendo pelo elevador.',
  'Já estou na portaria aguardando.',
  'Aguarde 2 minutinhos, por favor.',
  'Pode ligar o ar-condicionado?',
  'Estou com malas para o porta-malas.',
  'Estou de camisa azul / mochila.',
  'Carro prata, correto?'
];

export function PassengerChatModal({ isOpen, onClose, trip }: PassengerChatModalProps) {
  const { chatMessages, sendChatMessage, isDriverTyping, markChatAsRead } = usePassengerTripStore();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Rola para a última mensagem ao abrir ou quando nova mensagem chega
  useEffect(() => {
    if (isOpen) {
      markChatAsRead();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, chatMessages.length, isDriverTyping, markChatAsRead]);

  if (!isOpen) return null;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;
    setIsSending(true);
    setInputText('');
    try {
      await sendChatMessage(textToSend.trim());
    } finally {
      setIsSending(false);
    }
  };

  const getStatusSubtitle = () => {
    switch (trip.status) {
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
        return 'Motorista a caminho (~3 min)';
      case 'DRIVER_ARRIVED':
        return 'Motorista no ponto de embarque';
      case 'IN_PROGRESS':
        return 'Em viagem até o destino';
      default:
        return 'Online';
    }
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col h-[92vh] sm:h-[620px] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 shadow-2xl overflow-hidden">
        {/* Header do Chat com Info do Motorista */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-dark-800 bg-slate-50/90 dark:bg-dark-950/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={driver.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                alt={driver.name}
                className="h-11 w-11 rounded-2xl object-cover border-2 border-brand"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-900" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[170px]">
                  {driver.name}
                </h3>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                  <Star size={10} fill="currentColor" /> {driver.rating}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {driver.vehicle.model} · {driver.vehicle.color} · <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{driver.vehicle.plate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${driver.phone}`}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95"
              title="Ligar para motorista"
            >
              <Phone size={17} />
            </a>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status da Corrida */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-brand/10 dark:bg-brand/15 border-b border-brand/20 text-[11px] font-bold text-brand-900 dark:text-brand">
          <div className="flex items-center gap-1.5">
            <Car size={13} />
            <span>{getStatusSubtitle()}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Chat Seguro SR</span>
          </div>
        </div>

        {/* Lista de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-dark-950/40">
          <div className="flex justify-center my-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/60 dark:bg-dark-800/80 px-2.5 py-1 rounded-full">
              Início do Chat • Corrida #{trip.id.substring(trip.id.length - 6)}
            </span>
          </div>

          {chatMessages.map((msg) => {
            const isMe = msg.sender === 'passenger';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs ${
                    isMe
                      ? 'bg-brand text-dark-950 font-semibold rounded-br-none'
                      : 'bg-white dark:bg-dark-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/70 dark:border-dark-700/70'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>

                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  {isMe && (
                    <CheckCheck size={12} className="text-brand-600 dark:text-brand font-bold" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicador de Motorista Digitando */}
          {isDriverTyping && (
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1 bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300">
                  {driver.name.split(' ')[0]} está digitando
                </span>
                <div className="flex gap-1 ml-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Respostas Rápidas (Quick Replies) */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-dark-800/80 bg-white dark:bg-dark-900 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {QUICK_REPLIES.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(reply)}
                className="rounded-xl px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-brand/20 hover:text-brand-800 dark:hover:text-brand border border-slate-200/60 dark:border-dark-700/60 transition active:scale-95"
              >
                💬 {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de Digitação */}
        <div className="p-3 bg-white dark:bg-dark-900 border-t border-slate-100 dark:border-dark-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem para o motorista..."
              className="flex-1 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800/80 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
            />

            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!inputText.trim() || isSending}
              className="rounded-2xl h-10 w-10 p-0 flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
