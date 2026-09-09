'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Navigation,
  CheckCircle,
  ShieldCheck,
  Clock,
  MessageSquare,
  Globe,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Button, Input, Field, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: nome,
            nome: nome,
            telefone: telefone,
            phone: telefone,
            role: 'passenger',
            status: 'pending',
            is_approved: false
          }
        }
      });

      if (error) {
        setErrorMsg(error.message || 'Não foi possível concluir seu cadastro.');
        setLoading(false);
        return;
      }

      // Se o usuário foi criado com sucesso, insere na tabela de perfis com status pendente
      if (data?.user) {
        try {
          await supabase.from('profiles').insert({
            id: data.user.id,
            name: nome,
            email: email,
            phone: telefone,
            role: 'passenger',
            status: 'pending',
            is_approved: false,
            created_at: new Date().toISOString()
          });
        } catch (_) {}
      }

      setRegisteredSuccess(true);
    } catch {
      setErrorMsg('Erro inesperado ao criar conta.');
      setLoading(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Acabei de me cadastrar no App SR Passageiro (${nome}, e-mail: ${email}) e gostaria de solicitar a aprovação da minha conta no painel admin.`
  );

  if (registeredSuccess) {
    return (
      <div className="flex min-h-dvh flex-col justify-between p-6 bg-slate-50 dark:bg-dark-950">
        <div className="pt-6 text-center space-y-4 my-auto">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-lg">
            <Clock size={32} />
          </div>

          <div>
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-xs font-bold mb-2">
              Aprovação de Cadastro
            </Badge>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Cadastro Realizado!
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              Seu cadastro foi registrado com sucesso. Para segurança de todos os usuários, novas contas passam por uma rápida verificação antes do primeiro acesso.
            </p>
          </div>

          {/* Card de Agilização via WhatsApp */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-400">
              <Sparkles size={16} />
              <span>Deseja aprovação rápida agora?</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Clique em um dos números da nossa central de atendimento para enviar sua solicitação de liberação instantânea:
            </p>

            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 p-3 text-xs font-black text-white shadow-md transition"
              >
                <MessageSquare size={16} />
                Liberar via WhatsApp 1: {SR_SUPPORT_CONFIG.phone1}
              </a>

              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-dark-800 border border-emerald-500/40 p-3 text-xs font-black text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-dark-700 transition"
              >
                <MessageSquare size={16} className="text-emerald-500" />
                WhatsApp 2: {SR_SUPPORT_CONFIG.phone2}
              </a>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary" size="lg" full>
                Ir para o Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Rodapé com Site Oficial */}
        <div className="text-center pt-4 border-t border-slate-200/60 dark:border-dark-800/60 text-xs text-slate-400">
          <a
            href={SR_SUPPORT_CONFIG.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-brand-700 dark:text-brand hover:underline"
          >
            <Globe size={14} /> Conheça o site oficial da SR Logística <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col justify-between p-6 bg-slate-50 dark:bg-dark-950">
      {/* Topo */}
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
          Criar Conta Passageiro
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Preencha seus dados para solicitar viagens em segundos.
        </p>
      </div>

      {/* Formulário */}
      <div className="my-auto py-6">
        <form onSubmit={handleRegister} className="space-y-3.5">
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <Field label="Nome Completo">
            <div className="relative">
              <Input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Ana Clara Souza"
                className="pl-10"
              />
              <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

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

          <Field label="Telefone / WhatsApp">
            <div className="relative">
              <Input
                type="tel"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(92) 99999-9999"
                className="pl-10"
              />
              <Phone className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

          <Field label="Senha (mínimo 6 caracteres)">
            <div className="relative">
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
              />
              <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400">
              <ShieldCheck size={14} />
              <span>Validação de Segurança</span>
            </div>
            <p>
              Novos cadastros passam por verificação para liberação de corridas. Suporte direto: {SR_SUPPORT_CONFIG.phone1} / {SR_SUPPORT_CONFIG.phone2}.
            </p>
          </div>

          <Button type="submit" size="xl" full disabled={loading} className="mt-2">
            {loading ? 'Criando Conta...' : 'Cadastrar e Solicitar Liberação'} <ArrowRight size={18} />
          </Button>
        </form>
      </div>

      {/* Rodapé / Links */}
      <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-dark-800/60 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Já possui conta?{' '}
          <Link href="/login" className="font-bold text-brand-700 dark:text-brand hover:underline">
            Entrar agora
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
