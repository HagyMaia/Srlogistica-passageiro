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
        let driverData: any = null;

        // Tenta buscar na tabela motoristas
        const { data: mData } = await supabase
          .from('motoristas')
          .select('*')
          .eq('id', driverId)
          .maybeSingle();

        if (mData) {
          driverData = mData;
        } else {
          // Fallback para profiles ou drivers
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', driverId)
            .maybeSingle();
          if (pData) driverData = pData;
        }

        if (!driverData) {
          console.warn('Motorista não encontrado:', driverId);
          return;
        }

        const driverInfo: DriverInfo = {
          id: driverData.id,
          name: driverData.nome || driverData.nome_social || driverData.nome_completo || driverData.name || 'Motorista SR',
          phone: driverData.telefone || driverData.phone || '(92) 99123-4567',
          rating: typeof driverData.rating === 'number' ? driverData.rating : 4.95,
          total_rides: typeof driverData.total_rides === 'number' ? driverData.total_rides : 0,
          avatar_url: driverData.avatar_url || null,
          vehicle: {
            brand: driverData.marca_veiculo || driverData.vehicle_brand || 'Veículo',
            model: driverData.modelo_veiculo || driverData.vehicle_model || 'Padrão SR',
            color: driverData.cor_veiculo || driverData.vehicle_color || 'Prata',
            plate: driverData.placa_veiculo || driverData.vehicle_plate || 'SR-0000',
            category: driverData.categoria || driverData.category || 'POPULAR'
          }
        };

        setDriver(driverInfo);
      } catch (err) {
        console.warn('Erro ao buscar dados do motorista real:', err);
      }
    };

    // Função de verificação e atualização de status
    const processStatusUpdate = async (newStatus: string, driverId?: string) => {
      if (!newStatus) return;

      if (driverId) {
        await fetchRealDriver(driverId);
      }

      const s = String(newStatus).trim().toUpperCase();

      if (s === 'ACCEPTED' || s === 'DRIVER_ASSIGNED' || s === 'ACEITA' || s === 'ACEITO') {
        changeStatus('DRIVER_ASSIGNED');
      } else if (s === 'ARRIVING' || s === 'DRIVER_ARRIVING' || s === 'A_CAMINHO' || s === 'DESLOCANDO') {
        changeStatus('DRIVER_ARRIVING');
      } else if (s === 'ARRIVED' || s === 'DRIVER_ARRIVED' || s === 'CHEGOU' || s === 'NO_LOCAL') {
        changeStatus('DRIVER_ARRIVED');
      } else if (s === 'IN_PROGRESS' || s === 'STARTED' || s === 'EM_ANDAMENTO' || s === 'EM_VIAGEM' || s === 'INICIADA') {
        changeStatus('IN_PROGRESS');
      } else if (
        s === 'COMPLETED' ||
        s === 'FINISHED' ||
        s === 'FINALIZADA' ||
        s === 'FINALIZADO' ||
        s === 'CONCLUIDA' ||
        s === 'CONCLUIDO' ||
        s === 'DROPOFF' ||
        s === 'PAID'
      ) {
        changeStatus('COMPLETED');
      } else if (s === 'CANCELLED' || s === 'CANCELED' || s === 'CANCELADA' || s === 'CANCELADO') {
        changeStatus('CANCELLED');
      }
    };

    // 0. Verificação imediata no banco de dados ao iniciar
    const checkImmediateStatus = async () => {
      try {
        const { data: rideRow } = await supabase
          .from('rides')
          .select('id, status, driver_id')
          .eq('id', tripId)
          .maybeSingle();

        if (rideRow) {
          await processStatusUpdate(rideRow.status, rideRow.driver_id);
        }
      } catch (_) {}
    };
    checkImmediateStatus();

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
          await processStatusUpdate(payload.new?.status, payload.new?.driver_id);
        }
      )
      .subscribe();

    // 2. Escuta fallback na tabela 'trips'
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
          await processStatusUpdate(payload.new?.status, payload.new?.driver_id);
        }
      )
      .subscribe();

    // 3. Polling de alta confiabilidade (a cada 2 segundos) para garantir sincronia imediata
    const pollInterval = setInterval(async () => {
      try {
        const { data: rideRow } = await supabase
          .from('rides')
          .select('id, status, driver_id')
          .eq('id', tripId)
          .maybeSingle();

        if (rideRow) {
          await processStatusUpdate(rideRow.status, rideRow.driver_id);
        }
      } catch (_) {}
    }, 2000);

    // 4. Escuta Mensagens em Tempo Real da Corrida
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
      clearInterval(pollInterval);
      supabase.removeChannel(ridesChannel);
      supabase.removeChannel(tripsChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [tripId, status, changeStatus, setDriver, addDriverMessage]);

  return {
    currentTrip,
    isActive: Boolean(tripId && status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'IDLE')
  };
}
