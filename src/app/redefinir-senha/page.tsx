'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  ArrowRight,
  Navigation,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';

export default function RedefinirSenhaPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem. Verifique e tente novamente.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        setErrorMsg(error.message || 'Falha ao atualizar a senha. O link pode ter expirado.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setErrorMsg('Erro inesperado ao redefinir a senha. Tente solicitar um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#070D18] text-white select-none overflow-x-hidden p-4 sm:p-6 md:p-8">
      {/* Glow de Fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Topo */}
      <header className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto flex items-center justify-between pb-4">
        <Link
          href="/login"
          className="text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
        >
          Login
        </Link>

        <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest">
          SR LOGÍSTICA
        </span>
      </header>

      {/* Card Principal */}
      <main className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto my-auto bg-[#0B1220]/95 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {success ? (
          <div className="text-center space-y-5 animate-in fade-in">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Senha Atualizada!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                Sua senha foi redefinida com sucesso no sistema da SR Logística.
              </p>
            </div>

            <div className="pt-2">
              <Link href="/login" className="block">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-amber-400 text-dark-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition"
                >
                  <span>Entrar com a Nova Senha</span>
                  <ArrowRight size={18} />
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10 mb-1">
                <KeyRound size={24} className="stroke-[2.2]" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Criar Nova Senha
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Digite sua nova senha de acesso abaixo para atualizar sua conta.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nova Senha (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
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
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-12 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                  />
                  <Lock className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                    <span>Salvando nova senha...</span>
                  </div>
                ) : (
                  <>
                    <span>Redefinir e Salvar Senha</span>
                    <ArrowRight size={18} className="stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>

      {/* Rodapé */}
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
