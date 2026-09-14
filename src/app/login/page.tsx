'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  Navigation,
  Globe,
  MessageSquare,
  Clock,
  ExternalLink,
  Zap,
  Fingerprint,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { Button, Input, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';
import { useAuth } from '@/lib/auth';
import {
  isBiometricsSupported,
  isBiometricsEnrolled,
  getBiometricUser,
  authenticateWithBiometrics,
  enrollBiometrics,
  BiometricUserInfo
} from '@/lib/biometrics';

export default function LoginPage() {
  const router = useRouter();
  const { loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingApprovalUser, setPendingApprovalUser] = useState<{ email: string; name: string } | null>(null);

  const [hasBiometricsSupport, setHasBiometricsSupport] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricUser, setBiometricUser] = useState<BiometricUserInfo | null>(null);

  useEffect(() => {
    async function checkBio() {
      const supported = await isBiometricsSupported();
      const enrolled = isBiometricsEnrolled();
      const bioUser = getBiometricUser();

      setHasBiometricsSupport(supported);
      setIsEnrolled(enrolled);
      setBiometricUser(bioUser);

      if (bioUser?.email) {
        setEmail(bioUser.email);
      }
    }
    checkBio();
  }, []);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setErrorMsg(null);

    try {
      if (isEnrolled && biometricUser) {
        // Usuário já cadastrado no aparelho: valida a biometria nativa
        const authenticatedUser = await authenticateWithBiometrics();
        await loginAsGuest({
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.name || 'Passageiro SR'
        });
        window.location.href = '/';
      } else {
        // Primeira vez com biometria: se já tiver e-mail preenchido, cadastra no aparelho
        const targetEmail = email || 'passageiro@srlogistica.com.br';
        await enrollBiometrics({
          id: `passenger-${Date.now()}`,
          email: targetEmail,
          name: targetEmail.split('@')[0]
        });
        await loginAsGuest({ email: targetEmail });
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível validar a biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    await loginAsGuest();
    window.location.href = '/';
  };

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
        // Se o aparelho suportar biometria e ainda não estiver cadastrado, cadastra em segundo plano
        if (hasBiometricsSupport && !isEnrolled) {
          try {
            await enrollBiometrics({
              id: data.user.id,
              email: data.user.email || email,
              name: data.user.user_metadata?.name || email.split('@')[0]
            });
          } catch (_) {}
        }

        // Verifica se o cadastro está com aprovação pendente no banco
        try {
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const { data: passData } = await supabase
            .from('passageiros')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const passStatus = passData?.status;
          const profStatus = profData?.status;
          const isApproved = 
            passStatus === 'Aprovado' || 
            profData?.is_approved === true || 
            profData?.approved === true || 
            profStatus === 'active' || 
            profStatus === 'approved';

          if (!isApproved && (passStatus === 'Pendente' || profStatus === 'pending')) {
            setPendingApprovalUser({
              email: passData?.email || profData?.email || email,
              name: passData?.nome_social || passData?.nome || profData?.name || profData?.nome || 'Passageiro'
            });
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      window.location.href = '/';
    } catch {
      setErrorMsg('Erro inesperado ao conectar.');
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

        {/* Card de Entrada por Digital / Biometria (Destaque Principal) */}
        {(isEnrolled || hasBiometricsSupport) && (
          <div className="mb-5 rounded-3xl border border-brand/40 bg-gradient-to-b from-brand/10 to-transparent p-4 text-center shadow-lg shadow-brand/5 space-y-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-dark-950 shadow-md shadow-brand/30">
                <Fingerprint size={32} className="stroke-[2.2]" />
                <span className="absolute inset-0 rounded-2xl border-2 border-brand animate-ping opacity-25" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isEnrolled ? `Olá, ${biometricUser?.name || biometricUser?.email?.split('@')[0] || 'Passageiro'}` : 'Entrada por Biometria'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEnrolled
                    ? 'Acesse o app com sua impressão digital ou Face ID'
                    : 'Toque para ativar o acesso rápido por digital neste aparelho'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || loading}
              className="flex w-full items-center justify-center gap-2.5 h-12 px-4 rounded-2xl bg-brand hover:bg-brand-400 text-dark-950 font-black text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              <Fingerprint size={20} className="stroke-[2.5]" />
              <span>{biometricLoading ? 'Lendo Biometria...' : isEnrolled ? 'Entrar com Digital / Face ID' : 'Ativar e Entrar com Digital'}</span>
            </button>
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

          <Button type="submit" size="xl" full disabled={loading || biometricLoading} className="mt-2">
            {loading ? 'Entrando...' : 'Entrar com Senha'} <ArrowRight size={18} />
          </Button>

          {/* Botão de Acesso Rápido Direto */}
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={loading || biometricLoading}
            className="flex w-full items-center justify-center gap-2 h-11 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-900 dark:text-amber-300 font-black text-xs shadow-sm transition active:scale-[0.98]"
          >
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span>⚡ Acesso Rápido Executivo</span>
          </button>
        </form>
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
