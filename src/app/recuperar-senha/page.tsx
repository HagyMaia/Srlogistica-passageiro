'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Navigation,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Globe,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const redirectUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/redefinir-senha`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        setErrorMsg(error.message || 'Não foi possível enviar o e-mail de recuperação.');
        setLoading(false);
        return;
      }

      setSentSuccess(true);
    } catch {
      setErrorMsg('Erro inesperado ao solicitar recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#070D18] text-white select-none overflow-x-hidden p-4 sm:p-6 md:p-8">
      {/* Glow de Fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Topo / Voltar ao Login */}
      <header className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto flex items-center justify-between pb-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition active:scale-95 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <ArrowLeft size={14} />
          <span>Login</span>
        </Link>

        <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest">
          SR LOGÍSTICA
        </span>
      </header>

      {/* Card de Recuperação de Senha */}
      <main className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto my-auto bg-[#0B1220]/95 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {sentSuccess ? (
          <div className="text-center space-y-5 animate-in fade-in">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Instruções Enviadas!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                Enviamos um link de redefinição de senha para:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 font-bold text-xs truncate max-w-xs mx-auto">
                {email}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Verifique sua caixa de entrada e também a pasta de spam. Clique no link recebido para criar sua nova senha.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <Link href="/login" className="block">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-amber-400 text-dark-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition"
                >
                  <span>Voltar para o Login</span>
                  <ArrowRight size={18} />
                </button>
              </Link>

              <button
                type="button"
                onClick={() => setSentSuccess(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Tentar outro e-mail
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Cabeçalho */}
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10 mb-1">
                <KeyRound size={24} className="stroke-[2.2]" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Recuperar Senha
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Informe o seu e-mail cadastrado para receber o link seguro de redefinição de senha.
              </p>
            </div>

            {/* Mensagem de Erro */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleResetRequest} className="space-y-4 text-left">
              <div className="space-y-1.5">
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

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-amber-400 text-dark-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                    <span>Enviando link...</span>
                  </div>
                ) : (
                  <>
                    <span>Enviar Link de Recuperação</span>
                    <ArrowRight size={18} className="stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-400">
                Lembrou sua senha?{' '}
                <Link
                  href="/login"
                  className="font-bold text-amber-400 hover:text-amber-300 hover:underline"
                >
                  Entrar agora
                </Link>
              </p>
            </div>
          </>
        )}
      </main>

      {/* Rodapé Oficial */}
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
