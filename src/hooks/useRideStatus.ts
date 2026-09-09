'use client';

import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import type { DriverInfo } from '@/types';

const MOCK_DRIVER: DriverInfo = {
  id: 'driver-carlos-1',
  name: 'Carlos Eduardo da Silva',
  phone: '(92) 98492-3316',
  avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  rating: 4.96,
  total_rides: 1420,
  vehicle: {
    brand: 'Chevrolet',
    model: 'Onix Plus',
    color: 'Prata Metálico',
    plate: 'ABC-1D23',
    category: 'POPULAR'
  },
  current_location: {
    latitude: -3.1090,
    longitude: -60.0150,
    address: 'Av. André Araújo, 500',
    neighborhood: 'Aleixo'
  }
};

export function useRideStatus() {
  const { currentTrip, changeStatus, setDriver, setCurrentTrip, addDriverMessage } = usePassengerTripStore();
  const tripId = currentTrip?.id;
  const status = currentTrip?.status;
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tripId || status === 'COMPLETED' || status === 'CANCELLED' || status === 'IDLE') {
      return;
    }

    // 1. Escuta Realtime de Atualizações de Status da Corrida no Supabase
    const channel = supabase
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

          if (driverId && (!currentTrip.driver || currentTrip.driver.id !== driverId)) {
            try {
              const { data: driverData } = await supabase
                .from('motoristas')
                .select('*')
                .eq('id', driverId)
                .maybeSingle();

              if (driverData) {
                setDriver({
                  id: driverData.id,
                  name: driverData.nome || driverData.nome_social || 'Motorista SR',
                  phone: driverData.telefone || '(92) 98492-3316',
                  rating: 4.95,
                  total_rides: 1200,
                  avatar_url: driverData.avatar_url,
                  vehicle: {
                    brand: driverData.marca_veiculo || 'Chevrolet',
                    model: driverData.modelo_veiculo || 'Onix Plus',
                    color: driverData.cor_veiculo || 'Prata',
                    plate: driverData.placa_veiculo || 'ABC-1D23',
                    category: driverData.categoria || 'POPULAR'
                  }
                });
              } else {
                setDriver(MOCK_DRIVER);
              }
            } catch {
              setDriver(MOCK_DRIVER);
            }
          }

          if (newStatus === 'ACCEPTED' || newStatus === 'DRIVER_ASSIGNED') {
            changeStatus('DRIVER_ASSIGNED');
          } else if (newStatus === 'DRIVER_ARRIVING') {
            changeStatus('DRIVER_ARRIVING');
          } else if (newStatus === 'DRIVER_ARRIVED') {
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

    // 2. Escuta Mensagens em Tempo Real da Corrida
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

    // 3. Modo Demonstração interativo automático
    if (!isSupabaseConfigured || tripId.startsWith('trip-')) {
      if (status === 'SEARCHING_DRIVER') {
        demoTimerRef.current = setTimeout(() => {
          setDriver(MOCK_DRIVER);
          changeStatus('DRIVER_ASSIGNED');
        }, 3500);
      } else if (status === 'DRIVER_ASSIGNED') {
        demoTimerRef.current = setTimeout(() => {
          changeStatus('DRIVER_ARRIVING');
        }, 3000);
      } else if (status === 'DRIVER_ARRIVING') {
        demoTimerRef.current = setTimeout(() => {
          changeStatus('DRIVER_ARRIVED');
        }, 4000);
      }
    }

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
      }
    };
  }, [tripId, status, changeStatus, setDriver, currentTrip, addDriverMessage]);

  return {
    currentTrip,
    isActive: Boolean(tripId && status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'IDLE')
  };
}
