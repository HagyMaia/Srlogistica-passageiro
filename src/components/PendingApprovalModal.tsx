'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  MessageSquare,
  RefreshCw,
  Lock,
  Building,
  Briefcase,
  X,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Camera,
  ArrowRight
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { SR_SUPPORT_CONFIG } from '@/types';
import { useAuth } from '@/lib/auth';
import { DEFAULT_AVATAR_URL } from '@/lib/avatar-storage';

interface PendingApprovalModalProps {
  isOpen: boolean;
  onClose?: () => void;
  reason?: 'profile_update' | 'company_link' | 'new_registration' | 'photo_update' | 'general';
}

export function PendingApprovalModal({ isOpen, onClose, reason }: PendingApprovalModalProps) {
  const router = useRouter();
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

  const handleGoToProfile = () => {
    if (onClose) onClose();
    router.push('/perfil');
  };

  const isRejected =
    profile?.foto_status === 'Rejeitada' ||
    profile?.photo_status === 'rejected' ||
    profile?.status === 'blocked';

  const companyName = profile?.corporate_company || profile?.company || 'Não informada';
  const departmentName = profile?.department || 'Operações / Geral';
  const rejectionReason = profile?.motivo_rejeicao || profile?.rejection_reason || 'Foto fora do padrão exigido ou ilegível. Por favor, envie uma foto nítida e bem iluminada do seu rosto.';

  const whatsappMessage = encodeURIComponent(
    isRejected
      ? `Olá Central SR Logística! Minha foto/cadastro recebeu o apontamento: "${rejectionReason}". Gostaria de orientações para enviar a nova foto/documentação correta.\n\n• Nome: ${profile?.name || 'Passageiro'}\n• E-mail: ${profile?.email || ''}`
      : `Olá Central SR Logística! Solicito a aprovação/homologação da minha foto e cadastro no App Passageiro:\n\n• Nome: ${profile?.name || 'Passageiro'}\n• E-mail: ${profile?.email || ''}\n• Empresa: ${companyName}\n• Setor: ${departmentName}\n\nPoderiam verificar e liberar meu acesso?`
  );

  return (
    <div className="fixed inset-0 z-[1300] flex items-end sm:items-center justify-center bg-dark-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className={`w-full max-w-md rounded-3xl border ${isRejected ? 'border-red-500/40' : 'border-amber-500/30'} bg-white dark:bg-dark-900 p-6 shadow-2xl space-y-5 animate-slideUp relative max-h-[90vh] overflow-y-auto`}>
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
            {profile?.avatar_url && profile.avatar_url !== DEFAULT_AVATAR_URL ? (
              <img
                src={profile.avatar_url}
                alt="Foto do Passageiro"
                className={`h-16 w-16 rounded-3xl object-cover border-2 shadow-lg ${
                  isRejected ? 'border-red-500' : 'border-amber-500'
                }`}
              />
            ) : (
              <div className={`flex h-16 w-16 items-center justify-center rounded-3xl ${
                isRejected ? 'bg-red-500/15 text-red-600 border border-red-500/30' : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
              } shadow-lg`}>
                {isRejected ? <AlertCircle size={32} /> : <Clock size={32} />}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${
              isRejected ? 'bg-red-600 text-white' : 'bg-brand text-dark-950'
            } shadow`}>
              {isRejected ? <AlertCircle size={12} /> : <Lock size={12} />}
            </div>
          </div>

          <div>
            {isRejected ? (
              <>
                <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 text-[10px] font-black mb-1">
                  Foto / Documentação Não Aprovada
                </Badge>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Reenvio de Foto Necessário
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Sua foto ou documentação foi avaliada pela central e precisa ser reenviada conforme as orientações abaixo.
                </p>
              </>
            ) : (
              <>
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-bold mb-1">
                  Aguardando aprovação
                </Badge>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Foto e Cadastro em Análise
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Sua foto de perfil e dados cadastrais foram enviados para análise. O status permanecerá como <strong>"Aguardando aprovação"</strong> até homologação pelo administrador.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bloco Exclusivo de Rejeição com Motivo do Admin */}
        {isRejected && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 space-y-2 text-xs">
            <span className="font-bold text-red-700 dark:text-red-400 text-[11px] uppercase tracking-wider block">
              Motivo informado pelo Administrador:
            </span>
            <p className="text-slate-900 dark:text-slate-100 font-semibold italic bg-white dark:bg-dark-900 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
              "{rejectionReason}"
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-1">
              Para regularizar sua conta, clique no botão abaixo para acessar o perfil e enviar uma nova foto nítida e bem iluminada.
            </p>
          </div>
        )}

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
            <span className="text-slate-400 font-semibold">Status Atual:</span>
            <span className={`inline-flex items-center gap-1 font-bold ${
              isRejected ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isRejected ? <AlertCircle size={11} /> : <Clock size={11} />}
              {isRejected ? 'Foto Reprovada' : 'Aguardando aprovação'}
            </span>
          </div>
        </div>

        {/* Botão de Ação Direta para Reenviar Foto */}
        {isRejected && (
          <Button
            variant="primary"
            size="md"
            full
            onClick={handleGoToProfile}
            className="bg-red-600 hover:bg-red-700 text-white font-black py-3 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            <Camera size={18} /> Reenviar Foto no Perfil <ArrowRight size={16} />
          </Button>
        )}

        {/* Botões WhatsApp de Liberação Imediata */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
            {isRejected ? 'Suporte para Reenvio via WhatsApp' : 'Aprovação Imediata via WhatsApp'}
          </span>

          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 p-3 text-xs font-black text-white shadow-md transition"
          >
            <MessageSquare size={16} />
            Suporte 1: {SR_SUPPORT_CONFIG.phone1}
          </a>

          <a
            href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-700 p-3 text-xs font-black text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-dark-750 transition"
          >
            <MessageSquare size={16} className="text-emerald-500" />
            Suporte 2: {SR_SUPPORT_CONFIG.phone2}
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
            {checking ? 'Verificando Aprovação...' : 'Já foi aprovado? Atualizar Status'}
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              full
              onClick={onClose}
              className="text-slate-600 dark:text-slate-300 text-xs"
            >
              Fechar Janela
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
