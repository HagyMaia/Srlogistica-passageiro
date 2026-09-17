'use client';

import { useState, useRef, useEffect } from 'react';
import {
  User,
  Camera,
  Star,
  Shield,
  HelpCircle,
  LogOut,
  Save,
  CheckCircle2,
  ChevronRight,
  Globe,
  ExternalLink,
  Clock,
  Mail,
  CreditCard,
  QrCode,
  Sparkles,
  Award,
  Trash2,
  Upload,
  Check,
  Smartphone,
  Download,
  Fingerprint,
  Building,
  Briefcase,
  Search,
  Users
} from 'lucide-react';
import { Button, Input, Field, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { SupportModal } from '@/components/SupportModal';
import { PendingApprovalModal } from '@/components/PendingApprovalModal';
import { SR_SUPPORT_CONFIG } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  optimizeAvatarImage,
  DEFAULT_AVATAR_URL,
  getInstantSyncPassengerAvatar
} from '@/lib/avatar-storage';
import {
  isBiometricsSupported,
  isBiometricsEnrolled,
  enrollBiometrics,
  removeBiometrics,
  getBiometricUser
} from '@/lib/biometrics';

// Avatares Executivos Pré-definidos em Alta Definição
const EXECUTIVE_AVATARS = [
  {
    id: 'exec-1',
    label: 'Executivo 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'exec-2',
    label: 'Executivo 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'exec-3',
    label: 'Executivo 3',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'exec-4',
    label: 'Executivo 4',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'exec-5',
    label: 'Executivo 5',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80'
  },
  {
    id: 'exec-6',
    label: 'Executivo 6',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80'
  }
];

export default function PerfilPage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [company, setCompany] = useState(profile?.company || 'SR Logística & Transporte');
  const [department, setDepartment] = useState(profile?.department || 'Operações e Gestão');
  const [paymentPreference, setPaymentPreference] = useState<'PIX' | 'VOUCHER'>(profile?.payment_preference || 'PIX');
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return profile?.avatar_url || getInstantSyncPassengerAvatar(profile?.id, profile?.email) || DEFAULT_AVATAR_URL;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMsg, setBioMsg] = useState<string | null>(null);

  // Empresas Conveniadas & Ferramenta Admin de Vínculo
  const [partnerCompanies, setPartnerCompanies] = useState<Array<{ id?: string; name: string; cnpj?: string }>>([
    { name: 'Moto Honda da Amazônia', cnpj: '04.337.168/0001-48' },
    { name: 'Samsung Eletrônica da Amazônia', cnpj: '00.280.273/0001-37' },
    { name: 'Yamaha Motor da Amazônia', cnpj: '04.812.509/0001-90' },
    { name: 'Polo Industrial de Manaus (PIM)', cnpj: '00.000.000/0000-00' },
    { name: 'SR Logística Corporativo', cnpj: '52.967.828/0001-17' },
  ]);

  const [isAdminLinkingOpen, setIsAdminLinkingOpen] = useState(false);
  const [adminSearchPassenger, setAdminSearchPassenger] = useState('');
  const [adminPassengersList, setAdminPassengersList] = useState<any[]>([]);
  const [adminSelectedPassengerId, setAdminSelectedPassengerId] = useState('');
  const [adminTargetCompany, setAdminTargetCompany] = useState('Moto Honda da Amazônia');
  const [adminTargetDept, setAdminTargetDept] = useState('Operações / PIM');
  const [adminLinkingLoading, setAdminLinkingLoading] = useState(false);
  const [adminLinkingSuccess, setAdminLinkingSuccess] = useState<string | null>(null);

  // Carrega empresas conveniadas
  useEffect(() => {
    async function loadCompanies() {
      try {
        const { data } = await supabase
          .from('empresas_conveniadas')
          .select('id, name, cnpj')
          .eq('is_active', true)
          .order('name');
        if (data && data.length > 0) {
          setPartnerCompanies(data);
          setAdminTargetCompany(data[0].name);
        }
      } catch (_) {}
    }
    loadCompanies();
  }, []);

  // Carrega passageiros para ferramenta administrativa
  const loadAdminPassengers = async () => {
    try {
      const { data } = await supabase
        .from('passageiros')
        .select('id, nome, email, telefone, empresa, setor, status')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setAdminPassengersList(data);
        if (data.length > 0 && !adminSelectedPassengerId) {
          setAdminSelectedPassengerId(data[0].id);
        }
      }
    } catch (_) {}
  };

  const handleAdminLinkPassenger = async () => {
    if (!adminSelectedPassengerId) return;
    setAdminLinkingLoading(true);
    setAdminLinkingSuccess(null);
    try {
      const targetPass = adminPassengersList.find((p) => p.id === adminSelectedPassengerId);
      const updateData = {
        empresa: adminTargetCompany,
        setor: adminTargetDept,
        origem: 'Vinculado por Admin',
        updated_at: new Date().toISOString()
      };

      await supabase.from('passageiros').update(updateData).eq('id', adminSelectedPassengerId);

      if (targetPass?.email) {
        await supabase
          .from('profiles')
          .update({
            company: adminTargetCompany,
            corporate_company: adminTargetCompany,
            department: adminTargetDept,
            account_type: 'empresa'
          })
          .eq('email', targetPass.email);
      }

      setAdminLinkingSuccess(`Passageiro ${targetPass?.nome || ''} vinculado com sucesso à ${adminTargetCompany}!`);
      await loadAdminPassengers();
      setTimeout(() => setAdminLinkingSuccess(null), 4000);
    } catch (err: any) {
      alert('Erro ao vincular passageiro: ' + (err.message || 'Falha na conexão'));
    } finally {
      setAdminLinkingLoading(false);
    }
  };

  useEffect(() => {
    async function checkBio() {
      const sup = await isBiometricsSupported();
      const enr = isBiometricsEnrolled();
      setBioSupported(sup);
      setBioEnrolled(enr);
    }
    checkBio();
  }, []);

  const handleEnableBiometrics = async () => {
    setBioLoading(true);
    setBioMsg(null);
    try {
      const userObj = {
        id: profile?.id || user?.id || '',
        email: profile?.email || user?.email || '',
        name: name || profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Passageiro'
      };
      await enrollBiometrics(userObj);
      setBioEnrolled(true);
      setBioMsg('Biometria cadastrada com sucesso neste aparelho!');
    } catch (err: any) {
      setBioMsg(err.message || 'Falha ao cadastrar biometria.');
    } finally {
      setBioLoading(false);
    }
  };

  const handleDisableBiometrics = () => {
    removeBiometrics();
    setBioEnrolled(false);
    setBioMsg('Biometria desativada deste dispositivo.');
  };

  // Sincroniza os estados com os dados reais do perfil quando carregados
  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.phone) setPhone(profile.phone);
      if (profile.company) setCompany(profile.company);
      if (profile.department) setDepartment(profile.department);
      if (profile.payment_preference) setPaymentPreference(profile.payment_preference);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  // Escuta evento do Android para instalação direta do aplicativo
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  // Manipulador de Upload de Foto com corte quadrado 1:1 e compressão automática
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const optimizedBase64 = await optimizeAvatarImage(file, 360, 0.85);
      setAvatarUrl(optimizedBase64);
      await updateProfile({ avatar_url: optimizedBase64 });
      setIsAvatarModalOpen(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Não foi possível processar esta foto. Tente outra imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadingPhoto(false);
    }
  };

  const handleSelectPresetAvatar = async (url: string) => {
    try {
      setAvatarUrl(url);
      setIsUploadingPhoto(true);
      await updateProfile({ avatar_url: url });
      setIsAvatarModalOpen(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao definir avatar:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setAvatarUrl(DEFAULT_AVATAR_URL);
      setIsUploadingPhoto(true);
      await updateProfile({ avatar_url: DEFAULT_AVATAR_URL });
      setIsAvatarModalOpen(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao restaurar avatar padrão:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({
      name,
      phone,
      company,
      department,
      payment_preference: paymentPreference,
      avatar_url: avatarUrl
    });
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isApproved = profile?.is_approved !== false && profile?.status !== 'pending';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="flex flex-col min-h-dvh p-4 sm:p-5 space-y-4 pb-28 max-w-lg mx-auto w-full">
      {/* Input de Arquivo Oculto para Troca de Foto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Header Superior */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            <User size={13} className="text-brand" /> Conta & Perfil
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Meu Perfil</h1>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black">
            <Shield size={12} /> Admin Master
          </span>
        )}
      </div>

      {/* Card do Perfil com Botão de Foto */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Avatar com Botão de Câmera */}
          <div className="relative group">
            <img
              src={avatarUrl || profile?.avatar_url || DEFAULT_AVATAR_URL}
              alt="Avatar do Usuário"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_AVATAR_URL;
              }}
              className="h-20 w-20 rounded-3xl object-cover border-2 border-brand shadow-md shadow-brand/10 transition-transform duration-200 group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              disabled={isUploadingPhoto}
              className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-brand text-dark-950 font-bold border-2 border-white dark:border-dark-800 shadow-lg hover:scale-110 active:scale-95 transition-all"
              title="Trocar foto de perfil"
            >
              {isUploadingPhoto ? (
                <div className="h-3.5 w-3.5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={14} />
              )}
            </button>
          </div>

          {/* Dados do Usuário */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">
                {profile?.name || name}
              </h2>
              <CheckCircle2 size={16} className="text-brand shrink-0" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <Mail size={12} /> {profile?.email}
            </p>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {isApproved ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-black">
                  ✓ Conta Homologada
                </Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPendingModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold"
                >
                  <Clock size={10} /> Pendente de Aprovação
                </button>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-dark-700 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <Star size={10} className="text-amber-500" fill="#f59e0b" /> {profile?.rating || 4.98}
              </span>
            </div>
          </div>
        </div>

        {/* Barra Rápida de Métricas Executivas */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-dark-700/60 pt-3">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Viagens</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{profile?.total_rides || 48}</span>
          </div>
          <div className="text-center border-x border-slate-100 dark:border-dark-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Categoria</span>
            <span className="text-xs font-black text-brand-600 dark:text-brand flex items-center justify-center gap-0.5">
              <Award size={12} /> Ouro VIP
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pagamento</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {paymentPreference === 'PIX' ? '⚡ PIX' : '🏢 Voucher'}
            </span>
          </div>
        </div>
      </div>

      {/* Atalho Especial do Painel Administrativo para Admins */}
      {isAdmin && (
        <a
          href={SR_SUPPORT_CONFIG.adminUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-brand/10 to-transparent border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-dark-950 font-black shadow-md shadow-amber-500/20">
              <Shield size={20} />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-1.5">
                Painel Administrativo Web <Sparkles size={14} className="text-amber-500" />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                Homologar passageiros, gerenciar motoristas e rotas
              </p>
            </div>
          </div>
          <ExternalLink size={18} className="text-amber-600 dark:text-amber-400" />
        </a>
      )}

      {/* Formulário de Dados Pessoais & Corporativos */}
      <form
        onSubmit={handleSave}
        className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <User size={13} /> Dados do Passageiro
          </span>
          <button
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
          >
            <Camera size={12} /> Alterar Foto
          </button>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>Perfil e dados atualizados com sucesso!</span>
          </div>
        )}

        <div className="space-y-3">
          <Field label="Nome Completo">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </Field>

          <Field label="Telefone de Contato / WhatsApp">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(92) 99999-9999"
              required
            />
          </Field>

          {/* Seleção / Edição de Empresa Conveniada */}
          <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-900/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building size={14} className="text-brand" /> Empresa Conveniada / Vínculo
              </span>
              <span className="text-[10px] text-slate-400">PIM & Corporativo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Escolha da Lista</label>
                <select
                  value={partnerCompanies.some(c => c.name === company) ? company : 'Outra'}
                  onChange={(e) => {
                    if (e.target.value !== 'Outra') {
                      setCompany(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 py-2 px-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {partnerCompanies.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Outra">Outra / Digitar Manualmente</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Razão Social / Nome</label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div className="pt-1">
              <Field label="Setor / Departamento">
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ex: Operações, Qualidade, TI"
                />
              </Field>
            </div>
          </div>

          <Field label="E-mail (Autenticado)">
            <Input
              disabled
              value={profile?.email || ''}
              className="opacity-70 bg-slate-100 dark:bg-dark-900/50 cursor-not-allowed font-medium"
            />
          </Field>
        </div>

        {/* Botão Especial de Vínculo de Passageiros para Administrador */}
        {isAdmin && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                loadAdminPassengers();
                setIsAdminLinkingOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 transition text-left text-xs font-black"
            >
              <div className="flex items-center gap-2">
                <Users size={16} className="text-amber-600 dark:text-amber-400" />
                <span>Vincular Passageiro a Empresa Conveniada (Admin)</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Preferência de Pagamento Padrão */}
        <div className="pt-2">
          <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Forma de Pagamento Preferencial
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentPreference('PIX')}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                paymentPreference === 'PIX'
                  ? 'bg-brand/10 border-brand text-brand-700 dark:text-brand font-bold'
                  : 'bg-slate-50 dark:bg-dark-900/50 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <QrCode size={18} className={paymentPreference === 'PIX' ? 'text-brand' : 'text-slate-400'} />
              <div>
                <div className="text-xs font-black">PIX Instantâneo</div>
                <div className="text-[10px] text-slate-400">QR Code e Chave</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentPreference('VOUCHER')}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                paymentPreference === 'VOUCHER'
                  ? 'bg-brand/10 border-brand text-brand-700 dark:text-brand font-bold'
                  : 'bg-slate-50 dark:bg-dark-900/50 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <CreditCard size={18} className={paymentPreference === 'VOUCHER' ? 'text-brand' : 'text-slate-400'} />
              <div>
                <div className="text-xs font-black">Voucher Corporativo</div>
                <div className="text-[10px] text-slate-400">Faturado pela Empresa</div>
              </div>
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          full
          disabled={isSaving}
          className="mt-2 py-3"
        >
          <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>

      {/* Segurança & Entrada por Digital / Biometria */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 space-y-3 shadow-sm text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/15 text-brand-600 dark:text-brand font-bold shadow-sm">
              <Fingerprint size={22} className="stroke-[2.3]" />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 dark:text-white block">
                Entrada por Digital / Biometria
              </span>
              <span className="text-[10px] text-slate-400">
                {bioEnrolled ? 'Ativada para este aparelho' : 'Desativada'}
              </span>
            </div>
          </div>

          <Badge className={bioEnrolled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-slate-100 text-slate-500'}>
            {bioEnrolled ? 'Ativa' : 'Disponível'}
          </Badge>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Permite entrar no aplicativo instantaneamente usando seu leitor de impressão digital, Face ID ou biometria nativa do aparelho.
        </p>

        {bioMsg && (
          <div
            className={`p-2.5 rounded-xl text-xs font-bold ${
              bioMsg.includes('sucesso')
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            {bioMsg}
          </div>
        )}

        <div className="pt-1 flex gap-2">
          {!bioEnrolled ? (
            <Button
              type="button"
              size="md"
              full
              disabled={bioLoading}
              onClick={handleEnableBiometrics}
              className="font-bold flex items-center justify-center gap-2"
            >
              <Fingerprint size={16} />
              {bioLoading ? 'Registrando...' : 'Cadastrar Digital Neste Aparelho'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="md"
              full
              onClick={handleDisableBiometrics}
              className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 font-bold"
            >
              Desativar Biometria
            </Button>
          )}
        </div>
      </div>

      {/* Central de Ajuda & Links Oficiais */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-2 space-y-1 shadow-sm text-xs">
        {/* Botão de Instalação do App no Celular */}
        <button
          type="button"
          onClick={handleInstallApp}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-brand/10 hover:bg-brand/20 border border-brand/30 transition text-left"
        >
          <div className="flex items-center gap-3 text-slate-900 dark:text-white font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-dark-950 font-black shadow-md shadow-brand/20">
              <Smartphone size={18} />
            </div>
            <div>
              <span className="text-sm font-black block flex items-center gap-1.5">
                Instalar Aplicativo (Android / APK) <Sparkles size={13} className="text-amber-500" />
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-300 font-medium">
                Adicionar à tela de início com ícone e tela cheia
              </p>
            </div>
          </div>
          <Download size={16} className="text-brand shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-700/50 transition"
        >
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <HelpCircle size={18} />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold block">Central de Suporte 24h</span>
              <p className="text-[10px] text-slate-400 font-normal">
                WhatsApp: {SR_SUPPORT_CONFIG.phone1} / {SR_SUPPORT_CONFIG.phone2}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <a
          href={SR_SUPPORT_CONFIG.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-700/50 transition"
        >
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Globe size={18} />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold block">Portal Oficial SR Logística</span>
              <p className="text-[10px] text-slate-400 font-normal">
                www.srlogisticatrasporte.com.br
              </p>
            </div>
          </div>
          <ExternalLink size={16} className="text-slate-400" />
        </a>

        <button
          type="button"
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-700/50 transition"
        >
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand-600 dark:text-brand">
              <Shield size={18} />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold block">Privacidade, Termos & Segurança</span>
              <p className="text-[10px] text-slate-400 font-normal">
                LGPD e diretrizes de transporte seguro
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Botão Sair da Conta com Confirmação */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        full
        onClick={() => setShowSignOutConfirm(true)}
        className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 py-3 rounded-2xl font-bold"
      >
        <LogOut size={16} /> Sair da Conta
      </Button>

      {/* Modal de Troca de Foto de Perfil */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-dark-800 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-brand" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Foto de Perfil</h3>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1"
              >
                Fechar
              </button>
            </div>

            {/* Opções de Upload Direto */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 hover:bg-brand/10 transition-all text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-dark-950 font-bold shadow-md">
                  <Upload size={18} />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">Enviar do Celular/PC</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG ou WebP</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-900/50 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-center group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-dark-700 text-slate-600 dark:text-slate-300 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Trash2 size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-red-500 block">Remover Foto</span>
                  <span className="text-[10px] text-slate-400">Restaurar padrão</span>
                </div>
              </button>
            </div>

            {/* Galeria de Avatares Executivos Rápidos */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                Ou escolha um avatar executivo:
              </span>
              <div className="grid grid-cols-3 gap-3">
                {EXECUTIVE_AVATARS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(item.url)}
                    className="relative group rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 border-slate-200 dark:border-dark-700 hover:border-brand"
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="h-18 w-full object-cover aspect-square"
                    />
                    {avatarUrl === item.url && (
                      <div className="absolute inset-0 bg-brand/30 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-brand text-dark-950 flex items-center justify-center font-bold">
                          <Check size={14} />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Logout */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-dark-800 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
              <LogOut size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Deseja realmente sair?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Você precisará fazer login novamente para solicitar corridas e acessar seus dados.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowSignOutConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={signOut}
              >
                Sim, Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Instalação do Aplicativo Android (APK / WebAPK) */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-dark-800 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-brand" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Instalar Aplicativo</h3>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/20">
                <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1 flex items-center gap-1.5">
                  🤖 Opção 1: Instalação Instantânea (Recomendado)
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
                  <li>Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito do Google Chrome.</li>
                  <li>Selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>O aplicativo será adicionado como um **APK nativo** no seu celular com ícone oficial e tela cheia!</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-dark-700/60 border border-slate-200 dark:border-dark-600">
                <h4 className="font-black text-slate-900 dark:text-white text-xs mb-1 flex items-center gap-1.5">
                  📥 Opção 2: Baixar Arquivo APK Físico
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
                  Baixe o instalador direto para instalar no celular ou enviar por WhatsApp:
                </p>
                <a
                  href="/sr-passageiro.apk"
                  download="sr-passageiro.apk"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2 text-xs font-black text-dark-950 shadow-md hover:bg-brand-hover transition active:scale-95"
                >
                  <Download size={14} /> Baixar Arquivo sr-passageiro.apk
                </a>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-900/40 border border-slate-200 dark:border-dark-700">
                <h4 className="font-black text-slate-900 dark:text-white text-xs mb-0.5 flex items-center gap-1.5">
                  🍎 No iPhone (iOS):
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Toque no botão <strong>Compartilhar (quadrado com seta)</strong> no Safari e clique em <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              full
              onClick={() => setIsInstallModalOpen(false)}
              className="py-2.5"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Vínculo de Passageiro a Empresa (Exclusivo Administrador) */}
      {isAdminLinkingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-dark-800 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Building size={18} className="text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Vincular Passageiro a Convênio
                </h3>
              </div>
              <button
                onClick={() => setIsAdminLinkingOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1"
              >
                Fechar
              </button>
            </div>

            {adminLinkingSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✓ {adminLinkingSuccess}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Buscar Passageiro Cadastrado
                </label>
                <div className="relative mb-2">
                  <Input
                    type="text"
                    placeholder="Filtrar por nome ou e-mail..."
                    value={adminSearchPassenger}
                    onChange={(e) => setAdminSearchPassenger(e.target.value)}
                    className="pl-8 text-xs"
                  />
                  <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>

                <select
                  value={adminSelectedPassengerId}
                  onChange={(e) => setAdminSelectedPassengerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {adminPassengersList
                    .filter(
                      (p) =>
                        !adminSearchPassenger ||
                        p.nome?.toLowerCase().includes(adminSearchPassenger.toLowerCase()) ||
                        p.email?.toLowerCase().includes(adminSearchPassenger.toLowerCase())
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.empresa || 'Particular'}) - {p.email}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Selecionar Empresa Conveniada
                </label>
                <select
                  value={adminTargetCompany}
                  onChange={(e) => setAdminTargetCompany(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {partnerCompanies.map((c, idx) => (
                    <option key={idx} value={c.name}>
                      {c.name} {c.cnpj ? `(CNPJ: ${c.cnpj})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  3. Setor / Lotação
                </label>
                <Input
                  type="text"
                  value={adminTargetDept}
                  onChange={(e) => setAdminTargetDept(e.target.value)}
                  placeholder="Ex: Produção, Diretoria, Logística"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
                Esta ação atualizará o cadastro do passageiro para o tipo Corporativo com faturamento direto via Voucher da empresa conveniada.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsAdminLinkingOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={adminLinkingLoading || !adminSelectedPassengerId}
                onClick={handleAdminLinkPassenger}
              >
                {adminLinkingLoading ? 'Vinculando...' : 'Confirmar Vínculo'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modais de Suporte e Aprovação */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <PendingApprovalModal isOpen={isPendingModalOpen} onClose={() => setIsPendingModalOpen(false)} />
    </div>
  );
}
