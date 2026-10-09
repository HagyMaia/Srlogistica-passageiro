'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Globe,
  MessageSquare,
  Clock,
  ExternalLink,
  Fingerprint,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';
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
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
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
    setInfoMsg(null);

    try {
      if (isEnrolled && biometricUser) {
        // Usuário já cadastrado no aparelho: valida a biometria nativa
        const authenticatedUser = await authenticateWithBiometrics();
        if (authenticatedUser?.email) {
          setEmail(authenticatedUser.email);
        }

        // Verifica se há sessão ativa e válida no Supabase
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          window.location.href = '/';
          return;
        }

        // Se a sessão expirou, orienta o usuário a inserir a senha para revalidar com o servidor
        setInfoMsg('Biometria validada com sucesso! Digite sua senha uma única vez para revalidar a sessão com o servidor.');
        if (passwordInputRef.current) {
          passwordInputRef.current.focus();
        }
      } else {
        setErrorMsg('Para habilitar a biometria no aparelho, faça seu primeiro login com e-mail e senha.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível validar a biometria.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setPendingApprovalUser(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        const errText = (error.message || '').toLowerCase();
        if (errText.includes('invalid login credentials') || errText.includes('invalid_credentials')) {
          setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais.');
        } else if (errText.includes('email not confirmed')) {
          setErrorMsg('E-mail ainda não confirmado. Verifique o link enviado na sua caixa de entrada.');
        } else {
          setErrorMsg(error.message || 'Falha ao autenticar. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Se o aparelho suportar biometria e ainda não estiver cadastrado, cadastra em segundo plano
        if (hasBiometricsSupport && !isEnrolled) {
          try {
            await enrollBiometrics({
              id: data.user.id,
              email: data.user.email || cleanEmail,
              name: data.user.user_metadata?.name || cleanEmail.split('@')[0]
            });
          } catch (_) {}
        }

        // Verifica se o cadastro está com aprovação pendente no banco
        try {
          let profData: any = null;
          const { data: prById } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          profData = prById;
          if (!profData && data.user.email) {
            const { data: prByEmail } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', data.user.email)
              .maybeSingle();
            profData = prByEmail;
          }

          let passData: any = null;
          const { data: pById } = await supabase
            .from('passageiros')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          passData = pById;
          if (!passData && data.user.email) {
            const { data: pByEmail } = await supabase
              .from('passageiros')
              .select('*')
              .eq('email', data.user.email)
              .maybeSingle();
            passData = pByEmail;
          }

          // Se o usuário não existe na tabela passageiros, cadastra automaticamente como Pendente
          if (!passData && data.user.email) {
            try {
              const newPass = {
                id: data.user.id,
                nome: data.user.user_metadata?.name || data.user.user_metadata?.nome || data.user.email.split('@')[0],
                nome_social: (data.user.user_metadata?.name || data.user.user_metadata?.nome || data.user.email.split('@')[0]).split(' ')[0],
                nome_completo: data.user.user_metadata?.name || data.user.user_metadata?.nome || data.user.email.split('@')[0],
                cpf: data.user.user_metadata?.cpf || 'Não informado',
                telefone: data.user.user_metadata?.phone || data.user.user_metadata?.telefone || '',
                email: data.user.email,
                empresa: data.user.user_metadata?.company || data.user.user_metadata?.empresa || 'Passageiro',
                setor: data.user.user_metadata?.department || data.user.user_metadata?.setor || 'Operações / Geral',
                matricula: 'App Passageiro',
                turno: 'Turno Comercial',
                origem: 'App Passageiro',
                status: 'Pendente',
                created_at: new Date().toISOString()
              };
              await supabase.from('passageiros').insert([newPass]);
              passData = newPass;
            } catch (_) {}
          }

          const passStatus = passData?.status;
          const profStatus = profData?.status;
          const userMeta = data.user.user_metadata || {};
          const isApproved =
            passStatus === 'Aprovado' ||
            passStatus === 'aprovado' ||
            passStatus === 'active' ||
            profData?.is_approved === true ||
            profData?.approved === true ||
            profStatus === 'active' ||
            profStatus === 'approved' ||
            userMeta.is_approved === true ||
            userMeta.role === 'admin';

          if (!isApproved && (passStatus === 'Pendente' || passStatus === 'Reprovado' || profStatus === 'pending' || !profStatus)) {
            setPendingApprovalUser({
              email: passData?.email || profData?.email || data.user.email || cleanEmail,
              name: passData?.nome_social || passData?.nome || profData?.name || profData?.nome || userMeta.name || 'Passageiro'
            });
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      window.location.href = '/';
    } catch {
      setErrorMsg('Erro inesperado ao conectar ao servidor. Tente novamente.');
      setLoading(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Sou o passageiro ${pendingApprovalUser?.name || 'Novo Usuário'} (${pendingApprovalUser?.email || email}) e gostaria de verificar a aprovação da minha conta no painel administrativo.`
  );

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#070D18] text-white select-none overflow-x-hidden p-4 sm:p-6 md:p-8">
      {/* Efeito de Iluminação de Fundo Amber Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Barra Superior / Voltar ao Início */}
      <header className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto flex items-center justify-between pb-4">
        <Link
          href="/welcome"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition active:scale-95 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <ArrowLeft size={14} />
          <span>Início</span>
        </Link>

        <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest">
          SR LOGÍSTICA
        </span>
      </header>

      {/* Card Central de Login Responsivo */}
      <main className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto my-auto bg-[#0B1220]/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Topo do Formulário */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-dark-950 font-black shadow-lg shadow-amber-500/30 mb-1">
            <Navigation size={24} className="stroke-[2.5]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            App do Passageiro
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Acesse sua conta para viagens corporativas e particulares em Manaus.
          </p>
        </div>

        {/* Aviso de Cadastro Pendente no Painel Admin com Botões WhatsApp */}
        {pendingApprovalUser && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-400 shrink-0" />
              <span className="text-xs font-black text-white">
                Cadastro em Análise Operacional
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Sua conta foi registrada e está aguardando liberação. Para agilizar a ativação imediata, fale diretamente com nossa central no WhatsApp:
            </p>
            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 p-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
              >
                <MessageSquare size={15} />
                <span>Liberar com Central 1: {SR_SUPPORT_CONFIG.phone1}</span>
              </a>
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 p-2.5 text-xs font-black text-white hover:bg-slate-800 transition active:scale-95"
              >
                <MessageSquare size={15} className="text-emerald-400" />
                <span>WhatsApp Suporte: {SR_SUPPORT_CONFIG.phone2}</span>
              </a>
            </div>
          </div>
        )}

        {/* Card de Entrada por Biometria / Digital */}
        {(isEnrolled || hasBiometricsSupport) && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent p-4 text-center space-y-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-dark-950 shadow-md shadow-amber-500/30">
                <Fingerprint size={26} className="stroke-[2.2]" />
                <span className="absolute inset-0 rounded-xl border border-amber-400 animate-ping opacity-25" />
              </div>

              <div className="text-left flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {isEnrolled
                    ? `Olá, ${biometricUser?.name || biometricUser?.email?.split('@')[0] || 'Passageiro'}`
                    : 'Entrada por Biometria'}
                </h3>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {isEnrolled
                    ? 'Toque para acessar com digital ou Face ID'
                    : 'Ative a impressão digital neste aparelho'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || loading}
              className="flex w-full items-center justify-center gap-2 h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-black text-xs sm:text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              <Fingerprint size={18} className="stroke-[2.5]" />
              <span>
                {biometricLoading
                  ? 'Lendo Biometria...'
                  : isEnrolled
                  ? 'Entrar com Digital / Face ID'
                  : 'Ativar Acesso por Digital'}
              </span>
            </button>
          </div>
        )}

        {/* Mensagens de Alerta ou Informação */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-medium text-amber-300">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Formulário Tradicional de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Campo E-mail */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-300">
              E-mail cadastrado
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
              />
              <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
            </div>
          </div>

          {/* Campo Senha com Toggle Ver/Ocultar e Link de Recuperação */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                Senha de acesso
              </label>
              <Link
                href="/recuperar-senha"
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline transition"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-12 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
              />
              <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botão de Submissão Principal */}
          <button
            type="submit"
            disabled={loading || biometricLoading}
            className="flex w-full items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-amber-400 text-dark-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                <span>Entrando...</span>
              </div>
            ) : (
              <>
                <span>Entrar no Aplicativo</span>
                <ArrowRight size={18} className="stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Divisor / Criar Conta */}
        <div className="pt-2 border-t border-slate-800/80 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Ainda não tem conta de passageiro?{' '}
            <Link
              href="/cadastro"
              className="font-bold text-amber-400 hover:text-amber-300 hover:underline"
            >
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </main>

      {/* Rodapé Oficial da Empresa */}
      <footer className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto pt-4 text-center space-y-2">
        <div>
          <a
            href={SR_SUPPORT_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-amber-400 transition"
          >
            <Globe size={13} />
            <span>{SR_SUPPORT_CONFIG.websiteUrl}</span>
            <ExternalLink size={10} />
          </a>
        </div>
        <div className="text-[10px] text-slate-600 font-medium">
          SR Logística & Transporte Corporativo • Manaus - AM
        </div>
      </footer>
    </div>
  );
}
