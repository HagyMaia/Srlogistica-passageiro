'use client';

import { useState } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  Share2,
  Copy,
  Check,
  X,
  MessageSquare,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui';
import { SR_SUPPORT_CONFIG } from '@/types';

interface PassengerSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
}

export function PassengerSafetyModal({ isOpen, onClose, tripId }: PassengerSafetyModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShareTrip = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/corridas` : '';
    if (navigator.share) {
      navigator.share({
        title: 'Acompanhe minha viagem na SR Logística',
        text: 'Estou em trânsito com segurança na SR Logística Manaus. Acompanhe minha corrida:',
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl border border-red-500/40 bg-white dark:bg-dark-900 shadow-2xl overflow-hidden space-y-0">
        {/* Header de Alerta */}
        <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert size={22} className="animate-pulse" />
            <h3 className="font-black text-base">Central de Segurança SR</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Sua segurança é nossa prioridade absoluta. Em caso de emergência ou ocorrência, utilize os botões rápidos abaixo:
          </p>

          {/* Botão Chamar Polícia 190 */}
          <a
            href={`tel:${SR_SUPPORT_CONFIG.emergencyPolice}`}
            className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition active:scale-98 shadow-lg shadow-red-600/30"
          >
            <div className="flex items-center gap-3">
              <PhoneCall size={20} />
              <div className="text-left">
                <div className="text-sm font-black">Ligar para Polícia (190)</div>
                <div className="text-[10px] text-red-100 font-normal">Emergência e risco iminente</div>
              </div>
            </div>
            <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md">190</span>
          </a>

          {/* Botão Compartilhar Viagem */}
          <button
            onClick={handleShareTrip}
            className="flex items-center justify-between w-full p-3.5 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-slate-100 font-bold hover:bg-slate-100 dark:hover:bg-dark-700 transition active:scale-98"
          >
            <div className="flex items-center gap-3">
              <Share2 size={20} className="text-brand-600 dark:text-brand" />
              <div className="text-left">
                <div className="text-sm font-black">Compartilhar Rota ao Vivo</div>
                <div className="text-[10px] text-slate-400 font-normal">Envie status para amigos e família</div>
              </div>
            </div>
            {copied ? (
              <span className="text-xs text-emerald-500 flex items-center gap-1 font-semibold"><Check size={14} /> Copiado</span>
            ) : (
              <Copy size={16} className="text-slate-400" />
            )}
          </button>

          {/* Central de Suporte SR 1 */}
          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=Emerg%C3%AAncia%20ou%20ocorr%C3%AAncia%20na%20viagem%20SR%20Log%C3%ADstica`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-slate-800 dark:text-slate-100 font-bold hover:bg-emerald-500/20 transition"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className="text-emerald-500" />
              <div className="text-left">
                <div className="text-xs font-black">Suporte Plantão: {SR_SUPPORT_CONFIG.phone1}</div>
                <div className="text-[10px] text-slate-400 font-normal">Falar no WhatsApp da Central</div>
              </div>
            </div>
          </a>

          {/* Central de Suporte SR 2 */}
          <a
            href={`tel:+${SR_SUPPORT_CONFIG.phone2Raw}`}
            className="flex items-center justify-between w-full p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-800 text-slate-800 dark:text-slate-100 font-bold hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-3">
              <PhoneCall size={18} className="text-amber-500" />
              <div className="text-left">
                <div className="text-xs font-black">Suporte Operacional: {SR_SUPPORT_CONFIG.phone2}</div>
                <div className="text-[10px] text-slate-400 font-normal">Ligação telefônica direta</div>
              </div>
            </div>
          </a>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-dark-950 border-t border-slate-100 dark:border-dark-800 flex justify-end">
          <Button variant="ghost" size="sm" full onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
