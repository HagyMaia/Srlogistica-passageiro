'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  Sparkles,
  Navigation,
  Globe,
  MessageSquare,
  Clock,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Button, Input, Field, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingApprovalUser, setPendingApprovalUser] = useState<{ email: string; name: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setPendingApprovalUser(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMsg(error.message || 'Falha ao autenticar. Verifique suas credenciais.');
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Verifica se o cadastro está com aprovação pendente no banco
        try {
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profData) {
            const isApproved = profData.is_approved ?? profData.approved ?? (profData.status === 'active' || profData.status === 'approved' || false);
            if (!isApproved && profData.status === 'pending') {
              setPendingApprovalUser({
                email: profData.email || email,
                name: profData.name || profData.nome || 'Passageiro'
              });
              setLoading(false);
              return;
            }
          }
        } catch (_) {}
      }

      window.location.href = '/mapa';
    } catch {
      setErrorMsg('Erro inesperado ao conectar.');
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      await supabase.auth.signInWithPassword({
        email: 'passageiro@demo.local',
        password: 'demo123'
      });
      window.location.href = '/mapa';
    } catch {
      setErrorMsg('Falha ao entrar como passageiro demo.');
      setLoading(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Sou o passageiro ${pendingApprovalUser?.name || 'Novo Usuário'} (${pendingApprovalUser?.email || email}) e gostaria de verificar a aprovação da minha conta no painel administrativo.`
  );

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6 bg-slate-50 dark:bg-dark-950">
      {/* Topo / Marca */}
      <div className="pt-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-dark-950 font-black shadow-lg shadow-brand/30">
            <Navigation size={22} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-brand-700 dark:text-brand">
            SR Logística
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          App do Passageiro
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Solicite corridas imediatas ou agendadas com motoristas parceiros em Manaus.
        </p>
      </div>

      {/* Formulário de Login */}
      <div className="my-auto py-4">
        {/* Aviso caso a conta esteja pendente de aprovação no Admin */}
        {pendingApprovalUser && (
          <div className="mb-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Cadastro em Análise
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Sua conta está em processo de verificação. Para liberação imediata, entre em contato direto pelo WhatsApp com nossa central:
            </p>
            <div className="space-y-1.5 pt-1">
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 p-2.5 text-xs font-black text-white shadow transition"
              >
                <MessageSquare size={15} />
                Liberar pelo WhatsApp: {SR_SUPPORT_CONFIG.phone1}
              </a>
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-dark-800 border border-slate-300 dark:border-dark-700 p-2.5 text-xs font-black text-slate-800 dark:text-white hover:bg-slate-50 transition"
              >
                <MessageSquare size={15} className="text-emerald-500" />
                WhatsApp Suporte: {SR_SUPPORT_CONFIG.phone2}
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <Field label="E-mail">
            <div className="relative">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="pl-10"
              />
              <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

          <Field label="Senha">
            <div className="relative">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
              />
              <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

          <Button type="submit" size="xl" full disabled={loading} className="mt-2">
            {loading ? 'Entrando...' : 'Entrar no App'} <ArrowRight size={18} />
          </Button>
        </form>

        {/* Divisor */}
        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-dark-800" />
          </div>
          <span className="relative bg-slate-50 dark:bg-dark-950 px-3 text-[10px] font-bold uppercase text-slate-400">
            Acesso Rápido de Teste
          </span>
        </div>

        {/* Botão Acesso Rápido Demo */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 p-3 text-xs font-black text-slate-900 dark:text-brand hover:bg-brand/20 transition active:scale-98"
        >
          <Sparkles size={16} className="text-brand-600 dark:text-brand" />
          Entrar como Passageiro Aprovado (Demo 1 Clique)
        </button>
      </div>

      {/* Rodapé / Link Cadastro & Site Oficial */}
      <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-dark-800/60 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Não tem uma conta de passageiro?{' '}
          <Link href="/cadastro" className="font-bold text-brand-700 dark:text-brand hover:underline">
            Cadastre-se grátis
          </Link>
        </p>

        <div>
          <a
            href={SR_SUPPORT_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-brand transition"
          >
            <Globe size={13} /> {SR_SUPPORT_CONFIG.websiteUrl} <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
