'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Building,
  Briefcase,
  ShieldCheck,
  Clock,
  MessageSquare,
  Globe,
  ExternalLink,
  Sparkles,
  CreditCard,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SR_SUPPORT_CONFIG } from '@/types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function CadastroPage() {
  const router = useRouter();

  // Tipo de Cadastro: 'particular' ou 'empresa'
  const [accountType, setAccountType] = useState<'particular' | 'empresa'>('particular');

  // Dados Pessoais
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Questionário Corporativo
  const [companyMode, setCompanyMode] = useState<'select' | 'manual'>('select');
  const [selectedCompany, setSelectedCompany] = useState<string>('Moto Honda da Amazônia');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [companyCnpj, setCompanyCnpj] = useState<string>('');
  const [setor, setSetor] = useState('');
  const [matricula, setMatricula] = useState('');
  const [turno, setTurno] = useState('1º Turno (06h - 15h)');

  // Lista de empresas conveniadas
  const [partnerCompanies, setPartnerCompanies] = useState<Array<{ id?: string; name: string; cnpj?: string }>>([
    { name: 'Moto Honda da Amazônia', cnpj: '04.337.168/0001-48' },
    { name: 'Samsung Eletrônica da Amazônia', cnpj: '00.280.273/0001-37' },
    { name: 'Yamaha Motor da Amazônia', cnpj: '04.812.509/0001-90' },
    { name: 'Polo Industrial de Manaus (PIM)', cnpj: '00.000.000/0000-00' },
    { name: 'SR Logística Corporativo', cnpj: '52.967.828/0001-17' },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const { data } = await supabase
          .from('empresas_conveniadas')
          .select('id, name, cnpj')
          .order('name');
        if (data && data.length > 0) {
          setPartnerCompanies(data);
          setSelectedCompany(data[0].name);
        }
      } catch (_) {}
    }
    loadCompanies();
  }, []);

  const finalCompanyName =
    accountType === 'particular'
      ? 'Passageiro Particular'
      : companyMode === 'select'
      ? selectedCompany
      : customCompanyName.trim() || 'Empresa Conveniada';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const cleanNome = nome.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanTelefone = telefone.trim();
    const cleanEmpresa = finalCompanyName;
    const cleanSetor = accountType === 'empresa' ? (setor.trim() || 'Operações / Geral') : 'Particular';
    const cleanMatricula = accountType === 'empresa' ? (matricula.trim() || 'Padrão') : 'Particular';
    const cleanTurno = accountType === 'empresa' ? turno : 'Particular';
    const cleanCpf = cpf.trim() || 'Não informado';
    const cleanCnpj = accountType === 'empresa' ? (companyCnpj.trim() || 'Não informado') : 'Não aplicável';

    if (accountType === 'empresa' && companyMode === 'manual' && !customCompanyName.trim()) {
      setErrorMsg('Por favor, digite o nome da empresa.');
      setLoading(false);
      return;
    }

    try {
      // 1. Verifica se já existe registro na tabela 'passageiros'
      let existingPassenger: any = null;
      try {
        const { data: existingData } = await supabase
          .from('passageiros')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();
        existingPassenger = existingData;
      } catch (errCheck) {
        console.warn('Verificação de passageiro:', errCheck);
      }

      if (existingPassenger) {
        if (existingPassenger.status === 'Aprovado') {
          setErrorMsg('Este e-mail já possui cadastro aprovado! Redirecionando para o login...');
          setTimeout(() => {
            router.push('/login');
          }, 1800);
          setLoading(false);
          return;
        } else {
          // Atualiza dados na tabela passageiros
          try {
            await supabase
              .from('passageiros')
              .update({
                nome: cleanNome,
                nome_social: cleanNome.split(' ')[0],
                nome_completo: cleanNome,
                cpf: cleanCpf,
                telefone: cleanTelefone,
                empresa: cleanEmpresa,
                setor: cleanSetor,
                matricula: cleanMatricula,
                turno: cleanTurno,
                status: 'Pendente',
                updated_at: new Date().toISOString()
              })
              .eq('email', cleanEmail);
          } catch (_) {}

          setRegisteredSuccess(true);
          setLoading(false);
          return;
        }
      }

      // 2. Cria conta no Supabase Auth
      let authUserId: string | null = null;
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanNome,
              nome: cleanNome,
              phone: cleanTelefone,
              telefone: cleanTelefone,
              account_type: accountType,
              company: cleanEmpresa,
              empresa: cleanEmpresa,
              company_cnpj: cleanCnpj,
              department: cleanSetor,
              setor: cleanSetor,
              matricula: cleanMatricula,
              turno: cleanTurno,
              cpf: cleanCpf,
              role: 'passenger',
              status: 'pending',
              is_approved: false
            }
          }
        });

        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }

        if (authError) {
          const errLower = (authError.message || '').toLowerCase();
          if (
            errLower.includes('already registered') ||
            errLower.includes('already exists') ||
            errLower.includes('user already')
          ) {
            try {
              const { data: signInData } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password
              });
              if (signInData?.user?.id) {
                authUserId = signInData.user.id;
                await supabase.auth.updateUser({
                  data: {
                    name: cleanNome,
                    nome: cleanNome,
                    phone: cleanTelefone,
                    telefone: cleanTelefone,
                    account_type: accountType,
                    company: cleanEmpresa,
                    empresa: cleanEmpresa,
                    department: cleanSetor,
                    setor: cleanSetor,
                    cpf: cleanCpf,
                    role: 'passenger',
                    status: 'pending'
                  }
                });
              }
            } catch (_) {}
          } else if (errLower.includes('password') && errLower.includes('least')) {
            setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
            setLoading(false);
            return;
          }
        }
      } catch (authErr) {
        console.warn('Aviso no Supabase Auth:', authErr);
      }

      const passengerId = authUserId || generateUUID();

      // 3. Grava na tabela 'passageiros'
      const passengerPayload = {
        id: passengerId,
        nome: cleanNome,
        nome_social: cleanNome.split(' ')[0],
        nome_completo: cleanNome,
        cpf: cleanCpf,
        telefone: cleanTelefone,
        email: cleanEmail,
        empresa: cleanEmpresa,
        setor: cleanSetor,
        matricula: cleanMatricula,
        turno: cleanTurno,
        origem: accountType === 'empresa' ? 'App Passageiro (Empresa)' : 'App Passageiro (Particular)',
        status: 'Pendente',
        foto_status: 'Pendente',
        foto: null,
        foto_url: null,
        avatar_url: null,
        avatar: null,
        motivo_rejeicao: null,
        voucher_habilitado: false,
        created_at: new Date().toISOString()
      };

      const { error: passInsertError } = await supabase.from('passageiros').insert([passengerPayload]);
      if (passInsertError) {
        await supabase.from('passageiros').update(passengerPayload).eq('email', cleanEmail);
      }

      // 4. Grava na tabela 'profiles'
      if (authUserId) {
        try {
          await supabase.from('profiles').upsert({
            id: authUserId,
            name: cleanNome,
            nome: cleanNome,
            email: cleanEmail,
            phone: cleanTelefone,
            telefone: cleanTelefone,
            role: 'passenger',
            account_type: accountType,
            company: cleanEmpresa,
            corporate_company: accountType === 'empresa' ? cleanEmpresa : undefined,
            department: cleanSetor,
            cpf: cleanCpf,
            foto_status: 'Pendente',
            photo_status: 'pending',
            motivo_rejeicao: null,
            rejection_reason: null,
            status: 'pending',
            is_approved: false,
            approved: false,
            created_at: new Date().toISOString()
          });
        } catch (_) {}
      }

      setRegisteredSuccess(true);
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setErrorMsg('Erro ao processar cadastro. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá Central SR Logística! Acabei de enviar meu cadastro de passageiro no App (${nome}, Empresa: ${finalCompanyName || 'Particular'}, E-mail: ${email}) e gostaria da liberação no painel admin.`
  );

  // Tela de Sucesso
  if (registeredSuccess) {
    return (
      <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#070D18] text-white select-none overflow-x-hidden p-4 sm:p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 w-full max-w-md sm:max-w-lg mx-auto my-auto bg-[#0B1220]/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Clock size={32} />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Aguardando Aprovação
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Solicitação Enviada!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              Seu cadastro foi transmitido para a central operacional da <strong>SR Logística</strong> e está na fila de ativação.
            </p>
          </div>

          {/* Resumo dos Dados */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Passageiro:</span>
              <span className="font-bold text-white">{nome}</span>
            </div>
            {finalCompanyName && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Modalidade:</span>
                <span className="font-bold text-amber-400">{finalCompanyName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status:</span>
              <span className="font-bold text-amber-400">Em Análise Operacional</span>
            </div>
          </div>

          {/* Card de Agilização via WhatsApp */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Sparkles size={16} />
              <span>Deseja aprovação imediata?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Notifique nossa equipe de plantão via WhatsApp para liberação prioritária:
            </p>

            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone1Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 p-2.5 text-xs font-black text-white shadow-md transition active:scale-95"
              >
                <MessageSquare size={16} />
                <span>Liberar via Central 1: {SR_SUPPORT_CONFIG.phone1}</span>
              </a>

              <a
                href={`https://wa.me/${SR_SUPPORT_CONFIG.phone2Raw}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-emerald-500/30 p-2.5 text-xs font-black text-white hover:bg-slate-800 transition active:scale-95"
              >
                <MessageSquare size={16} className="text-emerald-400" />
                <span>Suporte 2: {SR_SUPPORT_CONFIG.phone2}</span>
              </a>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/login" className="block">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-amber-400 text-dark-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition"
              >
                <span>Acessar Tela de Login</span>
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>

        <footer className="relative z-10 text-center pt-4 text-xs text-slate-500">
          SR Logística & Transporte Corporativo • Manaus - AM
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full flex flex-col justify-between bg-[#070D18] text-white select-none overflow-x-hidden p-4 sm:p-6 md:p-8">
      {/* Glow de Fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Barra Superior / Voltar */}
      <header className="relative z-10 w-full max-w-md sm:max-w-xl mx-auto flex items-center justify-between pb-4">
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

      {/* Card Principal de Cadastro */}
      <main className="relative z-10 w-full max-w-md sm:max-w-xl mx-auto my-auto bg-[#0B1220]/95 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-dark-950 font-black shadow-lg shadow-amber-500/30 mb-1">
            <Navigation size={24} className="stroke-[2.5]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Criar Conta de Passageiro
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            Selecione a modalidade e informe seus dados para ativação.
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-left">
          {/* Seletor de Modalidade: Particular vs Empresa */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Tipo de Passageiro *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAccountType('particular')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition ${
                  accountType === 'particular'
                    ? 'bg-amber-500 text-dark-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User size={15} />
                <span>Particular</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('empresa')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition ${
                  accountType === 'empresa'
                    ? 'bg-amber-500 text-dark-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building size={15} />
                <span>Empresa / Convênio</span>
              </button>
            </div>
          </div>

          {/* Nome Completo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Nome Completo *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Costa"
                className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
              />
              <User className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
            </div>
          </div>

          {/* Telefone e CPF em Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                WhatsApp / Telefone *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(92) 99999-9999"
                  className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                />
                <Phone className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                CPF (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                />
                <CreditCard className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
              </div>
            </div>
          </div>

          {/* E-mail de Acesso */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              E-mail de Acesso *
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={accountType === 'empresa' ? 'colaborador@empresa.com.br' : 'seu.email@exemplo.com'}
                className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
              />
              <Mail className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
            </div>
          </div>

          {/* Questionário Corporativo da Empresa Conveniada */}
          {accountType === 'empresa' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-amber-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Dados da Empresa Conveniada
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                  Voucher Faturado
                </span>
              </div>

              {/* Sub-toggle: Selecionar Conveniada ou Digitar Nova */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompanyMode('select')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    companyMode === 'select'
                      ? 'bg-amber-500 text-dark-950 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Building className="inline mr-1" size={13} /> Selecionar Conveniada
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode('manual')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    companyMode === 'manual'
                      ? 'bg-amber-500 text-dark-950 shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Briefcase className="inline mr-1" size={13} /> Digitar Empresa / CNPJ
                </button>
              </div>

              {companyMode === 'select' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Empresa Conveniada *
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full h-12 rounded-2xl bg-slate-900 border border-slate-800 px-4 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                  >
                    {partnerCompanies.map((c, idx) => (
                      <option key={idx} value={c.name} className="bg-slate-900 text-white">
                        {c.name} {c.cnpj ? `(CNPJ: ${c.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Nome da Empresa / Razão Social *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required={companyMode === 'manual'}
                        value={customCompanyName}
                        onChange={(e) => setCustomCompanyName(e.target.value)}
                        placeholder="Ex: Minha Empresa S.A."
                        className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                      />
                      <Building className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      CNPJ da Empresa (Opcional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={companyCnpj}
                        onChange={(e) => setCompanyCnpj(formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                      />
                      <CreditCard className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                    </div>
                  </div>
                </div>
              )}

              {/* Setor e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Setor / Departamento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={setor}
                      onChange={(e) => setSetor(e.target.value)}
                      placeholder="Ex: TI, RH, Operações"
                      className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                    />
                    <Briefcase className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Matrícula / Crachá
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Ex: MAT-10293"
                      className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-white pl-11 pr-4 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                    />
                    <ShieldCheck className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                  </div>
                </div>
              </div>

              {/* Turno de Trabalho */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Turno de Trabalho
                </label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-slate-900 border border-slate-800 px-4 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition"
                >
                  <option value="1º Turno (06h - 15h)" className="bg-slate-900 text-white">1º Turno (06h - 15h)</option>
                  <option value="2º Turno (15h - 23h)" className="bg-slate-900 text-white">2º Turno (15h - 23h)</option>
                  <option value="3º Turno (23h - 06h)" className="bg-slate-900 text-white">3º Turno (23h - 06h)</option>
                  <option value="Turno Comercial (08h - 18h)" className="bg-slate-900 text-white">Turno Comercial (08h - 18h)</option>
                  <option value="Escala 12x36 / Especial" className="bg-slate-900 text-white">Escala 12x36 / Especial</option>
                </select>
              </div>

              <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                <span>As corridas corporativas são faturadas diretamente para a empresa conveniada via Voucher.</span>
              </div>
            </div>
          )}

          {/* Senha com Toggle Ver/Ocultar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Senha de Acesso (mínimo 6 caracteres) *
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
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Aviso de Homologação */}
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <ShieldCheck size={14} />
              <span>Validação no Painel Operacional SR</span>
            </div>
            <p>
              Ao enviar o cadastro, seus dados são transmitidos com segurança para liberação imediata da sua conta.
            </p>
          </div>

          {/* Botão de Submissão */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-amber-400 text-dark-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                <span>Transmitindo Cadastro...</span>
              </div>
            ) : (
              <>
                <span>Cadastrar e Solicitar Liberação</span>
                <ArrowRight size={18} className="stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Divisor / Já tem conta */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Já possui uma conta de passageiro?{' '}
            <Link
              href="/login"
              className="font-bold text-amber-400 hover:text-amber-300 hover:underline"
            >
              Entrar agora
            </Link>
          </p>
        </div>
      </main>

      {/* Rodapé Oficial */}
      <footer className="relative z-10 w-full max-w-md sm:max-w-xl mx-auto pt-4 text-center space-y-2">
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
