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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        const isApproved = data.is_approved ?? data.approved ?? (data.status === 'active' || data.status === 'approved' || false);
        const statusVal = data.status || (isApproved ? 'active' : 'pending');

        setProfile({
          id: data.id,
          name: data.name || data.nome || currentUser.email?.split('@')[0] || 'Passageiro',
          email: data.email || currentUser.email,
          phone: data.phone || data.telefone,
          avatar_url: data.avatar_url,
          role: 'passenger',
          rating: data.rating || 5.0,
          total_rides: data.total_rides || 0,
          payment_preference: data.payment_preference || 'PIX',
          status: statusVal,
          is_approved: isApproved,
          created_at: data.created_at || new Date().toISOString()
        });
      } else {
        // Se ainda não existir registro na tabela profiles, cria um perfil com status pending
        setProfile({
          id: currentUser.id,
          name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Passageiro',
          email: currentUser.email,
          phone: currentUser.user_metadata?.phone || currentUser.user_metadata?.telefone,
          role: 'passenger',
          rating: 5.0,
          total_rides: 0,
          payment_preference: 'PIX',
          status: 'pending',
          is_approved: false,
          created_at: new Date().toISOString()
        });
      }
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

    const unsubscribe = subRes?.data?.subscription?.unsubscribe;

    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
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
            phone: next.phone,
            avatar_url: next.avatar_url,
            payment_preference: next.payment_preference
          })
          .eq('id', user.id);
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
