import { create } from 'zustand';
import { validateTripStatusChange } from '../domain/passenger-trip.machine';
import type {
  PassengerTrip,
  PassengerTripStatus,
  TripCategory,
  ChatMessage
} from '../domain/passenger-trip.types';
import type { LocationCoordinates, PaymentMethod, DriverInfo } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { haversineDistance } from '@/services/routing';
import { calculateFare } from '../domain/pricing';

const STORAGE_KEY = 'sr-passenger-active-trip';
const SCHEDULED_STORAGE_KEY = 'sr-passenger-scheduled-trips';
const HISTORY_STORAGE_KEY = 'sr_passenger_ride_history';
const RIDE_IDS_STORAGE_KEY = 'sr_passenger_ride_ids';

interface PassengerTripStore {
  currentTrip: PassengerTrip | null;
  scheduledTrips: PassengerTrip[];
  origin: LocationCoordinates | null;
  destination: LocationCoordinates | null;
  selectedCategory: TripCategory;
  selectedPaymentMethod: PaymentMethod;
  routeCoordinates: Array<[number, number]>;
  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;
  estimatedFare: number;
  isCreating: boolean;
  error: string | null;

  chatMessages: ChatMessage[];
  unreadChatCount: number;
  isDriverTyping: boolean;

  cancellationNotification: string | null;
  arrivalNotification: string | null;

  setOrigin: (loc: LocationCoordinates) => void;
  setDestination: (loc: LocationCoordinates | null) => void;
  swapOriginAndDestination: () => void;
  setSelectedCategory: (cat: TripCategory) => void;
  setSelectedPaymentMethod: (pm: PaymentMethod) => void;
  setRouteInfo: (params: {
    coordinates: Array<[number, number]>;
    distanceMeters: number;
    durationSeconds: number;
    estimatedFare: number;
  }) => void;
  setCurrentTrip: (trip: PassengerTrip | null) => void;
  changeStatus: (nextStatus: PassengerTripStatus) => void;
  setDriver: (driver: DriverInfo) => void;
  updateDriverLocation: (loc: LocationCoordinates) => void;
  sendChatMessage: (text: string) => Promise<void>;
  addDriverMessage: (text: string) => void;
  loadChatHistory: (tripId: string) => Promise<void>;
  markChatAsRead: () => void;
  requestRide: (passenger: { id: string; name: string; phone?: string }) => Promise<PassengerTrip | null>;
  scheduleRide: (
    passenger: { id: string; name: string; phone?: string },
    scheduledFor: string,
    notes?: string
  ) => Promise<PassengerTrip | null>;
  cancelScheduledTrip: (tripId: string) => Promise<void>;
  loadScheduledTrips: (passengerId?: string) => Promise<void>;
  cancelRide: (reason?: string) => Promise<void>;
  finishRide: (rating: number, feedback?: string) => Promise<void>;
  dismissCancellationNotification: () => void;
  dismissArrivalNotification: () => void;
  resetToIdle: () => void;
}

function loadSavedTrip(): PassengerTrip | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadSavedScheduledTrips(): PassengerTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCHEDULED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistScheduledTrips(trips: PassengerTrip[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULED_STORAGE_KEY, JSON.stringify(trips));
  } catch {
    // ignore
  }
}

function persistTrip(trip: PassengerTrip | null) {
  if (typeof window === 'undefined') return;
  try {
    if (trip && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function saveRideToHistory(trip: PassengerTrip, statusOverride?: string) {
  if (typeof window === 'undefined') return;
  try {
    const savedIds: string[] = JSON.parse(localStorage.getItem(RIDE_IDS_STORAGE_KEY) || '[]');
    if (!savedIds.includes(trip.id)) {
      savedIds.unshift(trip.id);
      localStorage.setItem(RIDE_IDS_STORAGE_KEY, JSON.stringify(savedIds.slice(0, 100)));
    }

    const currentHistory: any[] = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    const existingIndex = currentHistory.findIndex((h) => h.id === trip.id);

    const historyItem = {
      id: trip.id,
      pickup: trip.origin?.address || 'Ponto de Embarque',
      dropoff: trip.destination?.address || 'Destino',
      fare: trip.estimatedFare || 0,
      status: statusOverride || trip.status,
      created_at: trip.requestedAt || new Date().toISOString(),
      driver_name: trip.driver?.name || 'Motorista Parceiro',
      driver_vehicle: trip.driver?.vehicle ? `${trip.driver.vehicle.brand} ${trip.driver.vehicle.model}` : undefined,
      driver_avatar: trip.driver?.avatar_url,
      category: 'SR Logística'
    };

    if (existingIndex >= 0) {
      currentHistory[existingIndex] = { ...currentHistory[existingIndex], ...historyItem };
    } else {
      currentHistory.unshift(historyItem);
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(currentHistory.slice(0, 50)));
  } catch {
    // ignore
  }
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const initialSavedTrip = loadSavedTrip();
const initialMessages: ChatMessage[] = initialSavedTrip?.messages || [];

export const usePassengerTripStore = create<PassengerTripStore>((set, get) => ({
  currentTrip: initialSavedTrip,
  scheduledTrips: loadSavedScheduledTrips(),
  origin: null,
  destination: null,
  selectedCategory: 'POPULAR',
  selectedPaymentMethod: 'PIX',
  routeCoordinates: [],
  estimatedDistanceMeters: 0,
  estimatedDurationSeconds: 0,
  estimatedFare: 0,
  isCreating: false,
  error: null,
  chatMessages: initialMessages,
  unreadChatCount: initialMessages.filter((m) => !m.isRead && m.sender === 'driver').length,
  isDriverTyping: false,

  cancellationNotification: null,
  arrivalNotification: null,

  setOrigin: (loc) => set({ origin: loc }),
  setDestination: (loc) => set({ destination: loc }),

  swapOriginAndDestination: () => {
    const { origin, destination } = get();
    if (origin && destination) {
      set({
        origin: destination,
        destination: origin
      });
    }
  },

  setSelectedCategory: (selectedCategory) => {
    const { estimatedDistanceMeters, estimatedDurationSeconds } = get();
    if (estimatedDistanceMeters > 0) {
      const fare = calculateFare({
        distanceMeters: estimatedDistanceMeters,
        durationSeconds: estimatedDurationSeconds,
        category: selectedCategory
      });
      set({ selectedCategory, estimatedFare: fare.totalFare });
    } else {
      set({ selectedCategory });
    }
  },
  setSelectedPaymentMethod: (selectedPaymentMethod) => set({ selectedPaymentMethod }),

  setRouteInfo: ({ coordinates, distanceMeters, durationSeconds, estimatedFare }) => {
    set({
      routeCoordinates: coordinates,
      estimatedDistanceMeters: distanceMeters,
      estimatedDurationSeconds: durationSeconds,
      estimatedFare
    });
  },

  setCurrentTrip: (trip) => {
    persistTrip(trip);
    const msgs = trip?.messages || [];
    set({
      currentTrip: trip,
      chatMessages: msgs,
      unreadChatCount: msgs.filter((m) => !m.isRead && m.sender === 'driver').length
    });
  },

  changeStatus: (nextStatus) => {
    const { currentTrip, chatMessages } = get();
    if (!currentTrip) return;

    validateTripStatusChange(currentTrip.status, nextStatus);

    const now = new Date().toISOString();
    let updatedMessages = currentTrip.messages || chatMessages || [];
    let newUnread = get().unreadChatCount;

    const updated: PassengerTrip = {
      ...currentTrip,
      status: nextStatus,
      messages: updatedMessages,
      driverAssignedAt: nextStatus === 'DRIVER_ASSIGNED' ? now : currentTrip.driverAssignedAt,
      driverArrivedAt: nextStatus === 'DRIVER_ARRIVED' ? now : currentTrip.driverArrivedAt,
      startedAt: nextStatus === 'IN_PROGRESS' ? now : currentTrip.startedAt,
      completedAt: nextStatus === 'COMPLETED' ? now : currentTrip.completedAt,
      cancelledAt: nextStatus === 'CANCELLED' ? now : currentTrip.cancelledAt,
    };

    saveRideToHistory(updated, nextStatus);

    if (nextStatus === 'CANCELLED') {
      persistTrip(null);
      set({
        currentTrip: null,
        destination: null,
        routeCoordinates: [],
        estimatedDistanceMeters: 0,
        estimatedDurationSeconds: 0,
        estimatedFare: 0,
        chatMessages: [],
        unreadChatCount: 0,
        isDriverTyping: false,
        cancellationNotification: 'A corrida foi cancelada pelo motorista. Sua busca foi encerrada.',
        error: null
      });
      return;
    }

    if (nextStatus === 'DRIVER_ARRIVED') {
      set({
        currentTrip: updated,
        chatMessages: updatedMessages,
        unreadChatCount: newUnread,
        arrivalNotification: 'Motorista chegou ao local de embarque!'
      });
      persistTrip(updated);
      return;
    }

    persistTrip(updated);
    set({
      currentTrip: updated,
      chatMessages: updatedMessages,
      unreadChatCount: newUnread,
      arrivalNotification: null
    });
  },

  setDriver: (driver) => {
    const { currentTrip, chatMessages } = get();
    if (!currentTrip) return;

    let updatedMessages = currentTrip.messages || chatMessages || [];
    let newUnread = get().unreadChatCount;

    if (updatedMessages.length === 0) {
      const welcome: ChatMessage = {
        id: `msg-welcome-${Date.now()}`,
        tripId: currentTrip.id,
        sender: 'driver',
        senderName: driver.name || 'Motorista',
        text: `Olá! Aceitei sua corrida e já estou a caminho do ponto de embarque.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isRead: false
      };
      updatedMessages = [welcome];
      newUnread = 1;
    }

    const updated = { ...currentTrip, driver, messages: updatedMessages };
    persistTrip(updated);
    saveRideToHistory(updated);
    set({ currentTrip: updated, chatMessages: updatedMessages, unreadChatCount: newUnread });
  },

  updateDriverLocation: (loc) => {
    const { currentTrip } = get();
    if (!currentTrip || !currentTrip.driver) return;

    const updatedDriver: DriverInfo = {
      ...currentTrip.driver,
      current_location: loc
    };
    const updated = { ...currentTrip, driver: updatedDriver };
    persistTrip(updated);
    set({ currentTrip: updated });
  },

  sendChatMessage: async (text: string) => {
    const { currentTrip, chatMessages } = get();
    if (!currentTrip || !text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: currentTrip.id,
      sender: 'passenger',
      senderName: currentTrip.passengerName || 'Passageiro',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isRead: true
    };

    const newMessages = [...chatMessages, userMsg];
    const updatedTrip = { ...currentTrip, messages: newMessages };
    persistTrip(updatedTrip);
    set({ currentTrip: updatedTrip, chatMessages: newMessages });

    // 1. Transmissão imediata via Realtime Broadcast para o motorista
    if (isSupabaseConfigured) {
      try {
        const payload = {
          id: userMsg.id,
          ride_id: currentTrip.id,
          trip_id: currentTrip.id,
          tripId: currentTrip.id,
          sender_id: currentTrip.passengerId || null,
          sender_role: 'passenger',
          sender: 'passenger',
          sender_type: 'passenger',
          sender_name: currentTrip.passengerName || 'Passageiro',
          content: text.trim(),
          text: text.trim(),
          message: text.trim(),
          read: false,
          timestamp: userMsg.timestamp,
          created_at: new Date().toISOString()
        };

        // Broadcast nos canais comuns e específicos do app do motorista
        const channelNames = [
          `chat_realtime_${currentTrip.id}`,
          `passenger-ride-${currentTrip.id}`,
          `chat:${currentTrip.id}`,
          `trip:${currentTrip.id}`,
          `ride:${currentTrip.id}`,
          `sync_rides_${currentTrip.id}`,
          `trip-messages-${currentTrip.id}`
        ];

        for (const chName of channelNames) {
          try {
            const ch = supabase.channel(chName);
            ch.send({
              type: 'broadcast',
              event: 'chat_message',
              payload
            }).catch(() => {});
            ch.send({
              type: 'broadcast',
              event: 'passenger_message',
              payload
            }).catch(() => {});
            ch.send({
              type: 'broadcast',
              event: 'message',
              payload
            }).catch(() => {});
          } catch (_) {}
        }

        // 2. Gravação em tabela se existir
        await supabase.from('ride_messages').insert([{
          ride_id: currentTrip.id,
          sender_role: 'passenger',
          sender_name: currentTrip.passengerName || 'Passageiro',
          content: text.trim(),
          read: false
        }]);

        await supabase.from('trip_messages').insert([{
          trip_id: currentTrip.id,
          sender_type: 'passenger',
          sender_id: currentTrip.passengerId,
          sender_name: currentTrip.passengerName || 'Passageiro',
          content: text.trim(),
          created_at: new Date().toISOString()
        }]);
      } catch (_) {}
    }
  },

  addDriverMessage: (text: string) => {
    const { currentTrip, chatMessages } = get();
    if (!currentTrip || !text.trim()) return;

    const cleanText = text.trim();

    // Evita duplicação se a mensagem idêntica já foi adicionada nos últimos 5 segundos
    const recentDuplicate = chatMessages.slice(-5).some(
      (m) => m.sender === 'driver' && m.text === cleanText
    );
    if (recentDuplicate) return;

    const driverMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: currentTrip.id,
      sender: 'driver',
      senderName: currentTrip.driver?.name || 'Motorista',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    const newMessages = [...chatMessages, driverMsg];
    const updatedTrip = { ...currentTrip, messages: newMessages };
    persistTrip(updatedTrip);
    set({
      currentTrip: updatedTrip,
      chatMessages: newMessages,
      unreadChatCount: get().unreadChatCount + 1
    });

    // Feedback sonoro sintetizado e vibração no passageiro
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        }
        if ('navigator' in window && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    } catch (_) {}
  },

    markChatAsRead: () => {
    const { chatMessages, currentTrip } = get();
    const readMessages = chatMessages.map((m) => ({ ...m, isRead: true }));
    if (currentTrip) {
      const updated = { ...currentTrip, messages: readMessages };
      persistTrip(updated);
      set({ currentTrip: updated, chatMessages: readMessages, unreadChatCount: 0 });
    } else {
      set({ chatMessages: readMessages, unreadChatCount: 0 });
    }
  },

  loadChatHistory: async (tripId: string) => {
    if (!tripId || !isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('ride_messages')
        .select('*')
        .eq('ride_id', tripId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const { chatMessages, currentTrip } = get();
        const existingIds = new Set(chatMessages.map((m) => m.id));
        const formatted: ChatMessage[] = data.map((item) => {
          const role = String(item.sender_role || item.sender_type || item.sender || '').toLowerCase();
          const isMe = role === 'passenger';
          return {
            id: String(item.id || `msg-${Date.now()}`),
            tripId: String(item.ride_id || tripId),
            sender: isMe ? 'passenger' : 'driver',
            senderName: item.sender_name || (isMe ? 'Você' : currentTrip?.driver?.name || 'Motorista'),
            text: String(item.content || item.text || item.message || ''),
            timestamp: item.created_at
              ? new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            isRead: true
          };
        });

        const merged = [...chatMessages];
        let hasNew = false;
        for (const f of formatted) {
          if (!existingIds.has(f.id) && !merged.some((m) => m.text === f.text && m.sender === f.sender)) {
            existingIds.add(f.id);
            merged.push(f);
            hasNew = true;
          }
        }

        if (hasNew || chatMessages.length === 0) {
          if (currentTrip) {
            const updatedTrip = { ...currentTrip, messages: merged };
            persistTrip(updatedTrip);
            set({ currentTrip: updatedTrip, chatMessages: merged });
          } else {
            set({ chatMessages: merged });
          }
        }
      }
    } catch (_) {}
  },

  requestRide: async (passenger) => {
    const {
      origin,
      destination,
      selectedCategory,
      selectedPaymentMethod,
      routeCoordinates,
      estimatedDistanceMeters,
      estimatedDurationSeconds,
      estimatedFare
    } = get();

    if (!origin || !destination) {
      set({ error: 'Origem e destino são obrigatórios' });
      return null;
    }

    const dist = haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    const isSameAddress = origin.address && destination.address && origin.address.trim().toLowerCase() === destination.address.trim().toLowerCase();
    if (dist < 50 || isSameAddress) {
      set({ error: 'O local de embarque e o destino não podem ser o mesmo local. Por favor, escolha um destino diferente.' });
      return null;
    }

    set({ isCreating: true, error: null });

    const newTripId = generateUUID();

    const categoryFareCalc = estimatedDistanceMeters > 0
      ? calculateFare({
          distanceMeters: estimatedDistanceMeters,
          durationSeconds: estimatedDurationSeconds,
          category: selectedCategory
        }).totalFare
      : estimatedFare;
    const finalFare = categoryFareCalc || estimatedFare;

    const newTrip: PassengerTrip = {
      id: newTripId,
      status: 'SEARCHING_DRIVER',
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      origin,
      destination,
      routeCoordinates,
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      estimatedDistanceMeters,
      estimatedDurationSeconds,
      estimatedFare: finalFare,
      requestedAt: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured) {
        const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
        const validPassengerId = isUUID(passenger.id) ? passenger.id : generateUUID();

        // 1. Grava na tabela 'rides'
        const ridePayload = {
          id: newTripId,
          passenger_id: validPassengerId,
          pickup_address: origin.address || `${origin.latitude}, ${origin.longitude}`,
          pickup_lat: origin.latitude,
          pickup_lng: origin.longitude,
          dropoff_address: destination.address || `${destination.latitude}, ${destination.longitude}`,
          dropoff_lat: destination.latitude,
          dropoff_lng: destination.longitude,
          fare_amount: finalFare,
          distance_km: Math.max(1, Math.round((estimatedDistanceMeters / 1000) * 10) / 10),
          status: 'SEARCHING'
        };

        const { error: rideError } = await supabase.from('rides').insert(ridePayload);
        if (rideError) {
          console.warn('Erro ao inserir em rides:', rideError.message);
        }
      }

      saveRideToHistory(newTrip, 'SEARCHING');
      persistTrip(newTrip);
      set({ currentTrip: newTrip, isCreating: false, error: null });
      return newTrip;
    } catch (err: any) {
      console.warn('Erro na solicitação da corrida:', err);
      saveRideToHistory(newTrip, 'SEARCHING');
      persistTrip(newTrip);
      set({ currentTrip: newTrip, isCreating: false, error: null });
      return newTrip;
    }
  },

  cancelRide: async (reason = 'Cancelado pelo passageiro') => {
    const { currentTrip } = get();
    if (!currentTrip) return;

    const now = new Date().toISOString();
    const updated: PassengerTrip = {
      ...currentTrip,
      status: 'CANCELLED',
      cancelledAt: now,
      cancellationReason: reason
    };

    saveRideToHistory(updated, 'CANCELLED');

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('rides')
          .update({ status: 'CANCELLED' })
          .eq('id', currentTrip.id);
      }
    } catch (_) {}

    persistTrip(null);
    set({
      currentTrip: null,
      destination: null,
      routeCoordinates: [],
      estimatedDistanceMeters: 0,
      estimatedDurationSeconds: 0,
      estimatedFare: 0,
      chatMessages: [],
      unreadChatCount: 0,
      isDriverTyping: false,
      error: null
    });
  },

  scheduleRide: async (passenger, scheduledFor, notes) => {
    const {
      origin,
      destination,
      selectedCategory,
      selectedPaymentMethod,
      routeCoordinates,
      estimatedDistanceMeters,
      estimatedDurationSeconds,
      estimatedFare,
      scheduledTrips
    } = get();

    if (!origin || !destination) {
      set({ error: 'Origem e destino são obrigatórios' });
      return null;
    }

    set({ isCreating: true, error: null });

    const newTripId = generateUUID();

    const categoryFareCalc = estimatedDistanceMeters > 0
      ? calculateFare({
          distanceMeters: estimatedDistanceMeters,
          durationSeconds: estimatedDurationSeconds,
          category: selectedCategory
        }).totalFare
      : estimatedFare;
    const finalFare = categoryFareCalc || estimatedFare;

    const newScheduledTrip: PassengerTrip = {
      id: newTripId,
      status: 'SCHEDULED',
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      origin,
      destination,
      routeCoordinates,
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      estimatedDistanceMeters,
      estimatedDurationSeconds,
      estimatedFare: finalFare,
      requestedAt: new Date().toISOString(),
      scheduledFor,
      notes
    };

    const updatedScheduled = [newScheduledTrip, ...scheduledTrips];
    persistScheduledTrips(updatedScheduled);
    saveRideToHistory(newScheduledTrip, 'SCHEDULED');
    set({
      scheduledTrips: updatedScheduled,
      isCreating: false,
      destination: null,
      routeCoordinates: [],
      estimatedDistanceMeters: 0,
      estimatedDurationSeconds: 0,
      estimatedFare: 0,
      error: null
    });

    return newScheduledTrip;
  },

  cancelScheduledTrip: async (tripId: string) => {
    const { scheduledTrips } = get();
    const filtered = scheduledTrips.filter((t) => t.id !== tripId);
    persistScheduledTrips(filtered);
    set({ scheduledTrips: filtered });
  },

  loadScheduledTrips: async () => {
    const saved = loadSavedScheduledTrips();
    set({ scheduledTrips: saved });
  },

  finishRide: async (_rating: number, _feedback?: string) => {
    const { currentTrip } = get();
    if (!currentTrip) return;

    const now = new Date().toISOString();
    const updated: PassengerTrip = {
      ...currentTrip,
      status: 'COMPLETED',
      completedAt: now
    };

    saveRideToHistory(updated, 'COMPLETED');

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('rides')
          .update({ status: 'COMPLETED' })
          .eq('id', currentTrip.id);
      }
    } catch (_) {}

    persistTrip(null);
    set({
      currentTrip: null,
      destination: null,
      routeCoordinates: [],
      estimatedDistanceMeters: 0,
      estimatedDurationSeconds: 0,
      estimatedFare: 0,
      chatMessages: [],
      unreadChatCount: 0,
      isDriverTyping: false,
      error: null
    });
  },

  dismissCancellationNotification: () => set({ cancellationNotification: null }),
  dismissArrivalNotification: () => set({ arrivalNotification: null }),

  resetToIdle: () => {
    persistTrip(null);
    set({
      currentTrip: null,
      destination: null,
      routeCoordinates: [],
      estimatedDistanceMeters: 0,
      estimatedDurationSeconds: 0,
      estimatedFare: 0,
      chatMessages: [],
      unreadChatCount: 0,
      isDriverTyping: false,
      error: null
    });
  }
}));
