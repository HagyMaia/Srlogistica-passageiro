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

// Gera um deslocamento determinístico e estável baseado no ID do motorista
function getDeterministicOffset(id: string, index: number): { dLat: number; dLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angles = [45, 135, 225, 315, 90, 180, 270, 0];
  const angle = ((Math.abs(hash) % 360) + index * 45) * (Math.PI / 180);
  const distance = 0.003 + ((Math.abs(hash) % 15) * 0.0004); // ~350m a 900m do centro/usuário

  return {
    dLat: Math.sin(angle) * distance,
    dLng: Math.cos(angle) * distance
  };
}

export function useOnlineDrivers(userLocation?: LocationCoordinates | null) {
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriverMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const baseLat = userLocation?.latitude || -3.1037;
  const baseLng = userLocation?.longitude || -60.0125;

  const fetchOnlineDrivers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setOnlineDrivers([]);
      setLoading(false);
      return;
    }

    try {
      // Busca motoristas que estão Aprovados e com work_status ONLINE
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .eq('work_status', 'ONLINE');

      if (error) {
        console.warn('Erro ao carregar motoristas online do Supabase:', error.message);
        setOnlineDrivers([]);
        return;
      }

      if (data && Array.isArray(data)) {
        // Filtra apenas os que são aprovados
        const approvedDrivers = data.filter((d: any) => {
          const st = (d.status || '').toLowerCase();
          const vst = (d.vehicle_status || '').toLowerCase();
          return st === 'aprovado' || vst === 'aprovado';
        });

        const mapped: OnlineDriverMarker[] = approvedDrivers.map((d: any, index: number) => {
          const offset = getDeterministicOffset(d.id || `drv-${index}`, index);
          const name = d.nome || d.nome_social || d.nome_completo || 'Motorista SR';
          const vehicle = `${d.marca_veiculo || 'Carro'} ${d.modelo_veiculo || ''} ${d.cor_veiculo ? `· ${d.cor_veiculo}` : ''}`.trim();
          const plate = d.placa_veiculo || 'SR-0000';
          const rating = typeof d.rating === 'number' ? d.rating : 4.95;

          return {
            id: d.id,
            name,
            latitude: baseLat + offset.dLat,
            longitude: baseLng + offset.dLng,
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
  }, [baseLat, baseLng]);

  useEffect(() => {
    fetchOnlineDrivers();

    if (!isSupabaseConfigured) return;

    // Escuta em tempo real mudanças na tabela motoristas (quando motoristas ficam online/offline)
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
      supabase.removeChannel(channel);
    };
  }, [fetchOnlineDrivers]);

  return {
    onlineDrivers,
    loading,
    refreshOnlineDrivers: fetchOnlineDrivers
  };
}
