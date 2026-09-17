'use client';

import { useState } from 'react';
import {
  Clock,
  MessageSquare,
  RefreshCw,
  Lock,
  Building,
  Briefcase,
  X,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SR_SUPPORT_CONFIG } from '@/types';
import { useAuth } from '@/lib/auth';

interface PendingApprovalModalProps {
  isOpen: boolean;
  onClose?: () => void;
  reason?: 'profile_update' | 'company_link' | 'new_registration' | 'general';
}

export function PendingApprovalModal({ isOpen, onClose, reason }: PendingApprovalModalProps) {
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

  const companyName = profile?.corporate_company || profile?.company || 'Não informada';
  const departmentName = profile?.department || 'Operações / Geral';

  const whatsappMessage = encodeURIComponent(
    `Olá Central SR Logística! Solicito a aprovação/homologação dos meus dados de perfil e vínculo corporativo no App Passageiro:\n\n• Nome: ${profile?.name || 'Passageiro'}\n• E-mail: ${profile?.email || ''}\n• Empresa: ${companyName}\n• Setor: ${departmentName}\n\nPoderiam verificar e liberar meu acesso?`
  );

  return (
    <div className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center bg-dark-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-white dark:bg-dark-900 p-6 shadow-2xl space-y-5 animate-slideUp relative">
        {/* Botão de Fechar se fornecido */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition"
            title="Fechar"
          >
            <X size={18} />
          </button>
        )}

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
              Aguardando aprovação
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Vínculo em Análise
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              As informações de perfil, empresa conveniada e faturamento corporativo passam por aprovação da administração.
            </p>
          </div>
        </div>

        {/* Detalhes do Usuário e Vínculo */}
        <div className="rounded-2xl bg-slate-50 dark:bg-dark-950/60 border border-slate-200/70 dark:border-dark-800 p-3.5 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-semibold">Passageiro:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{profile?.name || 'Passageiro'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-semibold">E-mail:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{profile?.email}</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-dark-800/80 pt-1.5">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Building size={12} className="text-brand" /> Empresa:
            </span>
            <span className="font-bold text-brand-700 dark:text-brand truncate max-w-[190px]">
              {companyName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Briefcase size={12} className="text-amber-500" /> Setor:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
              {departmentName}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-dark-800/80 pt-1.5">
            <span className="text-slate-400 font-semibold">Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <Clock size={11} /> Aguardando aprovação
            </span>
          </div>
        </div>

        {/* Informação sobre a Liberação */}
        <div className="rounded-2xl bg-brand/10 dark:bg-brand/10 border border-brand/30 p-3 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
          <p className="font-bold text-brand-800 dark:text-brand flex items-center gap-1">
            <ShieldCheck size={14} /> Validação pela Central SR Logística:
          </p>
          <p>
            Assim que a administração validar seu vínculo com a empresa conveniada, as viagens com <strong>Voucher Corporativo</strong> e recursos executivos serão ativados.
          </p>
        </div>

        {/* Botões WhatsApp de Liberação Imediata */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
            Aprovação Imediata via WhatsApp
          </span>

          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 p-3 text-xs font-black text-white shadow-md transition"
          >
            <MessageSquare size={16} />
            Aprovar com Suporte 1: {SR_SUPPORT_CONFIG.phone1}
          </a>

          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 p-3 text-xs font-black text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-dark-750 transition"
          >
            <MessageSquare size={16} className="text-emerald-500" />
            Aprovar com Suporte 2: {SR_SUPPORT_CONFIG.phone2}
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

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              full
              onClick={onClose}
              className="text-slate-600 dark:text-slate-300 text-xs"
            >
              Continuar no Modo Particular
            </Button>
          )}

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
