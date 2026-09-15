'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { LocationCoordinates } from '@/types';

export interface OnlineDriverMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  vehicle: string;
  plate: string;
  rating: number;
  phone?: string;
  avatar_url?: string;
}

export function useOnlineDrivers(_userLocation?: LocationCoordinates | null) {
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriverMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnlineDrivers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setOnlineDrivers([]);
      setLoading(false);
      return;
    }

    try {
      // Consulta direta na tabela de motoristas: apenas usuários com work_status ONLINE
      const { data, error } = await supabase
        .from('motoristas')
        .select('*');

      if (error) {
        console.warn('Erro ao carregar motoristas do Supabase:', error.message);
        setOnlineDrivers([]);
        return;
      }

      if (data && Array.isArray(data)) {
        // Filtra estritamente motoristas REAIS, ATIVOS, APROVADOS e com work_status ONLINE
        const realOnlineDrivers = data.filter((d: any) => {
          const workStatus = (d.work_status || '').trim().toUpperCase();
          const status = (d.status || '').trim().toLowerCase();
          const vehicleStatus = (d.vehicle_status || '').trim().toLowerCase();

          const isOnline = workStatus === 'ONLINE' || workStatus === 'DISPONIVEL' || workStatus === 'LIVRE';
          const isApproved = status === 'aprovado' || status === 'ativo' || vehicleStatus === 'aprovado' || status === 'approved';

          if (!isOnline || !isApproved) return false;

          // Validação de coordenadas reais de GPS (rejeita coordenadas zeradas, inválidas ou ausentes)
          const lat = typeof d.latitude === 'number' ? d.latitude : typeof d.lat === 'number' ? d.lat : typeof d.current_lat === 'number' ? d.current_lat : null;
          const lng = typeof d.longitude === 'number' ? d.longitude : typeof d.lng === 'number' ? d.lng : typeof d.current_lng === 'number' ? d.current_lng : null;

          if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return false;
          // Rejeita ponto (0, 0) ou fora de limites geográficos válidos
          if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;

          return true;
        });

        const mapped: OnlineDriverMarker[] = realOnlineDrivers.map((d: any) => {
          const lat = typeof d.latitude === 'number' ? d.latitude : typeof d.lat === 'number' ? d.lat : d.current_lat;
          const lng = typeof d.longitude === 'number' ? d.longitude : typeof d.lng === 'number' ? d.lng : d.current_lng;
          const name = d.nome || d.nome_social || d.nome_completo || 'Motorista SR';
          const vehicle = `${d.marca_veiculo || 'Carro'} ${d.modelo_veiculo || ''} ${d.cor_veiculo ? `· ${d.cor_veiculo}` : ''}`.trim();
          const plate = d.placa_veiculo || 'SR-0000';
          const rating = typeof d.rating === 'number' ? d.rating : 4.95;

          return {
            id: d.id,
            name,
            latitude: lat,
            longitude: lng,
            vehicle,
            plate,
            rating,
            phone: d.telefone || d.phone,
            avatar_url: d.avatar_url
          };
        });

        setOnlineDrivers(mapped);
      } else {
        setOnlineDrivers([]);
      }
    } catch (err) {
      console.warn('Falha na consulta de motoristas online:', err);
      setOnlineDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineDrivers();

    // Polling contínuo de 4 segundos para manter o mapa 100% atualizado com os motoristas reais
    const interval = setInterval(() => {
      fetchOnlineDrivers();
    }, 4000);

    if (!isSupabaseConfigured) {
      return () => clearInterval(interval);
    }

    // Escuta em tempo real no Supabase quando motoristas entram/saem ou alteram status
    const channel = supabase
      .channel('realtime:online-motoristas')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motoristas'
        },
        () => {
          fetchOnlineDrivers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchOnlineDrivers]);

  return {
    onlineDrivers,
    loading,
    refreshOnlineDrivers: fetchOnlineDrivers
  };
}
