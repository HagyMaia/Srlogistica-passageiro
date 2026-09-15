'use client';

import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import type { DriverInfo } from '@/types';

// Função utilitária para aproximar o motorista suavemente em direção ao destino ou passageiro
function moveTowards(
  current: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number },
  step = 0.00012 // ~13 metros por tick
): { latitude: number; longitude: number } {
  const dLat = target.latitude - current.latitude;
  const dLng = target.longitude - current.longitude;
  const dist = Math.hypot(dLat, dLng);

  if (dist <= step) {
    return { latitude: target.latitude, longitude: target.longitude };
  }

  const ratio = step / dist;
  return {
    latitude: current.latitude + dLat * ratio,
    longitude: current.longitude + dLng * ratio
  };
}

export function useRideStatus() {
  const {
    currentTrip,
    changeStatus,
    setDriver,
    updateDriverLocation,
    addDriverMessage,
    loadChatHistory
  } = usePassengerTripStore();
  const tripId = currentTrip?.id;
  const status = currentTrip?.status;
  const routeIndexRef = useRef<number>(0);
  const processedMessageIdsRef = useRef<Set<string>>(new Set<string>());

  useEffect(() => {
    if (!tripId || status === 'COMPLETED' || status === 'CANCELLED' || status === 'IDLE') {
      return;
    }

    loadChatHistory(tripId);

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
          // Fallback para profiles
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

        const initialLat =
          typeof driverData.latitude === 'number'
            ? driverData.latitude
            : typeof driverData.lat === 'number'
            ? driverData.lat
            : typeof driverData.current_lat === 'number'
            ? driverData.current_lat
            : currentTrip?.origin
            ? currentTrip.origin.latitude + 0.0055
            : -3.087;

        const initialLng =
          typeof driverData.longitude === 'number'
            ? driverData.longitude
            : typeof driverData.lng === 'number'
            ? driverData.lng
            : typeof driverData.current_lng === 'number'
            ? driverData.current_lng
            : currentTrip?.origin
            ? currentTrip.origin.longitude + 0.0045
            : -60.005;

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
          },
          current_location: {
            latitude: initialLat,
            longitude: initialLng
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

      if (driverId && (!currentTrip?.driver || currentTrip.driver.id !== driverId)) {
        await fetchRealDriver(driverId);
      }

      const s = String(newStatus).trim().toUpperCase();

      // Cancelamento Imediato pelo Motorista
      if (
        s === 'CANCELLED' ||
        s === 'CANCELED' ||
        s === 'CANCELADA' ||
        s === 'CANCELADO' ||
        s === 'REJECTED' ||
        s === 'REJEITADA' ||
        s === 'RECUSADA'
      ) {
        changeStatus('CANCELLED');
        return;
      }

      // Motorista Chegou ao Local
      if (
        s === 'ARRIVED' ||
        s === 'DRIVER_ARRIVED' ||
        s === 'CHEGOU' ||
        s === 'NO_LOCAL' ||
        s === 'CHEGUEI' ||
        s === 'CHEGUEI_AO_LOCAL' ||
        s === 'AT_PICKUP'
      ) {
        changeStatus('DRIVER_ARRIVED');
        return;
      }

      // Início da Corrida / Em Viagem
      if (
        s === 'IN_PROGRESS' ||
        s === 'STARTED' ||
        s === 'EM_ANDAMENTO' ||
        s === 'EM_VIAGEM' ||
        s === 'INICIADA' ||
        s === 'ON_TRIP' ||
        s === 'IN_TRANSIT' ||
        s === 'EM_ROTA' ||
        s === 'PICKED_UP'
      ) {
        changeStatus('IN_PROGRESS');
        return;
      }

      // Motorista Aceitou / A Caminho
      if (s === 'ACCEPTED' || s === 'DRIVER_ASSIGNED' || s === 'ACEITA' || s === 'ACEITO') {
        changeStatus('DRIVER_ASSIGNED');
        return;
      }

      if (s === 'ARRIVING' || s === 'DRIVER_ARRIVING' || s === 'A_CAMINHO' || s === 'DESLOCANDO') {
        changeStatus('DRIVER_ARRIVING');
        return;
      }

      // Viagem Concluída
      if (
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
      }
    };

    // Processa mensagem recebida do motorista
    const handleIncomingChatMessage = (raw: any) => {
      const msg = raw?.payload || raw;
      if (!msg) return;

      const role = String(msg.sender_role || msg.sender || msg.sender_type || '').toLowerCase();
      // Ignora mensagens enviadas pelo próprio passageiro
      if (role === 'passenger') return;

      const text = msg.content || msg.text || msg.message || '';
      if (!text || typeof text !== 'string') return;

      const msgKey = String(msg.id || `${text}_${msg.created_at || msg.timestamp}`);
      if (processedMessageIdsRef.current.has(msgKey)) return;
      processedMessageIdsRef.current.add(msgKey);

      addDriverMessage(text);
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
      .channel(`passenger-ride-db-${tripId}`)
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

    // 2. Canal Realtime chat_realtime_${tripId} (compatível diretamente com o app do motorista)
    const chatRealtimeChannel = supabase
      .channel(`chat_realtime_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_messages',
          filter: `ride_id=eq.${tripId}`
        },
        (payload: any) => {
          handleIncomingChatMessage(payload.new);
        }
      )
      .on('broadcast', { event: 'chat_message' }, (payload: any) => {
        handleIncomingChatMessage(payload);
      })
      .on('broadcast', { event: 'driver_message' }, (payload: any) => {
        handleIncomingChatMessage(payload);
      })
      .on('broadcast', { event: 'message' }, (payload: any) => {
        handleIncomingChatMessage(payload);
      })
      .on('broadcast', { event: 'status_update' }, async (payload: any) => {
        const data = payload.payload || payload;
        if (data?.status) {
          await processStatusUpdate(data.status, data.driver_id);
        }
      })
      .on('broadcast', { event: 'driver_arrived' }, () => {
        changeStatus('DRIVER_ARRIVED');
      })
      .on('broadcast', { event: 'ride_started' }, () => {
        changeStatus('IN_PROGRESS');
      })
      .on('broadcast', { event: 'trip_started' }, () => {
        changeStatus('IN_PROGRESS');
      })
      .on('broadcast', { event: 'ride_cancelled' }, () => {
        changeStatus('CANCELLED');
      })
      .on('broadcast', { event: 'ride_completed' }, () => {
        changeStatus('COMPLETED');
      })
      .subscribe();

    // 3. Canal Broadcast passenger-ride-${tripId} para Chat, Status e Cancelamento
    const broadcastChannel = supabase
      .channel(`passenger-ride-${tripId}`)
      .on('broadcast', { event: 'chat_message' }, (payload: any) => {
        handleIncomingChatMessage(payload);
      })
      .on('broadcast', { event: 'driver_message' }, (payload: any) => {
        handleIncomingChatMessage(payload);
      })
      .on('broadcast', { event: 'message' }, (payload: any) => {
        handleIncomingChatMessage(payload);
      })
      .on('broadcast', { event: 'status_update' }, async (payload: any) => {
        const data = payload.payload || payload;
        if (data?.status) {
          await processStatusUpdate(data.status, data.driver_id);
        }
      })
      .on('broadcast', { event: 'ride_cancelled' }, () => {
        changeStatus('CANCELLED');
      })
      .on('broadcast', { event: 'driver_arrived' }, () => {
        changeStatus('DRIVER_ARRIVED');
      })
      .on('broadcast', { event: 'ride_started' }, () => {
        changeStatus('IN_PROGRESS');
      })
      .on('broadcast', { event: 'trip_started' }, () => {
        changeStatus('IN_PROGRESS');
      })
      .on('broadcast', { event: 'ride_completed' }, () => {
        changeStatus('COMPLETED');
      })
      .on('broadcast', { event: 'driver_location' }, (payload: any) => {
        const data = payload.payload || payload;
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          updateDriverLocation({ latitude: data.latitude, longitude: data.longitude });
        }
      })
      .subscribe();

    // 4. Canal sync_rides_${tripId}
    const syncChannel = supabase
      .channel(`sync_rides_${tripId}`)
      .on('broadcast', { event: 'driver_arrived' }, () => {
        changeStatus('DRIVER_ARRIVED');
      })
      .on('broadcast', { event: 'ride_started' }, () => {
        changeStatus('IN_PROGRESS');
      })
      .on('broadcast', { event: 'trip_started' }, () => {
        changeStatus('IN_PROGRESS');
      })
      .on('broadcast', { event: 'status_update' }, async (payload: any) => {
        const data = payload.payload || payload;
        if (data?.status) {
          await processStatusUpdate(data.status, data.driver_id);
        }
      })
      .on('broadcast', { event: 'ride_cancelled' }, () => {
        changeStatus('CANCELLED');
      })
      .subscribe();

    // 5. Polling de alta confiabilidade (a cada 1 segundo) para garantir sincronia instantânea
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

        // Se houver mensagens gravadas no banco na tabela ride_messages
        try {
          const { data: dbMessages } = await supabase
            .from('ride_messages')
            .select('*')
            .eq('ride_id', tripId)
            .order('created_at', { ascending: false })
            .limit(5);

          if (Array.isArray(dbMessages)) {
            for (const m of dbMessages) {
              handleIncomingChatMessage(m);
            }
          }
        } catch (_) {}

        // Se houver um motorista atribuído, sincroniza coordenadas reais do motorista se disponíveis
        const driverId = rideRow?.driver_id || currentTrip?.driver?.id;
        if (driverId) {
          const { data: dRow } = await supabase
            .from('motoristas')
            .select('latitude, longitude, lat, lng')
            .eq('id', driverId)
            .maybeSingle();

          if (dRow) {
            const lat = typeof dRow.latitude === 'number' ? dRow.latitude : dRow.lat;
            const lng = typeof dRow.longitude === 'number' ? dRow.longitude : dRow.lng;
            if (typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) > 0.001) {
              updateDriverLocation({ latitude: lat, longitude: lng });
            }
          }
        }
      } catch (_) {}
    }, 1000);

    // 6. Transmissão Contínua e Movimentação Suave do Motorista no Mapa
    const locationInterval = setInterval(() => {
      const liveTrip = usePassengerTripStore.getState().currentTrip;
      if (!liveTrip || !liveTrip.driver || !liveTrip.driver.current_location) return;

      const currentLoc = liveTrip.driver.current_location;
      const tripStatus = liveTrip.status;

      // Se o motorista está a caminho do ponto de embarque
      if (tripStatus === 'DRIVER_ASSIGNED' || tripStatus === 'DRIVER_ARRIVING') {
        const target = liveTrip.origin;
        if (!target) return;

        const nextLoc = moveTowards(currentLoc, target, 0.00015);
        updateDriverLocation({
          latitude: nextLoc.latitude,
          longitude: nextLoc.longitude
        });

        // Se chegou no ponto de embarque (< 30 metros), avança para DRIVER_ARRIVED
        const dist = Math.hypot(target.latitude - nextLoc.latitude, target.longitude - nextLoc.longitude);
        if (dist < 0.00035 && tripStatus === 'DRIVER_ASSIGNED') {
          changeStatus('DRIVER_ARRIVING');
        } else if (dist < 0.0002) {
          changeStatus('DRIVER_ARRIVED');
        }
      } else if (tripStatus === 'IN_PROGRESS') {
        // Se a viagem está em andamento, desloca suavemente em direção ao destino final
        const routeCoords = liveTrip.routeCoordinates || [];
        if (routeCoords.length > 0) {
          const idx = routeIndexRef.current;
          if (idx < routeCoords.length) {
            const [lat, lng] = routeCoords[idx];
            updateDriverLocation({ latitude: lat, longitude: lng });
            routeIndexRef.current = idx + 1;
          }
        } else if (liveTrip.destination) {
          const nextLoc = moveTowards(currentLoc, liveTrip.destination, 0.0002);
          updateDriverLocation({
            latitude: nextLoc.latitude,
            longitude: nextLoc.longitude
          });
        }
      }
    }, 1800);

    return () => {
      clearInterval(pollInterval);
      clearInterval(locationInterval);
      supabase.removeChannel(ridesChannel);
      supabase.removeChannel(chatRealtimeChannel);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(syncChannel);
    };
  }, [tripId, status, changeStatus, setDriver, updateDriverLocation, addDriverMessage]);

  return {
    currentTrip,
    isActive: Boolean(tripId && status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'IDLE')
  };
}
