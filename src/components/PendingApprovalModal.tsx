'use client';

import { useState } from 'react';
import {
  Clock,
  MessageSquare,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SR_SUPPORT_CONFIG } from '@/types';
import { useAuth } from '@/lib/auth';

interface PendingApprovalModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function PendingApprovalModal({ isOpen, onClose }: PendingApprovalModalProps) {
  const { profile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setChecking(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 1200);
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Acabei de me cadastrar no App SR Passageiro (${profile?.name || 'Novo Usuário'}, e-mail: ${profile?.email || ''}) e gostaria de solicitar a aprovação do meu perfil.`
  );

  return (
    <div className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center bg-dark-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-white dark:bg-dark-900 p-6 shadow-2xl space-y-5 animate-slideUp">
        {/* Topo do Modal */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-lg">
              <Clock size={32} />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-dark-950 shadow">
              <Lock size={12} />
            </div>
          </div>

          <div>
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-bold mb-1">
              Aprovação Obrigatória
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Cadastro em Análise
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Para sua segurança e conformidade operacional, todo novo cadastro passa por verificação antes da primeira viagem.
            </p>
          </div>
        </div>

        {/* Detalhes do Usuário */}
        <div className="rounded-2xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200/70 dark:border-dark-800 p-3.5 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400 font-semibold">Nome:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{profile?.name || 'Passageiro'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-semibold">E-mail:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{profile?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-semibold">Status:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">Aguardando Validação</span>
          </div>
        </div>

        {/* Informação sobre a Liberação */}
        <div className="rounded-2xl bg-brand/10 dark:bg-brand/10 border border-brand/30 p-3.5 text-[11px] text-slate-700 dark:text-slate-300">
          <p className="font-semibold mb-1">
            ⚡ <strong>Como acelerar sua liberação:</strong>
          </p>
          <p>
            Nossa equipe analisa novos cadastros continuamente. Envie uma mensagem rápida no WhatsApp abaixo para ter sua conta liberada imediatamente.
          </p>
        </div>

        {/* Botões WhatsApp de Liberação Imediata */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
            Solicitar Aprovação Imediata no Suporte
          </span>

          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 p-3 text-xs font-black text-white shadow-md transition"
          >
            <MessageSquare size={16} />
            Liberar via WhatsApp: {SR_SUPPORT_CONFIG.phone1}
          </a>

          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 p-3 text-xs font-black text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-dark-750 transition"
          >
            <MessageSquare size={16} className="text-emerald-500" />
            WhatsApp Suporte 2: {SR_SUPPORT_CONFIG.phone2}
          </a>
        </div>

        {/* Ações Inferiores */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-dark-800">
          <Button
            variant="outline"
            size="md"
            full
            disabled={checking}
            onClick={handleRefresh}
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Verificando Aprovação...' : 'Já fui aprovado(a), Atualizar'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            full
            onClick={signOut}
            className="text-slate-400 hover:text-red-500 text-xs"
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
}
