'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PassengerProfile } from '@/types';
import {
  persistPassengerAvatar,
  getPersistedPassengerAvatar,
  getInstantSyncPassengerAvatar,
  resolveBestAvatar,
  createCompactAvatarThumbnail,
  uploadAvatarToSupabaseStorage,
  isCustomAvatar,
  DEFAULT_AVATAR_URL
} from '@/lib/avatar-storage';

interface AuthContextType {
  user: any | null;
  profile: PassengerProfile | null;
  loading: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<PassengerProfile>) => Promise<void>;
  loginAsGuest: (custom?: Partial<PassengerProfile>) => Promise<void>;
}

const DEFAULT_PROFILE: PassengerProfile = {
  id: '',
  name: 'Passageiro',
  email: '',
  phone: '',
  role: 'passenger',
  avatar_url: DEFAULT_AVATAR_URL,
  rating: 5.0,
  total_rides: 0,
  payment_preference: 'VOUCHER',
  status: 'active',
  is_approved: true,
  created_at: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isLoading: true,
  signOut: async () => {},
  updateProfile: async () => {},
  loginAsGuest: async () => {}
});

function getInitialCachedSession(): { user: any | null; profile: PassengerProfile | null } {
  if (typeof window === 'undefined') return { user: null, profile: null };
  try {
    const raw = localStorage.getItem('sr_passenger_active_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed?.user &&
        parsed?.user?.id !== 'passenger-demo-user' &&
        parsed?.user?.id !== 'passenger-active-user' &&
        parsed?.user?.email !== 'passageiro@srlogistica.com.br' &&
        parsed?.profile?.name !== 'Passageiro SR'
      ) {
        const instantAvatar = getInstantSyncPassengerAvatar(parsed.user.id, parsed.user.email);
        const resolvedAvatar = resolveBestAvatar({
          persistedAvatar: instantAvatar,
          instantAvatar: instantAvatar,
          metaAvatar: parsed.user?.user_metadata?.avatar_url,
          defaultAvatar: parsed.profile?.avatar_url || DEFAULT_AVATAR_URL
        });

        const mergedProfile = parsed.profile
          ? { ...parsed.profile, avatar_url: resolvedAvatar }
          : null;
        return { user: parsed.user, profile: mergedProfile };
      }
    }
  } catch (_) {}
  return { user: null, profile: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialCache = getInitialCachedSession();
  const [user, setUser] = useState<any | null>(initialCache.user);
  const [profile, setProfile] = useState<PassengerProfile | null>(initialCache.profile);
  const [loading, setLoading] = useState(true);

  // Escuta atualizações de avatar em tempo real disparadas por qualquer aba ou componente
  useEffect(() => {
    const handleAvatarUpdated = (e: any) => {
      const newUrl = e?.detail?.avatarUrl;
      if (newUrl) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: newUrl } : null));
      }
    };
    window.addEventListener('sr_avatar_updated', handleAvatarUpdated);
    return () => window.removeEventListener('sr_avatar_updated', handleAvatarUpdated);
  }, []);

  const fetchProfile = async (currentUser: any) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      let profData: any = null;
      let passData: any = null;

      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
        profData = data;
      } catch (_) {}

      if (!profData && currentUser.email) {
        try {
          const { data } = await supabase.from('profiles').select('*').eq('email', currentUser.email).maybeSingle();
          profData = data;
        } catch (_) {}
      }

      try {
        if (currentUser.email) {
          const { data } = await supabase.from('passageiros').select('*').eq('email', currentUser.email).maybeSingle();
          passData = data;
        }
        if (!passData) {
          const { data } = await supabase.from('passageiros').select('*').eq('id', currentUser.id).maybeSingle();
          passData = data;
        }
      } catch (_) {}

      const userMeta = currentUser.user_metadata || {};
      const appMeta = currentUser.app_metadata || {};

      const isAdmin = userMeta.role === 'admin' || appMeta.role === 'admin' || profData?.role === 'admin';

      // Avaliação rigorosa da aprovação de perfil, empresa e vínculo:
      // Se houver registro na tabela 'passageiros', a decisão do painel administrativo é a fonte soberana
      let isApproved = false;
      if (isAdmin) {
        isApproved = true;
      } else if (passData) {
        isApproved = 
          (passData.status === 'Aprovado' || passData.status === 'aprovado' || passData.is_approved === true) &&
          passData.status !== 'Pendente' &&
          passData.status !== 'pendente' &&
          passData.status !== 'Rejeitado';
      } else if (profData) {
        isApproved = 
          (profData.is_approved === true || profData.approved === true || profData.status === 'active' || profData.status === 'approved') &&
          profData.status !== 'pending' &&
          profData.status !== 'blocked';
      } else {
        isApproved = userMeta.is_approved === true && userMeta.status !== 'pending';
      }

      const statusVal = isAdmin 
        ? 'active' 
        : (isApproved ? 'active' : (passData?.status === 'Rejeitado' || profData?.status === 'blocked' ? 'blocked' : 'pending'));

      const nameVal = 
        profData?.name || 
        profData?.nome || 
        passData?.nome_social || 
        passData?.nome || 
        userMeta.name || 
        userMeta.nome || 
        currentUser.email?.split('@')[0] || 
        'Passageiro';

      const phoneVal = 
        profData?.phone || 
        profData?.telefone || 
        passData?.telefone || 
        userMeta.phone || 
        userMeta.telefone || 
        '';

      // Resolução inteligente e protegida da imagem de perfil:
      // Protege fotos customizadas do usuário contra sobreposição de URLs genéricas
      const metaAvatar = userMeta.avatar_url || userMeta.foto || userMeta.avatar;
      const dbAvatar = profData?.avatar_url || profData?.avatar || profData?.foto || profData?.foto_url || passData?.avatar_url || passData?.foto || passData?.foto_url;
      const persistedAvatar = await getPersistedPassengerAvatar(currentUser.id, currentUser.email);
      const instantAvatar = getInstantSyncPassengerAvatar(currentUser.id, currentUser.email);

      const avatarVal = resolveBestAvatar({
        metaAvatar,
        dbAvatar,
        persistedAvatar,
        instantAvatar,
        defaultAvatar: DEFAULT_AVATAR_URL
      });

      // Se a foto local for personalizada mas o Auth em nuvem ainda não tiver, sincroniza em background
      if (avatarVal && isCustomAvatar(avatarVal) && (!metaAvatar || metaAvatar === DEFAULT_AVATAR_URL)) {
        try {
          const compactThumb = avatarVal.startsWith('data:image/')
            ? await createCompactAvatarThumbnail(avatarVal)
            : avatarVal;
          supabase.auth.updateUser({
            data: { avatar_url: compactThumb, foto: compactThumb, avatar: compactThumb }
          }).catch(() => {});
        } catch (_) {}
      }

      // Fixa o avatar resolvido no armazenamento local
      if (avatarVal && avatarVal !== DEFAULT_AVATAR_URL) {
        await persistPassengerAvatar({
          userId: currentUser.id,
          email: currentUser.email,
          avatarUrl: avatarVal
        });
      }

      const companyVal = 
        profData?.company || 
        profData?.empresa || 
        passData?.empresa || 
        userMeta.company || 
        userMeta.empresa || 
        '';

      const deptVal = 
        profData?.department || 
        profData?.setor || 
        passData?.setor || 
        userMeta.department || 
        userMeta.setor || 
        '';

      const cpfVal = passData?.cpf || profData?.cpf || userMeta.cpf || '';
      const matriculaVal = passData?.matricula || profData?.matricula || profData?.employee_registration || userMeta.matricula || '';
      const turnoVal = passData?.turno || profData?.turno || profData?.shift || userMeta.turno || '';
      const enderecoVal = passData?.endereco || profData?.endereco || profData?.pickup_address || userMeta.endereco || '';

      const roleVal = profData?.role || appMeta.role || userMeta.role || 'passenger';
      const prefVal = (profData?.payment_preference || userMeta.payment_preference || 'VOUCHER') as 'PIX' | 'VOUCHER';

      const finalProfile: PassengerProfile = {
        id: currentUser.id,
        name: nameVal,
        email: currentUser.email || '',
        phone: phoneVal,
        cpf: cpfVal || undefined,
        employee_registration: matriculaVal || undefined,
        shift: turnoVal || undefined,
        pickup_address: enderecoVal || undefined,
        role: roleVal,
        avatar_url: avatarVal,
        company: companyVal || undefined,
        corporate_company: companyVal || undefined,
        department: deptVal || undefined,
        rating: 5.0,
        total_rides: passData?.total_rides || 0,
        payment_preference: prefVal,
        status: statusVal as 'active' | 'pending' | 'blocked',
        is_approved: isApproved,
        created_at: currentUser.created_at || new Date().toISOString()
      };

      setProfile(finalProfile);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'sr_passenger_active_session',
            JSON.stringify({ user: currentUser, profile: finalProfile })
          );
        } catch (_) {}
      }
    } catch {
      const fallbackInstantAvatar = getInstantSyncPassengerAvatar(currentUser.id, currentUser.email) || DEFAULT_AVATAR_URL;
      const fallbackProf = {
        ...DEFAULT_PROFILE,
        id: currentUser.id,
        email: currentUser.email,
        avatar_url: fallbackInstantAvatar
      };
      setProfile(fallbackProf);
    }
  };

  useEffect(() => {
    let mounted = true;

    const verifyActiveSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (mounted) {
          if (currentUser) {
            setUser(currentUser);
            await fetchProfile(currentUser);
          } else {
            // Verifica sessão local salva (mantém logado no celular / PWA / APK e transição de páginas)
            let savedLocalSession: any = null;
            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem('sr_passenger_active_session');
                if (raw) {
                  savedLocalSession = JSON.parse(raw);
                  if (
                    savedLocalSession?.user?.id === 'passenger-demo-user' ||
                    savedLocalSession?.user?.id === 'passenger-active-user' ||
                    savedLocalSession?.user?.email === 'passageiro@srlogistica.com.br' ||
                    savedLocalSession?.profile?.name === 'Passageiro SR'
                  ) {
                    localStorage.removeItem('sr_passenger_active_session');
                    savedLocalSession = null;
                  }
                }
              } catch (_) {}
            }

            if (savedLocalSession?.user) {
              const instantAvatar = getInstantSyncPassengerAvatar(savedLocalSession.user.id, savedLocalSession.user.email);
              const restoredProfile = {
                ...(savedLocalSession.profile || DEFAULT_PROFILE),
                avatar_url: instantAvatar || savedLocalSession.profile?.avatar_url || DEFAULT_AVATAR_URL
              };
              setUser(savedLocalSession.user);
              setProfile(restoredProfile);
            } else {
              setUser(null);
              setProfile(null);
            }
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          let savedLocalSession: any = null;
          if (typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem('sr_passenger_active_session');
              if (raw) {
                savedLocalSession = JSON.parse(raw);
                if (
                  savedLocalSession?.user?.id === 'passenger-demo-user' ||
                  savedLocalSession?.user?.id === 'passenger-active-user' ||
                  savedLocalSession?.user?.email === 'passageiro@srlogistica.com.br' ||
                  savedLocalSession?.profile?.name === 'Passageiro SR'
                ) {
                  localStorage.removeItem('sr_passenger_active_session');
                  savedLocalSession = null;
                }
              }
            } catch (_) {}
          }

          if (savedLocalSession?.user) {
            const instantAvatar = getInstantSyncPassengerAvatar(savedLocalSession.user.id, savedLocalSession.user.email);
            const restoredProfile = {
              ...(savedLocalSession.profile || DEFAULT_PROFILE),
              avatar_url: instantAvatar || savedLocalSession.profile?.avatar_url || DEFAULT_AVATAR_URL
            };
            setUser(savedLocalSession.user);
            setProfile(restoredProfile);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      }
    };

    verifyActiveSession();

    const subRes = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        let savedLocalSession: any = null;
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('sr_passenger_active_session');
            if (raw) {
              savedLocalSession = JSON.parse(raw);
              if (
                savedLocalSession?.user?.id === 'passenger-demo-user' ||
                savedLocalSession?.user?.id === 'passenger-active-user' ||
                savedLocalSession?.user?.email === 'passageiro@srlogistica.com.br' ||
                savedLocalSession?.profile?.name === 'Passageiro SR'
              ) {
                localStorage.removeItem('sr_passenger_active_session');
                savedLocalSession = null;
              }
            }
          } catch (_) {}
        }

        if (savedLocalSession?.user) {
          const instantAvatar = getInstantSyncPassengerAvatar(savedLocalSession.user.id, savedLocalSession.user.email);
          const restoredProfile = {
            ...(savedLocalSession.profile || DEFAULT_PROFILE),
            avatar_url: instantAvatar || savedLocalSession.profile?.avatar_url || DEFAULT_AVATAR_URL
          };
          setUser(savedLocalSession.user);
          setProfile(restoredProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    // Realtime: ouve atualizações nas tabelas passageiros e profiles
    const passChannel = supabase
      .channel('public:auth_approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'passageiros' }, async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) fetchProfile(currentUser);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) fetchProfile(currentUser);
      })
      .subscribe();

    return () => {
      mounted = false;
      if (subRes?.data?.subscription?.unsubscribe) {
        subRes.data.subscription.unsubscribe();
      }
      if (passChannel) supabase.removeChannel(passChannel);
    };
  }, []);

  const loginAsGuest = async (_custom?: Partial<PassengerProfile>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('sr_passenger_active_session');
      } catch (_) {}
    }
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    if (typeof document !== 'undefined') {
      document.cookie = 'sb-passenger-token=; path=/; max-age=0';
      document.cookie = 'sr-demo-passenger-session=; path=/; max-age=0';
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('sr-passenger-active-trip');
        localStorage.removeItem('sr_passenger_active_session');
      } catch (_) {}
      window.location.href = '/welcome';
    }
  };

  const updateProfile = async (updates: Partial<PassengerProfile>) => {
    const currentProf = profile || DEFAULT_PROFILE;
    const isUserAdmin = currentProf.role === 'admin' || user?.user_metadata?.role === 'admin';

    // Se houver alteração em dados de perfil, empresa ou vínculo, e não for admin, coloca em análise
    const hasCompanyOrProfileChanges =
      (updates.company !== undefined && updates.company !== currentProf.company) ||
      (updates.department !== undefined && updates.department !== currentProf.department) ||
      (updates.name !== undefined && updates.name !== currentProf.name) ||
      (updates.phone !== undefined && updates.phone !== currentProf.phone) ||
      (updates.cpf !== undefined && updates.cpf !== currentProf.cpf) ||
      (updates.employee_registration !== undefined && updates.employee_registration !== currentProf.employee_registration) ||
      (updates.shift !== undefined && updates.shift !== currentProf.shift) ||
      (updates.pickup_address !== undefined && updates.pickup_address !== currentProf.pickup_address);

    const nextStatus = updates.status !== undefined
      ? updates.status
      : (!isUserAdmin && hasCompanyOrProfileChanges ? 'pending' : (currentProf.status || 'pending'));

    const nextIsApproved = updates.is_approved !== undefined
      ? updates.is_approved
      : (!isUserAdmin && hasCompanyOrProfileChanges ? false : (currentProf.is_approved ?? false));

    const next: PassengerProfile = {
      ...currentProf,
      ...updates,
      status: nextStatus as 'active' | 'pending' | 'blocked',
      is_approved: nextIsApproved
    };

    setProfile(next);

    const activeUserId = user?.id || next.id;
    const activeUserEmail = user?.email || next.email;

    // 1. Salva a imagem de perfil no armazenamento multicamadas local com prioridade absoluta
    if (next.avatar_url) {
      await persistPassengerAvatar({
        userId: activeUserId,
        email: activeUserEmail,
        avatarUrl: next.avatar_url
      });
    }

    // 2. Salva cópia local da sessão completa para carregamento instantâneo offline/ao reabrir
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'sr_passenger_active_session',
          JSON.stringify({ user: user || { id: activeUserId, email: activeUserEmail }, profile: next })
        );
        if (activeUserId) {
          localStorage.setItem(`sr-passenger-profile-${activeUserId}`, JSON.stringify(next));
        }
      } catch (_) {}
    }

    try {
      if (isSupabaseConfigured && (user || activeUserId)) {
        // 1. Processa a foto: tenta upload para o Supabase Storage público e gera miniatura
        let cloudAvatarUrl = next.avatar_url;
        let compactCloudAvatar = next.avatar_url;

        if (next.avatar_url && (next.avatar_url.startsWith('data:image/') || next.avatar_url.startsWith('blob:'))) {
          try {
            // Tenta enviar para o Supabase Storage para gerar uma URL pública direta da foto
            const storageUrl = await uploadAvatarToSupabaseStorage(activeUserId || 'user', next.avatar_url);
            if (storageUrl) {
              cloudAvatarUrl = storageUrl;
              compactCloudAvatar = storageUrl;
            } else {
              compactCloudAvatar = await createCompactAvatarThumbnail(next.avatar_url);
              cloudAvatarUrl = compactCloudAvatar;
            }
          } catch (_) {
            compactCloudAvatar = next.avatar_url;
            cloudAvatarUrl = next.avatar_url;
          }
        }

        // 2. Atualiza nos metadados do Auth do Supabase (armazenamento persistente em nuvem)
        try {
          await supabase.auth.updateUser({
            data: {
              name: next.name,
              nome: next.name,
              phone: next.phone,
              telefone: next.phone,
              cpf: next.cpf,
              matricula: next.employee_registration,
              turno: next.shift,
              endereco: next.pickup_address,
              avatar_url: cloudAvatarUrl,
              foto: cloudAvatarUrl,
              foto_url: cloudAvatarUrl,
              avatar: cloudAvatarUrl,
              company: next.company,
              empresa: next.company,
              department: next.department,
              setor: next.department,
              payment_preference: next.payment_preference,
              status: next.status,
              is_approved: next.is_approved
            }
          });
        } catch (e) {
          console.warn('Aviso ao atualizar metadados do Auth:', e);
        }

        // 3. Atualiza ou insere na tabela profiles (incluindo foto e avatar_url)
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: activeUserId,
              email: activeUserEmail,
              name: next.name,
              nome: next.name,
              phone: next.phone,
              telefone: next.phone,
              cpf: next.cpf,
              avatar_url: cloudAvatarUrl || null,
              foto: cloudAvatarUrl || null,
              foto_url: cloudAvatarUrl || null,
              avatar: cloudAvatarUrl || null,
              role: next.role || 'passenger',
              status: next.status,
              is_approved: next.is_approved
            });
        } catch (_) {}

        // 4. Atualiza na tabela passageiros (fila de aprovação do painel admin com foto visível)
        try {
          const passStatus = next.is_approved ? 'Aprovado' : 'Pendente';
          const passPayload: any = {
            id: activeUserId,
            nome: next.name,
            nome_social: next.name?.split(' ')[0],
            nome_completo: next.name,
            telefone: next.phone,
            email: activeUserEmail,
            cpf: next.cpf || null,
            matricula: next.employee_registration || null,
            turno: next.shift || null,
            endereco: next.pickup_address || null,
            empresa: next.company || 'Passageiro Particular',
            setor: next.department || 'Operações / Geral',
            foto: cloudAvatarUrl || null,
            foto_url: cloudAvatarUrl || null,
            avatar_url: cloudAvatarUrl || null,
            avatar: cloudAvatarUrl || null,
            origem: hasCompanyOrProfileChanges ? 'Atualização de Perfil via App' : 'App Passageiro',
            status: passStatus,
            is_approved: next.is_approved,
            updated_at: new Date().toISOString()
          };

          const { error: errId } = await supabase
            .from('passageiros')
            .upsert(passPayload);

          if (errId && activeUserEmail) {
            await supabase
              .from('passageiros')
              .update(passPayload)
              .eq('email', activeUserEmail);
          }
        } catch (_) {}
      }
    } catch (err) {
      console.error('Erro ao atualizar perfil no backend:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isLoading: loading, signOut, updateProfile, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      profile: null,
      loading: false,
      isLoading: false,
      signOut: async () => {},
      updateProfile: async () => {},
      loginAsGuest: async () => {}
    };
  }
  return context;
}
