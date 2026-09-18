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
  Building,
  Briefcase,
  ShieldCheck,
  Clock,
  MessageSquare,
  Globe,
  ExternalLink,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { Button, Input, Field, Badge } from '@/components/ui';
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

export default function CadastroPage() {
  const router = useRouter();
  
  // Tipo de Cadastro: 'particular' (Passageiro Individual) ou 'empresa' (Corporativo / Conveniado)
  const [accountType, setAccountType] = useState<'particular' | 'empresa'>('particular');
  
  // Dados Pessoais
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');

  // Questionário Corporativo / Empresa
  const [companyMode, setCompanyMode] = useState<'select' | 'manual'>('select');
  const [selectedCompany, setSelectedCompany] = useState<string>('Moto Honda da Amazônia');
  const [customCompanyName, setCustomCompanyName] = useState<string>('');
  const [companyCnpj, setCompanyCnpj] = useState<string>('');
  const [setor, setSetor] = useState('');
  const [matricula, setMatricula] = useState('');
  const [turno, setTurno] = useState('1º Turno (Comercial)');

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

  // Carrega empresas conveniadas cadastradas no Supabase
  useState(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('empresas_conveniadas')
          .select('id, name, cnpj')
          .eq('is_active', true)
          .order('name');
        if (data && data.length > 0) {
          setPartnerCompanies(data);
          setSelectedCompany(data[0].name);
        }
      } catch (_) {
        // Usa lista padrão
      }
    })();
  });

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
          // Se estava pendente ou reprovado, reatualiza com os dados atuais
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

      // 2. Cria conta de autenticação no Supabase Auth
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

      // 3. Grava obrigatoriamente na tabela 'passageiros' (exibida em admin.html no Painel Admin)
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
        console.warn('Tentando atualização por email na tabela passageiros:', passInsertError);
        await supabase.from('passageiros').update(passengerPayload).eq('email', cleanEmail);
      }

      // 4. Grava na tabela 'profiles' se houver authUserId vinculado
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
        } catch (errProf) {
          console.warn('Registro em profiles:', errProf);
        }
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

  if (registeredSuccess) {
    return (
      <div className="flex min-h-dvh flex-col justify-between p-6 bg-slate-50 dark:bg-dark-950">
        <div className="pt-6 text-center space-y-4 my-auto">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-lg">
            <Clock size={32} />
          </div>

          <div>
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-xs font-bold mb-2">
              Aguardando aprovação
            </Badge>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Solicitação Enviada!
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              Seu cadastro foi enviado com sucesso para a central de operações da <strong>SR Logística</strong> e está na fila de aprovação de passageiros.
            </p>
          </div>

          {/* Card com Detalhes Cadastrados */}
          <div className="rounded-2xl border border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 text-left text-xs space-y-1.5 shadow-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Passageiro:</span>
              <span className="font-bold text-slate-800 dark:text-white">{nome}</span>
            </div>
            {finalCompanyName && (
              <div className="flex justify-between">
                <span className="text-slate-400">Empresa:</span>
                <span className="font-bold text-slate-800 dark:text-white">{finalCompanyName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">Aguardando aprovação</span>
            </div>
          </div>

          {/* Card de Agilização via WhatsApp */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-400">
              <Sparkles size={16} />
              <span>Deseja aprovação rápida agora?</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Notifique nossos operadores para liberar seu acesso imediatamente no painel:
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
            <Globe size={14} /> Painel Administrativo e Site SR Logística <ExternalLink size={12} />
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
            SR Logística & Transporte
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Cadastro de Passageiro
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Preencha seus dados para envio direto ao Centro de Operações.
        </p>
      </div>

      {/* Formulário */}
      <div className="my-auto py-6">
        <form onSubmit={handleRegister} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Seletor de Tipo de Cadastro: Particular vs Empresa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Selecione o Tipo de Cadastro *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 dark:bg-dark-900 rounded-2xl border border-slate-300/50 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setAccountType('particular')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                  accountType === 'particular'
                    ? 'bg-white dark:bg-dark-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-dark-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <User size={15} className={accountType === 'particular' ? 'text-brand-600 dark:text-brand' : ''} />
                <span>Passageiro Particular</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('empresa')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
                  accountType === 'empresa'
                    ? 'bg-white dark:bg-dark-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-dark-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Building size={15} className={accountType === 'empresa' ? 'text-amber-500' : ''} />
                <span>Empresa / Convênio</span>
              </button>
            </div>
          </div>

          {/* Dados Pessoais do Passageiro */}
          <Field label="Nome Completo *">
            <div className="relative">
              <Input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Costa"
                className="pl-10"
              />
              <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Telefone / WhatsApp *">
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

            <Field label="CPF (Opcional)">
              <div className="relative">
                <Input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="pl-10"
                />
                <CreditCard className="absolute left-3.5 top-3 text-slate-400" size={16} />
              </div>
            </Field>
          </div>

          <Field label="E-mail de Acesso *">
            <div className="relative">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={accountType === 'empresa' ? "colaborador@empresa.com.br" : "seu.email@exemplo.com"}
                className="pl-10"
              />
              <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
          </Field>

          {/* Questionário Corporativo da Empresa (Exibido apenas quando Empresa selecionada) */}
          {accountType === 'empresa' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building size={16} className="text-amber-500" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Questionário da Empresa Conveniada
                  </span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  Voucher Corporativo
                </Badge>
              </div>

              {/* Sub-toggle: Escolher da lista ou Digitar nova */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompanyMode('select')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition ${
                    companyMode === 'select'
                      ? 'bg-amber-500 text-dark-950 shadow-sm'
                      : 'bg-slate-200/60 dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Building className="inline mr-1" size={13} /> Escolher Conveniada
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode('manual')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition ${
                    companyMode === 'manual'
                      ? 'bg-amber-500 text-dark-950 shadow-sm'
                      : 'bg-slate-200/60 dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="inline mr-1" size={13} /> Digitar Empresa / CNPJ
                </button>
              </div>

              {companyMode === 'select' ? (
                <Field label="Selecione a Empresa Conveniada *">
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {partnerCompanies.map((c, idx) => (
                      <option key={idx} value={c.name}>
                        {c.name} {c.cnpj ? `(CNPJ: ${c.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="space-y-3">
                  <Field label="Nome da Empresa / Razão Social *">
                    <div className="relative">
                      <Input
                        type="text"
                        required={companyMode === 'manual'}
                        value={customCompanyName}
                        onChange={(e) => setCustomCompanyName(e.target.value)}
                        placeholder="Ex: Minha Empresa S.A."
                        className="pl-10"
                      />
                      <Building className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    </div>
                  </Field>

                  <Field label="CNPJ da Empresa (Opcional)">
                    <div className="relative">
                      <Input
                        type="text"
                        value={companyCnpj}
                        onChange={(e) => setCompanyCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="pl-10"
                      />
                      <CreditCard className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    </div>
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Field label="Setor / Departamento">
                  <div className="relative">
                    <Input
                      type="text"
                      value={setor}
                      onChange={(e) => setSetor(e.target.value)}
                      placeholder="Ex: Operações, TI, RH"
                      className="pl-10"
                    />
                    <Briefcase className="absolute left-3.5 top-3 text-slate-400" size={16} />
                  </div>
                </Field>

                <Field label="Matrícula / Crachá">
                  <div className="relative">
                    <Input
                      type="text"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      placeholder="Ex: MAT-10293"
                      className="pl-10"
                    />
                    <ShieldCheck className="absolute left-3.5 top-3 text-slate-400" size={16} />
                  </div>
                </Field>
              </div>

              <Field label="Turno de Trabalho">
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="1º Turno (06h - 15h)">1º Turno (06h - 15h)</option>
                  <option value="2º Turno (15h - 23h)">2º Turno (15h - 23h)</option>
                  <option value="3º Turno (23h - 06h)">3º Turno (23h - 06h)</option>
                  <option value="Turno Comercial (08h - 18h)">Turno Comercial (08h - 18h)</option>
                  <option value="Escala 12x36 / Especial">Escala 12x36 / Especial</option>
                </select>
              </Field>

              <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <i className="fas fa-info-circle mr-1"></i> As corridas corporativas são faturadas quinzenalmente para a empresa conveniada através de Voucher.
              </div>
            </div>
          )}

          <Field label="Senha de Acesso (mínimo 6 caracteres) *">
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

          <div className="rounded-2xl bg-brand/10 border border-brand/30 p-3 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-brand-800 dark:text-brand">
              <ShieldCheck size={14} />
              <span>Validação no Painel Admin</span>
            </div>
            <p>
              Ao cadastrar, seus dados são transmitidos para o painel de aprovações da SR Logística para homologação.
            </p>
          </div>

          <Button type="submit" size="xl" full disabled={loading} className="mt-2">
            {loading ? 'Transmitindo Cadastro...' : 'Cadastrar e Solicitar Liberação'} <ArrowRight size={18} />
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
