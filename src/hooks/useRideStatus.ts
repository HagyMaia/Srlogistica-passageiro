'use client';

import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import type { DriverInfo } from '@/types';

export function useRideStatus() {
  const { currentTrip, changeStatus, setDriver, addDriverMessage } = usePassengerTripStore();
  const tripId = currentTrip?.id;
  const status = currentTrip?.status;

  useEffect(() => {
    if (!tripId || status === 'COMPLETED' || status === 'CANCELLED' || status === 'IDLE') {
      return;
    }

    // Função para carregar dados do motorista real quando associado à corrida
    const fetchRealDriver = async (driverId: string) => {
      try {
        const { data: driverData, error } = await supabase
          .from('motoristas')
          .select('*')
          .eq('id', driverId)
          .maybeSingle();

        if (error || !driverData) {
          console.warn('Motorista não encontrado na tabela motoristas:', driverId);
          return;
        }

        const driverInfo: DriverInfo = {
          id: driverData.id,
          name: driverData.nome || driverData.nome_social || driverData.nome_completo || 'Motorista SR',
          phone: driverData.telefone || driverData.phone || '(92) 99123-4567',
          rating: typeof driverData.rating === 'number' ? driverData.rating : 4.95,
          total_rides: typeof driverData.total_rides === 'number' ? driverData.total_rides : 0,
          avatar_url: driverData.avatar_url || null,
          vehicle: {
            brand: driverData.marca_veiculo || 'Veículo',
            model: driverData.modelo_veiculo || 'Padrão',
            color: driverData.cor_veiculo || 'Prata',
            plate: driverData.placa_veiculo || 'SR-0000',
            category: driverData.categoria || 'POPULAR'
          }
        };

        setDriver(driverInfo);
      } catch (err) {
        console.warn('Erro ao buscar dados do motorista real:', err);
      }
    };

    // 1. Escuta Realtime de Atualizações de Status da Corrida na tabela 'rides'
    const ridesChannel = supabase
      .channel(`passenger-ride-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${tripId}`
        },
        async (payload: any) => {
          const newStatus = payload.new?.status;
          const driverId = payload.new?.driver_id;

          if (driverId && (!currentTrip?.driver || currentTrip.driver.id !== driverId)) {
            await fetchRealDriver(driverId);
          }

          if (newStatus === 'ACCEPTED' || newStatus === 'DRIVER_ASSIGNED') {
            changeStatus('DRIVER_ASSIGNED');
          } else if (newStatus === 'ARRIVING' || newStatus === 'DRIVER_ARRIVING') {
            changeStatus('DRIVER_ARRIVING');
          } else if (newStatus === 'ARRIVED' || newStatus === 'DRIVER_ARRIVED') {
            changeStatus('DRIVER_ARRIVED');
          } else if (newStatus === 'IN_PROGRESS') {
            changeStatus('IN_PROGRESS');
          } else if (newStatus === 'COMPLETED' || newStatus === 'FINISHED') {
            changeStatus('COMPLETED');
          } else if (newStatus === 'CANCELLED') {
            changeStatus('CANCELLED');
          }
        }
      )
      .subscribe();

    // 2. Escuta fallback na tabela 'trips' (caso o backend também envie para trips)
    const tripsChannel = supabase
      .channel(`passenger-trip-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`
        },
        async (payload: any) => {
          const newStatus = payload.new?.status;
          const driverId = payload.new?.driver_id;

          if (driverId && (!currentTrip?.driver || currentTrip.driver.id !== driverId)) {
            await fetchRealDriver(driverId);
          }

          if (newStatus === 'ACCEPTED' || newStatus === 'DRIVER_ASSIGNED') {
            changeStatus('DRIVER_ASSIGNED');
          } else if (newStatus === 'DRIVER_ARRIVING' || newStatus === 'ARRIVING') {
            changeStatus('DRIVER_ARRIVING');
          } else if (newStatus === 'DRIVER_ARRIVED' || newStatus === 'ARRIVED') {
            changeStatus('DRIVER_ARRIVED');
          } else if (newStatus === 'IN_PROGRESS') {
            changeStatus('IN_PROGRESS');
          } else if (newStatus === 'COMPLETED' || newStatus === 'FINISHED') {
            changeStatus('COMPLETED');
          } else if (newStatus === 'CANCELLED') {
            changeStatus('CANCELLED');
          }
        }
      )
      .subscribe();

    // 3. Escuta Mensagens em Tempo Real da Corrida
    const msgChannel = supabase
      .channel(`trip-messages-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg && (newMsg.sender_type === 'driver' || newMsg.sender === 'driver')) {
            addDriverMessage(newMsg.content || newMsg.text || 'Nova mensagem do motorista');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ridesChannel);
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [tripId, status, changeStatus, setDriver, currentTrip, addDriverMessage]);

  return {
    currentTrip,
    isActive: Boolean(tripId && status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'IDLE')
  };
}
