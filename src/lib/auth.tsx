'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PassengerProfile } from '@/types';

interface AuthContextType {
  user: any | null;
  profile: PassengerProfile | null;
  loading: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<PassengerProfile>) => Promise<void>;
}

const DEFAULT_PROFILE: PassengerProfile = {
  id: 'demo-passenger-default',
  name: 'Ana Clara Souza',
  email: 'passageiro@demo.local',
  phone: '(92) 99123-4567',
  role: 'passenger',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  rating: 4.95,
  total_rides: 48,
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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: any) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      if (currentUser.email === 'passageiro@demo.local' || !isSupabaseConfigured) {
        setProfile({
          ...DEFAULT_PROFILE,
          id: currentUser.id,
          email: currentUser.email || DEFAULT_PROFILE.email,
          name: currentUser.user_metadata?.name || currentUser.user_metadata?.nome || DEFAULT_PROFILE.name
        });
        return;
      }

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
        userMeta.telefone;

      // Se for aprovado mas a tabela profiles ainda não tiver o registro ou estiver desatualizada, atualiza/insere
      if (isApproved && isSupabaseConfigured) {
        try {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            name: nameVal,
            phone: phoneVal,
            role: userMeta.role || profData?.role || 'passenger',
            status: 'active',
            is_approved: true,
            approved: true
          });
        } catch (_) {}
      }

      setProfile({
        id: currentUser.id,
        name: nameVal,
        email: currentUser.email,
        phone: phoneVal,
        avatar_url: profData?.avatar_url,
        role: (userMeta.role as any) || (profData?.role as any) || 'passenger',
        rating: profData?.rating || 5.0,
        total_rides: profData?.total_rides || 48,
        payment_preference: profData?.payment_preference || 'PIX',
        status: statusVal,
        is_approved: isApproved,
        created_at: profData?.created_at || passData?.created_at || new Date().toISOString()
      });
    } catch {
      setProfile({
        ...DEFAULT_PROFILE,
        id: currentUser.id,
        email: currentUser.email
      });
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
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setUser(null);
          setProfile(null);
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
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Realtime: ouve aprovações na tabela passageiros e profiles
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
      } catch (_) {}
      window.location.href = '/login';
    }
  };

  const updateProfile = async (updates: Partial<PassengerProfile>) => {
    if (!profile) return;
    const next = { ...profile, ...updates };
    setProfile(next);

    try {
      if (isSupabaseConfigured && user) {
        await supabase
          .from('profiles')
          .update({
            name: next.name,
            nome: next.name,
            phone: next.phone,
            telefone: next.phone,
            avatar_url: next.avatar_url,
            payment_preference: next.payment_preference,
            company: next.company,
            department: next.department
          })
          .eq('id', user.id);

        try {
          await supabase
            .from('passageiros')
            .update({
              nome: next.name,
              nome_social: next.name?.split(' ')[0],
              telefone: next.phone,
              empresa: next.company,
              setor: next.department
            })
            .eq('id', user.id);
        } catch (_) {}
      }
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isLoading: loading, signOut, updateProfile }}>
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
      updateProfile: async () => {}
    };
  }
  return context;
}
