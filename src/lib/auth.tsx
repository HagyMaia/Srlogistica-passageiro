'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PassengerProfile } from '@/types';
import {
  persistPassengerAvatar,
  getPersistedPassengerAvatar,
  getInstantSyncPassengerAvatar,
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
  payment_preference: 'PIX',
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
        // Encontra o avatar mais recente do cache
        const instantAvatar = getInstantSyncPassengerAvatar(parsed.user.id, parsed.user.email);
        const mergedProfile = parsed.profile
          ? { ...parsed.profile, avatar_url: instantAvatar || parsed.profile.avatar_url || DEFAULT_AVATAR_URL }
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

      const isMetaApproved = 
        userMeta.is_approved === true || 
        userMeta.status === 'active' || 
        userMeta.role === 'admin' ||
        appMeta.role === 'admin';

      const isPassApproved = 
        passData?.status === 'Aprovado' || 
        passData?.status === 'aprovado' || 
        passData?.status === 'active';

      const isProfApproved = 
        profData?.is_approved === true || 
        profData?.approved === true || 
        profData?.status === 'active' || 
        profData?.status === 'approved' ||
        profData?.role === 'admin';

      const isApproved = isMetaApproved || isPassApproved || isProfApproved;
      const statusVal = isApproved ? 'active' : (profData?.status || passData?.status || userMeta.status || 'pending');

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

      // Resolução inteligente e prioritária da imagem de perfil:
      // 1. userMeta (Auth Metadata na Nuvem)
      // 2. profData / passData
      // 3. Persistência local (IndexedDB + LocalStorage)
      // 4. Default avatar
      const metaAvatar = userMeta.avatar_url || userMeta.foto || userMeta.avatar;
      const dbAvatar = profData?.avatar_url || profData?.avatar || profData?.foto || profData?.foto_url || passData?.avatar_url || passData?.foto || passData?.foto_url;
      const persistedAvatar = await getPersistedPassengerAvatar(currentUser.id, currentUser.email);
      const instantAvatar = getInstantSyncPassengerAvatar(currentUser.id, currentUser.email);

      const avatarVal =
        metaAvatar ||
        dbAvatar ||
        persistedAvatar ||
        instantAvatar ||
        DEFAULT_AVATAR_URL;

      // Fixa o avatar resolvido no cache local para carregamento instantâneo permanente
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
        'SR Logística & Transporte';

      const departmentVal = 
        profData?.department || 
        profData?.setor || 
        passData?.setor || 
        userMeta.department || 
        userMeta.setor || 
        'Operações e Gestão';

      const paymentPreferenceVal = 
        profData?.payment_preference || 
        passData?.payment_preference || 
        userMeta.payment_preference || 
        'PIX';

      // Sincroniza tabela profiles se for aprovado
      if (isApproved && isSupabaseConfigured) {
        try {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            name: nameVal,
            nome: nameVal,
            phone: phoneVal,
            telefone: phoneVal,
            role: userMeta.role || profData?.role || 'passenger',
            status: 'active',
            is_approved: true,
            approved: true
          });
        } catch (_) {}
      }

      const finalProfile: PassengerProfile = {
        id: currentUser.id,
        name: nameVal,
        email: currentUser.email,
        phone: phoneVal,
        avatar_url: avatarVal,
        company: companyVal,
        department: departmentVal,
        role: (userMeta.role as any) || (profData?.role as any) || 'passenger',
        rating: profData?.rating || 5.0,
        total_rides: profData?.total_rides || 0,
        payment_preference: paymentPreferenceVal,
        status: statusVal,
        is_approved: isApproved,
        created_at: profData?.created_at || passData?.created_at || new Date().toISOString()
      };

      setProfile(finalProfile);

      // Salva sessão local ativa completa para reaberturas instantâneas do app / APK
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
    const next = { ...currentProf, ...updates };
    setProfile(next);

    const activeUserId = user?.id || next.id;
    const activeUserEmail = user?.email || next.email;

    // 1. Salva a imagem de perfil no armazenamento multicamadas (IndexedDB + LocalStorage)
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
        // 3. Atualiza nos metadados do Auth do Supabase (armazenamento persistente em nuvem)
        try {
          await supabase.auth.updateUser({
            data: {
              name: next.name,
              nome: next.name,
              phone: next.phone,
              telefone: next.phone,
              avatar_url: next.avatar_url,
              foto: next.avatar_url,
              avatar: next.avatar_url,
              company: next.company,
              empresa: next.company,
              department: next.department,
              setor: next.department,
              payment_preference: next.payment_preference
            }
          });
        } catch (e) {
          console.warn('Aviso ao atualizar metadados do Auth:', e);
        }

        // 4. Atualiza ou insere na tabela profiles
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
              role: next.role || 'passenger',
              status: next.status || 'active',
              is_approved: next.is_approved !== false
            });
        } catch (_) {}

        // 5. Atualiza na tabela passageiros
        try {
          const passPayload: any = {
            nome: next.name,
            nome_social: next.name?.split(' ')[0],
            nome_completo: next.name,
            telefone: next.phone,
            empresa: next.company,
            setor: next.department,
            updated_at: new Date().toISOString()
          };

          const { error: errId } = await supabase
            .from('passageiros')
            .update(passPayload)
            .eq('id', activeUserId);

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
