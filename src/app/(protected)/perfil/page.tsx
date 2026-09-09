'use client';

import { useState } from 'react';
import {
  User,
  Star,
  Shield,
  HelpCircle,
  LogOut,
  Save,
  CheckCircle2,
  ChevronRight,
  Globe,
  ExternalLink,
  Clock
} from 'lucide-react';
import { Button, Input, Field, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { SupportModal } from '@/components/SupportModal';
import { PendingApprovalModal } from '@/components/PendingApprovalModal';
import { SR_SUPPORT_CONFIG } from '@/types';

export default function PerfilPage() {
  const { profile, updateProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.name || 'Ana Clara Souza');
  const [phone, setPhone] = useState(profile?.phone || '(92) 99123-4567');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({ name, phone });
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isApproved = profile?.is_approved !== false && profile?.status !== 'pending';

  return (
    <div className="flex flex-col min-h-dvh p-5 space-y-5 pb-24">
      {/* Header */}
      <div className="pt-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          <User size={14} /> Conta
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Meu Perfil</h1>
      </div>

      {/* Card do Perfil do Passageiro */}
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm">
        <div className="relative">
          <img
            src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt="Avatar"
            className="h-16 w-16 rounded-3xl object-cover border-2 border-brand"
          />
          <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full bg-dark-900 px-2 py-0.5 text-[10px] font-bold text-brand border border-dark-700">
            <Star size={10} fill="#FFC800" /> {profile?.rating || 4.95}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
              {profile?.name || 'Passageiro SR'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {isApproved ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                ✓ Conta Aprovada
              </Badge>
            ) : (
              <button
                onClick={() => setIsPendingModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold"
              >
                <Clock size={10} /> Pendente de Aprovação
              </button>
            )}
            <span className="text-[10px] text-slate-400">
              {profile?.total_rides || 48} viagens
            </span>
          </div>
        </div>
      </div>

      {/* Formulário de Edição de Dados */}
      <form
        onSubmit={handleSave}
        className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 space-y-3.5 shadow-sm"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Dados Pessoais
        </span>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={16} />
            <span>Perfil atualizado com sucesso!</span>
          </div>
        )}

        <Field label="Nome Completo">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </Field>

        <Field label="Telefone de Contato">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(92) 99999-9999"
          />
        </Field>

        <Field label="E-mail (Cadastrado)">
          <Input
            disabled
            value={profile?.email || ''}
            className="opacity-70 bg-slate-100 dark:bg-dark-900/40 cursor-not-allowed"
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="md"
          full
          disabled={isSaving}
          className="mt-2"
        >
          <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>

      {/* Opções Gerais, Suporte & Site Oficial */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-2 space-y-1 shadow-sm text-xs">
        <button
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-700/50 transition"
        >
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold">
            <HelpCircle size={18} className="text-blue-500" />
            <div className="text-left">
              <span>Central de Suporte e Ajuda</span>
              <p className="text-[10px] text-slate-400 font-normal">
                {SR_SUPPORT_CONFIG.phone1} / {SR_SUPPORT_CONFIG.phone2}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <a
          href={SR_SUPPORT_CONFIG.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-700/50 transition"
        >
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold">
            <Globe size={18} className="text-emerald-500" />
            <div className="text-left">
              <span>Site Oficial SR Logística</span>
              <p className="text-[10px] text-slate-400 font-normal">
                srlogisticatrasporte.vercel.app
              </p>
            </div>
          </div>
          <ExternalLink size={16} className="text-slate-400" />
        </a>

        <button
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-700/50 transition"
        >
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold">
            <Shield size={18} className="text-brand-600 dark:text-brand" />
            <span>Privacidade e Segurança</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Botão Sair da Conta */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        full
        onClick={signOut}
        className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
      >
        <LogOut size={16} /> Sair da Conta
      </Button>

      {/* Modais de Suporte e Aprovação */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <PendingApprovalModal isOpen={isPendingModalOpen} onClose={() => setIsPendingModalOpen(false)} />
    </div>
  );
}
