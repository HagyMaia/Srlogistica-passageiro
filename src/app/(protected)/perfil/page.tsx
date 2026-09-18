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
  Building2,
  Briefcase,
  Search,
  Users,
  AlertCircle,
  AlertTriangle,
  Edit3,
  MapPin,
  Phone,
  FileText,
  X,
  Send,
  Lock
} from 'lucide-react';
import { Button, Input, Field, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { SupportModal } from '@/components/SupportModal';
import { PendingApprovalModal } from '@/components/PendingApprovalModal';
import { SR_SUPPORT_CONFIG } from '@/types';
import { supabase } from '@/lib/supabase';
import { AlterationRequest } from '@/types';
import {
  submitPassengerAlteration,
  getPassengerPendingAlteration
} from '@/lib/passenger-alteration';
import {
  optimizeAvatarImage,
  persistPassengerAvatar,
  clearPersistedPassengerAvatar,
  getInstantSyncPassengerAvatar,
  DEFAULT_AVATAR_URL
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
  const { user, profile, updateProfile, signOut, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Dados Oficiais Vigentes
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [cpf, setCpf] = useState(profile?.cpf || '');
  const [employeeRegistration, setEmployeeRegistration] = useState(profile?.employee_registration || '');
  const [shift, setShift] = useState(profile?.shift || '');
  const [pickupAddress, setPickupAddress] = useState(profile?.pickup_address || '');
  const [company, setCompany] = useState(profile?.company || 'SR Logística & Transporte');
  const [department, setDepartment] = useState(profile?.department || 'Operações e Gestão');
  const [paymentPreference, setPaymentPreference] = useState<'PIX' | 'VOUCHER'>(profile?.payment_preference || 'VOUCHER');
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return profile?.avatar_url || getInstantSyncPassengerAvatar(profile?.id, profile?.email) || DEFAULT_AVATAR_URL;
  });

  // Modais de Edição / Solicitação para Análise
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Estados dos dados em solicitação
  const [pendingAlteration, setPendingAlteration] = useState<AlterationRequest | null>(null);
  const [alterationStatus, setAlterationStatus] = useState<string | null>(null);
  const [alterationRejectionReason, setAlterationRejectionReason] = useState<string | null>(null);

  // Campos do Modal 1: Dados Pessoais
  const [modalName, setModalName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalCpf, setModalCpf] = useState('');
  const [modalAddress, setModalAddress] = useState('');
  const [modalJustification, setModalJustification] = useState('');

  // Campos do Modal 2: Dados da Empresa
  const [modalCompany, setModalCompany] = useState('');
  const [modalDepartment, setModalDepartment] = useState('');
  const [modalEmployeeRegistration, setModalEmployeeRegistration] = useState('');
  const [modalShift, setModalShift] = useState('');
  const [modalCompanyJustification, setModalCompanyJustification] = useState('');

  const [isSubmittingAlt, setIsSubmittingAlt] = useState(false);
  const [altSuccessMsg, setAltSuccessMsg] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);
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

  // Carrega e sincroniza em tempo real as solicitações de alteração do passageiro
  useEffect(() => {
    const uid = profile?.id || user?.id;
    const email = profile?.email || user?.email;
    if (!uid && !email) return;

    async function fetchAlterations() {
      const lastReq = await getPassengerPendingAlteration(uid || '', email);
      if (lastReq) {
        if (lastReq.status === 'Aprovado' || (lastReq.status as string) === 'aprovado') {
          setPendingAlteration(null);
          setAlterationStatus('Aprovado');
          setAlterationRejectionReason(null);

          // Aplica imediatamente os novos dados oficiais no estado
          const novos = lastReq.dados_novos || {};
          const novoNome = novos.nome || novos.name || novos.fullName || novos.nome_completo;
          const novoTel = novos.telefone || novos.phone || novos.whatsapp;
          const novoCpf = novos.cpf;
          const novoEnd = novos.endereco || novos.pickup_address || novos.address || novos.ponto_embarque;
          const novaEmpresa = novos.empresa || novos.company || novos.corporate_company;
          const novoSetor = novos.setor || novos.department;
          const novaMatricula = novos.matricula || novos.employee_registration || novos.employee_id;
          const novoTurno = novos.turno || novos.shift;

          if (novoNome) setName(novoNome);
          if (novoTel) setPhone(novoTel);
          if (novoCpf) setCpf(novoCpf);
          if (novoEnd) setPickupAddress(novoEnd);
          if (novaEmpresa) setCompany(novaEmpresa);
          if (novoSetor) setDepartment(novoSetor);
          if (novaMatricula) setEmployeeRegistration(novaMatricula);
          if (novoTurno) setShift(novoTurno);

          // Limpa pendência local
          if (typeof window !== 'undefined') {
            try {
              if (uid) {
                localStorage.removeItem(`sr_passenger_pending_alt_${uid}`);
                localStorage.removeItem(`sr_passenger_alt_status_${uid}`);
              }
              if (email) {
                localStorage.removeItem(`sr_passenger_pending_alt_${email}`);
                localStorage.removeItem(`sr_passenger_alt_status_${email}`);
              }
            } catch (_) {}
          }

          // Recarrega o perfil oficial do Supabase
          refreshProfile();
        } else if (lastReq.status === 'Rejeitado' || (lastReq.status as string) === 'rejeitado') {
          setPendingAlteration(lastReq);
          setAlterationStatus('Rejeitado');
          setAlterationRejectionReason(lastReq.motivo_rejeicao || null);
        } else {
          setPendingAlteration(lastReq);
          setAlterationStatus('Aguardando aprovação');
        }
      }
    }
    fetchAlterations();

    // Sincronização em tempo real via Supabase Realtime
    if (supabase) {
      const channel = supabase
        .channel(`passenger_alterations_${uid || email}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'solicitacoes_alteracao'
          },
          (payload: any) => {
            if (payload.new) {
              const req = payload.new as AlterationRequest;
              const matchesUser = 
                (uid && req.usuario_id === uid) ||
                (email && req.usuario_id === email) ||
                (email && req.usuario_nome?.includes(email));

              if (!matchesUser && req.usuario_id) return;

              if (req.status === 'Aprovado' || (req.status as string) === 'aprovado') {
                setPendingAlteration(null);
                setAlterationStatus('Aprovado');
                setAlterationRejectionReason(null);

                // Aplica imediatamente os novos dados oficiais no estado
                const novos = req.dados_novos || {};
                const novoNome = novos.nome || novos.name || novos.fullName || novos.nome_completo;
                const novoTel = novos.telefone || novos.phone || novos.whatsapp;
                const novoCpf = novos.cpf;
                const novoEnd = novos.endereco || novos.pickup_address || novos.address || novos.ponto_embarque;
                const novaEmpresa = novos.empresa || novos.company || novos.corporate_company;
                const novoSetor = novos.setor || novos.department;
                const novaMatricula = novos.matricula || novos.employee_registration || novos.employee_id;
                const novoTurno = novos.turno || novos.shift;

                if (novoNome) setName(novoNome);
                if (novoTel) setPhone(novoTel);
                if (novoCpf) setCpf(novoCpf);
                if (novoEnd) setPickupAddress(novoEnd);
                if (novaEmpresa) setCompany(novaEmpresa);
                if (novoSetor) setDepartment(novoSetor);
                if (novaMatricula) setEmployeeRegistration(novaMatricula);
                if (novoTurno) setShift(novoTurno);

                // Limpa pendência local
                if (typeof window !== 'undefined') {
                  try {
                    if (uid) {
                      localStorage.removeItem(`sr_passenger_pending_alt_${uid}`);
                      localStorage.removeItem(`sr_passenger_alt_status_${uid}`);
                    }
                    if (email) {
                      localStorage.removeItem(`sr_passenger_pending_alt_${email}`);
                      localStorage.removeItem(`sr_passenger_alt_status_${email}`);
                    }
                  } catch (_) {}
                }

                // Recarrega o perfil oficial do Supabase
                refreshProfile();
              } else if (req.status === 'Rejeitado' || (req.status as string) === 'rejeitado') {
                setPendingAlteration(req);
                setAlterationStatus('Rejeitado');
                setAlterationRejectionReason(req.motivo_rejeicao || null);
              } else {
                setPendingAlteration(req);
                setAlterationStatus('Aguardando aprovação');
              }
            }
          }
        )
        .subscribe();

      const handleLocalUpdate = (e: any) => {
        if (e.detail) {
          setPendingAlteration(e.detail);
          setAlterationStatus('Aguardando aprovação');
        }
      };
      window.addEventListener('sr_passenger_alteration_updated', handleLocalUpdate);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('sr_passenger_alteration_updated', handleLocalUpdate);
      };
    }
  }, [profile?.id, user?.id, profile?.email, user?.email]);

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
      if (profile.cpf) setCpf(profile.cpf);
      if (profile.employee_registration) setEmployeeRegistration(profile.employee_registration);
      if (profile.shift) setShift(profile.shift);
      if (profile.pickup_address) setPickupAddress(profile.pickup_address);
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

  // Manipulador de Upload de Foto com corte quadrado 1:1, otimização e persistência nativa mobile
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImageType = !file.type || file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|bmp|gif|avif)$/i.test(file.name);
    if (!isImageType) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const optimizedBase64 = await optimizeAvatarImage(file, 400, 0.85);
      setAvatarUrl(optimizedBase64);

      // Persiste imediatamente em todas as camadas locais
      await persistPassengerAvatar({
        userId: profile?.id || user?.id,
        email: profile?.email || user?.email,
        avatarUrl: optimizedBase64,
        isCustom: true
      });

      // Atualiza o estado global e a nuvem com status "Aguardando aprovação" (Pendente)
      await updateProfile({
        avatar_url: optimizedBase64,
        foto_url: optimizedBase64,
        foto_status: 'Pendente',
        photo_status: 'pending',
        is_approved: false
      });

      setIsAvatarModalOpen(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Não foi possível processar esta foto. Tente outra imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      setIsUploadingPhoto(false);
    }
  };

  const handleSelectPresetAvatar = async (url: string) => {
    try {
      setAvatarUrl(url);
      setIsUploadingPhoto(true);

      await persistPassengerAvatar({
        userId: profile?.id || user?.id,
        email: profile?.email || user?.email,
        avatarUrl: url,
        isCustom: false
      });

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

      await clearPersistedPassengerAvatar(profile?.id || user?.id, profile?.email || user?.email);
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

  // Abrir Modal de Dados Pessoais
  const handleOpenPersonalModal = () => {
    setModalName(profile?.name || name || '');
    setModalPhone(profile?.phone || phone || '');
    setModalCpf(profile?.cpf || cpf || '');
    setModalAddress(profile?.pickup_address || pickupAddress || '');
    setModalJustification('');
    setAltSuccessMsg(null);
    setIsPersonalModalOpen(true);
  };

  // Abrir Modal de Dados da Empresa
  const handleOpenCompanyModal = () => {
    setModalCompany(profile?.company || company || 'SR Logística & Transporte');
    setModalDepartment(profile?.department || department || 'Operações e Gestão');
    setModalEmployeeRegistration(profile?.employee_registration || employeeRegistration || '');
    setModalShift(profile?.shift || shift || '');
    setModalCompanyJustification('');
    setAltSuccessMsg(null);
    setIsCompanyModalOpen(true);
  };

  // Submeter Solicitação de Dados Pessoais para Análise
  const handleSubmitPersonalAlteration = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = profile?.id || user?.id;
    const userEmail = profile?.email || user?.email;
    if (!uid && !userEmail) return;

    setIsSubmittingAlt(true);
    try {
      const dadosAnteriores = {
        name: profile?.name || name,
        nome: profile?.name || name,
        nome_completo: profile?.name || name,
        full_name: profile?.name || name,
        phone: profile?.phone || phone,
        telefone: profile?.phone || phone,
        whatsapp: profile?.phone || phone,
        cpf: profile?.cpf || cpf,
        pickup_address: profile?.pickup_address || pickupAddress,
        endereco: profile?.pickup_address || pickupAddress,
        address: profile?.pickup_address || pickupAddress
      };

      const dadosNovos = {
        name: modalName.trim(),
        nome: modalName.trim(),
        nome_completo: modalName.trim(),
        full_name: modalName.trim(),
        phone: modalPhone.trim(),
        telefone: modalPhone.trim(),
        whatsapp: modalPhone.trim(),
        cpf: modalCpf.trim(),
        pickup_address: modalAddress.trim(),
        endereco: modalAddress.trim(),
        address: modalAddress.trim(),
        ponto_embarque: modalAddress.trim()
      };

      const req = await submitPassengerAlteration({
        userId: uid || userEmail || '',
        userEmail: userEmail || undefined,
        userName: modalName.trim() || profile?.name || 'Passageiro',
        tipoAlteracao: 'dados_pessoais',
        dadosAnteriores,
        dadosNovos,
        justificativa: modalJustification.trim()
      });

      setPendingAlteration(req);
      setAlterationStatus('Aguardando aprovação');
      setAltSuccessMsg('Solicitação enviada com sucesso! Aguardando aprovação do administrador.');
      setTimeout(() => {
        setIsPersonalModalOpen(false);
        setAltSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert('Erro ao enviar solicitação: ' + (err.message || 'Falha na conexão'));
    } finally {
      setIsSubmittingAlt(false);
    }
  };

  // Submeter Solicitação de Dados da Empresa para Análise
  const handleSubmitCompanyAlteration = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = profile?.id || user?.id;
    const userEmail = profile?.email || user?.email;
    if (!uid && !userEmail) return;

    setIsSubmittingAlt(true);
    try {
      const dadosAnteriores = {
        company: profile?.company || company,
        empresa: profile?.company || company,
        corporate_company: profile?.company || company,
        department: profile?.department || department,
        setor: profile?.department || department,
        employee_registration: profile?.employee_registration || employeeRegistration,
        matricula: profile?.employee_registration || employeeRegistration,
        shift: profile?.shift || shift,
        turno: profile?.shift || shift
      };

      const dadosNovos = {
        company: modalCompany.trim(),
        empresa: modalCompany.trim(),
        corporate_company: modalCompany.trim(),
        department: modalDepartment.trim(),
        setor: modalDepartment.trim(),
        employee_registration: modalEmployeeRegistration.trim(),
        matricula: modalEmployeeRegistration.trim(),
        shift: modalShift.trim(),
        turno: modalShift.trim()
      };

      const req = await submitPassengerAlteration({
        userId: uid || userEmail || '',
        userEmail: userEmail || undefined,
        userName: profile?.name || name || 'Passageiro',
        tipoAlteracao: 'empresa',
        dadosAnteriores,
        dadosNovos,
        justificativa: modalCompanyJustification.trim()
      });

      setPendingAlteration(req);
      setAlterationStatus('Aguardando aprovação');
      setAltSuccessMsg('Solicitação de vínculo corporativo enviada! Aguardando moderação.');
      setTimeout(() => {
        setIsCompanyModalOpen(false);
        setAltSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert('Erro ao enviar solicitação: ' + (err.message || 'Falha na conexão'));
    } finally {
      setIsSubmittingAlt(false);
    }
  };

  // Alternância rápida de Preferência de Pagamento
  const handleSavePaymentPreference = async (newPref: 'PIX' | 'VOUCHER') => {
    setPaymentPreference(newPref);
    try {
      await updateProfile({ payment_preference: newPref });
    } catch (e) {
      console.warn('Aviso ao salvar preferência de pagamento:', e);
    }
  };

  const isRejected =
    profile?.foto_status === 'Rejeitada' ||
    profile?.photo_status === 'rejected' ||
    profile?.status === 'blocked';

  const isPhotoPending =
    profile?.foto_status === 'Pendente' ||
    profile?.photo_status === 'pending' ||
    profile?.status === 'pending';

  const isApproved =
    !isRejected &&
    (profile?.is_approved === true || profile?.status === 'active') &&
    profile?.foto_status !== 'Pendente' &&
    profile?.photo_status !== 'pending';

  // Somente administrador master explicitamente verificado
  const isMasterRole = Boolean(
    profile?.role === 'admin' ||
    user?.app_metadata?.role === 'admin' ||
    user?.user_metadata?.role === 'admin'
  );
  const isExcludedRole = profile?.role === 'passenger' || profile?.role === 'driver';
  const isAdmin = Boolean(isMasterRole && !isExcludedRole);

  const isPersonalPending =
    (alterationStatus === 'Aguardando aprovação' || profile?.solicitacao_pendente === true) &&
    alterationStatus !== 'Aprovado';

  const isPersonalRejected =
    alterationStatus === 'Rejeitado' ||
    Boolean(alterationRejectionReason);

  const pendingPersonalData = pendingAlteration?.dados_novos;

  return (
    <div className="flex flex-col min-h-dvh p-4 sm:p-5 space-y-4 pb-28 max-w-lg mx-auto w-full">
      {/* Input de Arquivo Oculto para Galeria/Arquivos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Input de Arquivo Oculto para Câmera Direta do Celular */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="user"
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

      {/* 1. Alerta de Foto / Documentação Rejeitada pelo Administrador com Motivo */}
      {isRejected && (
        <div className="rounded-3xl border-2 border-red-500/50 bg-gradient-to-br from-red-500/15 via-red-500/5 to-transparent p-5 space-y-3.5 shadow-lg shadow-red-500/5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white font-black shadow-md shadow-red-500/30">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 text-[10px] font-black">
                  Foto / Documentação Não Aprovada
                </Badge>
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                Reenvio de Foto / Documento Necessário
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Sua foto ou documentação foi analisada pela administração da SR Logística e precisa de reenvio com as correções abaixo.
              </p>
            </div>
          </div>

          {/* Motivo informado pelo Administrador */}
          <div className="rounded-2xl bg-white dark:bg-dark-900 border border-red-200 dark:border-red-900/50 p-3.5 space-y-1 text-xs">
            <span className="font-bold text-red-600 dark:text-red-400 text-[11px] uppercase tracking-wider block">
              Motivo informado pelo Administrador:
            </span>
            <p className="text-slate-900 dark:text-slate-100 font-semibold italic">
              "{profile?.motivo_rejeicao || profile?.rejection_reason || 'Foto fora do padrão exigido ou ilegível. Por favor, envie uma foto nítida e bem iluminada do seu rosto.'}"
            </p>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsAvatarModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-black flex items-center justify-center gap-2 shadow-md shadow-red-500/20 py-2.5"
            >
              <Camera size={16} /> Reenviar Foto Agora
            </Button>
            <button
              type="button"
              onClick={() => setIsPendingModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-dark-600 transition"
            >
              <HelpCircle size={14} /> Falar com Central / Suporte
            </button>
          </div>
        </div>
      )}

      {/* 2. Banner Informativo de Status da Foto "Aguardando aprovação" */}
      {!isApproved && !isRejected && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-4 space-y-2.5 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-dark-950 font-black shadow-md shadow-amber-500/20">
              <Clock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-black">
                  Aguardando aprovação
                </Badge>
              </div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white mt-1">
                Foto e Cadastro em Análise pela Central
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Sua foto de perfil foi enviada para validação. O status permanecerá como <strong>"Aguardando aprovação"</strong> até que o administrador aprove ou rejeite no painel administrativo.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Precisa de homologação prioritária?
            </span>
            <button
              type="button"
              onClick={() => setIsPendingModalOpen(true)}
              className="font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
            >
              Ver Detalhes / WhatsApp <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

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
              className={`h-20 w-20 rounded-3xl object-cover border-2 shadow-md transition-transform duration-200 group-hover:scale-105 ${
                isRejected
                  ? 'border-red-500 shadow-red-500/20'
                  : !isApproved
                  ? 'border-amber-500 shadow-amber-500/20'
                  : 'border-brand shadow-brand/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              disabled={isUploadingPhoto}
              className={`absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-2xl font-bold border-2 border-white dark:border-dark-800 shadow-lg hover:scale-110 active:scale-95 transition-all ${
                isRejected
                  ? 'bg-red-600 text-white'
                  : 'bg-brand text-dark-950'
              }`}
              title="Trocar foto de perfil"
            >
              {isUploadingPhoto ? (
                <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
              {isApproved && <CheckCircle2 size={16} className="text-brand shrink-0" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <Mail size={12} /> {profile?.email}
            </p>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {isApproved ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-black">
                  ✓ Foto & Conta Homologada
                </Badge>
              ) : isRejected ? (
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 px-2.5 py-0.5 text-[10px] font-bold"
                >
                  <AlertCircle size={10} /> Foto Rejeitada: Reenviar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPendingModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold"
                >
                  <Clock size={10} /> Aguardando aprovação
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

      {/* ========================================================================= */}
      {/* 1. CARD DADOS PESSOAIS (MODO SOMENTE LEITURA + BOTÃO POP-UP DE MODERAÇÃO) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-dark-800 rounded-3xl p-5 border border-slate-200/80 dark:border-dark-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={16} className="text-brand" />
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              DADOS PESSOAIS
            </h3>
          </div>
          {isPersonalPending ? (
            <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
              <Clock size={11} />
              <span>Em análise</span>
            </span>
          ) : isPersonalRejected ? (
            <span className="inline-flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
              <AlertTriangle size={11} />
              <span>Alteração Recusada</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <Lock size={10} /> Protegido
            </span>
          )}
        </div>

        {/* BANNER EM ANÁLISE */}
        {isPersonalPending && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
              <Clock size={16} className="shrink-0 animate-pulse" />
              <span>Alteração aguardando aprovação</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
              Sua solicitação de alteração cadastral está sob análise do administrador. Os dados oficiais abaixo continuam vigentes até a aprovação pelo site.
            </p>
            {pendingPersonalData && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-1">
                <span className="font-bold block text-amber-900 dark:text-amber-200">Novos dados enviados:</span>
                {pendingPersonalData.name && <div>• Nome: <strong>{pendingPersonalData.name}</strong></div>}
                {pendingPersonalData.cpf && <div>• CPF: <strong>{pendingPersonalData.cpf}</strong></div>}
                {pendingPersonalData.phone && <div>• Telefone: <strong>{pendingPersonalData.phone}</strong></div>}
                {pendingPersonalData.pickup_address && <div>• Endereço: <strong>{pendingPersonalData.pickup_address}</strong></div>}
              </div>
            )}
          </div>
        )}

        {/* BANNER RECUSADO */}
        {isPersonalRejected && (
          <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-900 dark:text-red-200 space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-red-700 dark:text-red-400">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Alteração recusada pelo administrador</span>
            </div>
            <p className="text-[11px] text-red-800 dark:text-red-300 leading-relaxed">
              {alterationRejectionReason || 'Os dados informados não puderam ser homologados. Por favor, solicite uma nova alteração com as informações corretas.'}
            </p>
          </div>
        )}

        {/* FICHA CADASTRAL FIXA (SOMENTE LEITURA) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-900/50 border border-slate-100 dark:border-dark-700/60 space-y-3">
          <div className="border-b border-slate-200/60 dark:border-dark-700/60 pb-2.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Nome Completo (Conforme Documento)
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {profile?.name || name || 'Não informado'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 border-b border-slate-200/60 dark:border-dark-700/60 pb-2.5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                CPF
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                {profile?.cpf || cpf || '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                Telefone / WhatsApp
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profile?.phone || phone || '—'}
              </span>
            </div>
          </div>

          <div className="border-b border-slate-200/60 dark:border-dark-700/60 pb-2.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              E-mail Oficial (Autenticado)
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
              {profile?.email || user?.email || '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Endereço Cadastrado / Ponto de Embarque
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed block">
              {profile?.pickup_address || pickupAddress || 'Endereço em Manaus - AM'}
            </span>
          </div>
        </div>

        {/* BOTÃO DE AÇÃO: ABRIR POP-UP DE EDIÇÃO */}
        <div>
          {isPersonalPending ? (
            <button
              type="button"
              disabled
              className="w-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs border border-amber-500/30 cursor-not-allowed opacity-90"
            >
              <Clock size={15} className="animate-pulse text-amber-600" />
              <span>Alteração aguardando aprovação do administrador</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenPersonalModal}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] active:scale-[0.98] text-slate-950 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md shadow-amber-500/20 transition duration-200"
            >
              <Edit3 size={15} />
              <span>Solicitar Alteração de Dados Pessoais</span>
            </button>
          )}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2 font-medium">
            🔒 Dados fixos protegidos. Edições passam por validação prévia da central.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD DADOS DA EMPRESA (MODO SOMENTE LEITURA + BOTÃO POP-UP DE MODERAÇÃO) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-dark-800 rounded-3xl p-5 border border-slate-200/80 dark:border-dark-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-brand" />
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              DADOS DA EMPRESA / CONVÊNIO
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            <Lock size={10} /> Auditado
          </span>
        </div>

        {/* FICHA CADASTRAL DA EMPRESA (SOMENTE LEITURA) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-900/50 border border-slate-100 dark:border-dark-700/60 space-y-3">
          <div className="border-b border-slate-200/60 dark:border-dark-700/60 pb-2.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              Empresa Conveniada / Razão Social
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {profile?.company || company || 'SR Logística & Transporte'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 border-b border-slate-200/60 dark:border-dark-700/60 pb-2.5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                Setor / Lotação
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profile?.department || department || 'Operações e Gestão'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                Matrícula Funcional
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                {profile?.employee_registration || employeeRegistration || '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                Turno de Trabalho
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {profile?.shift || shift || 'Comercial / Geral'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                Voucher Corporativo
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> {profile?.voucher_habilitado !== false ? 'Habilitado' : 'Sob Análise'}
              </span>
            </div>
          </div>
        </div>

        {/* BOTÃO DE AÇÃO: ABRIR POP-UP DE EMPRESA */}
        <div>
          <button
            type="button"
            onClick={handleOpenCompanyModal}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-dark-700 dark:hover:bg-dark-600 active:scale-[0.98] text-slate-900 dark:text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs border border-slate-200 dark:border-dark-600 transition duration-200"
          >
            <Building2 size={15} className="text-brand" />
            <span>Solicitar Alteração da Empresa</span>
          </button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2 font-medium">
            🔒 Vínculo corporativo auditado pela SR Logística e Empresa Conveniada.
          </p>
        </div>
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
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 transition text-left text-xs font-black"
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-amber-600 dark:text-amber-400" />
              <span>Vincular Passageiro a Empresa Conveniada (Admin)</span>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 3. FORMA DE PAGAMENTO PREFERENCIAL */}
      <div className="bg-white dark:bg-dark-800 rounded-3xl p-5 border border-slate-200/80 dark:border-dark-700/80 shadow-sm space-y-3">
        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Forma de Pagamento Preferencial
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSavePaymentPreference('PIX')}
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
            onClick={() => handleSavePaymentPreference('VOUCHER')}
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

      {/* 4. SEGURANÇA & ENTRADA POR DIGITAL / BIOMETRIA */}
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
          {bioEnrolled ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisableBiometrics}
              className="text-red-500 hover:text-red-600 border-red-200 dark:border-red-900/50 py-2"
            >
              Remover Biometria deste Aparelho
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={bioLoading}
              onClick={handleEnableBiometrics}
              className="py-2 font-bold"
            >
              {bioLoading ? 'Registrando...' : 'Cadastrar Biometria'}
            </Button>
          )}
        </div>
      </div>

      {/* 5. AÇÕES RÁPIDAS (INSTALAR, SUPORTE, LOGOUT) */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={handleInstallApp}
          className="w-full flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700/80 hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-all text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Smartphone size={18} />
            </div>
            <span>Instalar Aplicativo no Celular (Android / APK)</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setIsSupportOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-dark-800 border border-slate-200/80 dark:border-dark-700/80 hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-all text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-dark-700 text-slate-600 dark:text-slate-300">
              <HelpCircle size={18} />
            </div>
            <span>Central de Suporte & Termos de Uso</span>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 p-3.5 rounded-3xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all"
        >
          <LogOut size={16} /> Encerrar Sessão
        </button>
      </div>

      {/* ========================================================================= */}
      {/* POP-UP / MODAL 1: SOLICITAR ALTERAÇÃO DE DADOS PESSOAIS */}
      {/* ========================================================================= */}
      {isPersonalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-dark-800 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#F59E0B]" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Solicitar Alteração Cadastral
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPersonalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aviso Explícito de Moderação */}
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300">
                <Lock size={14} />
                <span>Moderação Administrativa</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                Por segurança e conformidade cadastral, qualquer alteração nestes dados será submetida para aprovação do administrador no painel web. Seus dados atuais continuarão válidos até a homologação.
              </p>
            </div>

            {altSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✓ {altSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSubmitPersonalAlteration} className="space-y-3 text-xs">
              <Field label="Nome Completo">
                <Input
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="Nome completo conforme documento"
                  required
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="Telefone / WhatsApp">
                  <Input
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    placeholder="(92) 99999-9999"
                    required
                  />
                </Field>

                <Field label="CPF (Documento)">
                  <Input
                    value={modalCpf}
                    onChange={(e) => setModalCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </Field>
              </div>

              <Field label="Endereço Residencial / Ponto de Embarque">
                <Input
                  value={modalAddress}
                  onChange={(e) => setModalAddress(e.target.value)}
                  placeholder="Rua, número, bairro em Manaus"
                />
              </Field>

              <Field label="Justificativa da Alteração (Opcional)">
                <textarea
                  value={modalJustification}
                  onChange={(e) => setModalJustification(e.target.value)}
                  rows={2}
                  placeholder="Ex: Mudança de endereço de residência ou correção de telefone..."
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsPersonalModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmittingAlt}
                  className="bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black"
                >
                  {isSubmittingAlt ? 'Enviando...' : 'Enviar para Análise'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP / MODAL 2: SOLICITAR ALTERAÇÃO DE DADOS DA EMPRESA */}
      {/* ========================================================================= */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-dark-800 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-brand" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Solicitar Alteração da Empresa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aviso Explícito de Moderação Corporativa */}
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300">
                <Building size={14} />
                <span>Auditoria de Convênio Corporativo</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                A vinculação ou troca de empresa conveniada e matrícula funcional requer validação do setor de logística da SR e do convênio da empresa.
              </p>
            </div>

            {altSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✓ {altSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSubmitCompanyAlteration} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Empresa Conveniada</label>
                <select
                  value={partnerCompanies.some(c => c.name === modalCompany) ? modalCompany : 'Outra'}
                  onChange={(e) => {
                    if (e.target.value !== 'Outra') {
                      setModalCompany(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 py-2.5 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand mb-2"
                >
                  {partnerCompanies.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.name}</option>
                  ))}
                  <option value="Outra">Outra / Digitar Manualmente</option>
                </select>

                <Input
                  value={modalCompany}
                  onChange={(e) => setModalCompany(e.target.value)}
                  placeholder="Nome ou Razão Social da Empresa"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="Setor / Departamento">
                  <Input
                    value={modalDepartment}
                    onChange={(e) => setModalDepartment(e.target.value)}
                    placeholder="Ex: Operações, Produção, TI"
                  />
                </Field>

                <Field label="Matrícula Funcional">
                  <Input
                    value={modalEmployeeRegistration}
                    onChange={(e) => setModalEmployeeRegistration(e.target.value)}
                    placeholder="Ex: MAT-9876"
                  />
                </Field>
              </div>

              <Field label="Turno de Trabalho">
                <Input
                  value={modalShift}
                  onChange={(e) => setModalShift(e.target.value)}
                  placeholder="Ex: 1º Turno (06h - 14h)"
                />
              </Field>

              <Field label="Justificativa da Alteração (Opcional)">
                <textarea
                  value={modalCompanyJustification}
                  onChange={(e) => setModalCompanyJustification(e.target.value)}
                  rows={2}
                  placeholder="Ex: Transferência de departamento ou nova empresa conveniada..."
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsCompanyModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmittingAlt}
                  className="bg-brand hover:bg-brand-hover text-dark-950 font-black"
                >
                  {isSubmittingAlt ? 'Enviando...' : 'Enviar para Análise'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE FOTO DE PERFIL */}
      {/* ========================================================================= */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-dark-800 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-700 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-brand" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Foto de Perfil do Passageiro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1"
              >
                Fechar
              </button>
            </div>

            {/* Aviso de Aprovação de Foto */}
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <Clock size={14} />
                <span>Validação pela Central SR Logística</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                Ao enviar uma foto pessoal, ela ficará com status <strong>"Aguardando aprovação"</strong> até ser homologada pelo administrador no painel web.
              </p>
            </div>

            {/* Botões de Ação para Foto */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-brand/10 hover:bg-brand/20 transition-all text-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-dark-950 font-bold shadow-sm">
                  <Camera size={16} />
                </div>
                <div>
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 block">Tirar Foto</span>
                  <span className="text-[9px] text-slate-400">Câmera Celular</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-900/60 hover:bg-slate-100 dark:hover:bg-dark-700 transition-all text-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-200 font-bold shadow-sm">
                  <Upload size={16} />
                </div>
                <div>
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 block">Galeria / PC</span>
                  <span className="text-[9px] text-slate-400">JPG, PNG, WebP</span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-slate-200 dark:border-dark-700 bg-slate-50 dark:bg-dark-900/50 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-center group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-dark-700 text-slate-600 dark:text-slate-300 group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Trash2 size={16} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-red-500 block">Remover</span>
                  <span className="text-[9px] text-slate-400">Restaurar</span>
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
                type="button"
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
                type="button"
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
