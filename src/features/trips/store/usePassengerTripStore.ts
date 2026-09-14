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

const STORAGE_KEY = 'sr-passenger-active-trip';
const SCHEDULED_STORAGE_KEY = 'sr-passenger-scheduled-trips';

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
  sendChatMessage: (text: string) => Promise<void>;
  addDriverMessage: (text: string) => void;
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

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
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

    persistTrip(updated);
    set({ currentTrip: updated, chatMessages: updatedMessages, unreadChatCount: newUnread });
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
    set({ currentTrip: updated, chatMessages: updatedMessages, unreadChatCount: newUnread });
  },

  sendChatMessage: async (text: string) => {
    const { currentTrip, chatMessages } = get();
    if (!currentTrip || !text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: currentTrip.id,
      sender: 'passenger',
      senderName: currentTrip.passengerName,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isRead: true
    };

    const newMessages = [...chatMessages, userMsg];
    const updatedTrip = { ...currentTrip, messages: newMessages };
    persistTrip(updatedTrip);
    set({ currentTrip: updatedTrip, chatMessages: newMessages });

    // Envia para o Supabase em tempo real para o app do motorista
    try {
      if (isSupabaseConfigured) {
        await supabase.from('trip_messages').insert({
          trip_id: currentTrip.id,
          sender_type: 'passenger',
          sender_id: currentTrip.passengerId,
          sender_name: currentTrip.passengerName,
          content: text.trim(),
          created_at: new Date().toISOString()
        });
      }
    } catch (_) {}
  },

  addDriverMessage: (text: string) => {
    const { currentTrip, chatMessages } = get();
    if (!currentTrip || !text.trim()) return;

    const driverMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tripId: currentTrip.id,
      sender: 'driver',
      senderName: currentTrip.driver?.name || 'Motorista',
      text: text.trim(),
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

    // Validação estrita: Origem e Destino não podem ser o mesmo local!
    const dist = haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    const isSameAddress = origin.address && destination.address && origin.address.trim().toLowerCase() === destination.address.trim().toLowerCase();
    if (dist < 50 || isSameAddress) {
      set({ error: 'O local de embarque e o destino não podem ser o mesmo local. Por favor, escolha um destino diferente.' });
      return null;
    }

    set({ isCreating: true, error: null });

    const newTripId = generateUUID();

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
      estimatedFare,
      requestedAt: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured) {
        const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
        const validPassengerId = isUUID(passenger.id) ? passenger.id : generateUUID();

        // 1. Grava na tabela 'rides' (tabela principal do banco)
        const ridePayload = {
          id: newTripId,
          passenger_id: validPassengerId,
          pickup_address: origin.address || `${origin.latitude}, ${origin.longitude}`,
          pickup_lat: origin.latitude,
          pickup_lng: origin.longitude,
          dropoff_address: destination.address || `${destination.latitude}, ${destination.longitude}`,
          dropoff_lat: destination.latitude,
          dropoff_lng: destination.longitude,
          fare_amount: estimatedFare,
          distance_km: Math.max(1, Math.round((estimatedDistanceMeters / 1000) * 10) / 10),
          status: 'SEARCHING'
        };

        const { error: rideError } = await supabase.from('rides').insert(ridePayload);
        if (rideError) {
          console.warn('Erro ao inserir em rides:', rideError.message);
        }

        // 2. Grava também na tabela 'trips' (caso exista para compatibilidade)
        try {
          await supabase.from('trips').insert({
            id: newTripId,
            passenger_id: passenger.id,
            passenger_name: passenger.name,
            pickup: origin.address,
            dropoff: destination.address,
            origin_lat: origin.latitude,
            origin_lng: origin.longitude,
            destination_lat: destination.latitude,
            destination_lng: destination.longitude,
            category: selectedCategory,
            payment_method: selectedPaymentMethod,
            fare: estimatedFare,
            estimated_price: estimatedFare,
            distance_meters: estimatedDistanceMeters,
            duration_seconds: estimatedDurationSeconds,
            status: 'SEARCHING',
            created_at: newTrip.requestedAt
          });
        } catch (_) {}
      }

      persistTrip(newTrip);
      set({ currentTrip: newTrip, isCreating: false, error: null });
      return newTrip;
    } catch (err: any) {
      console.warn('Erro na solicitação da corrida:', err);
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

    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('rides')
          .update({ status: 'CANCELLED' })
          .eq('id', currentTrip.id);

        await supabase
          .from('trips')
          .update({ status: 'CANCELLED', cancellation_reason: reason })
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

    const dist = haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    const isSameAddress = origin.address && destination.address && origin.address.trim().toLowerCase() === destination.address.trim().toLowerCase();
    if (dist < 50 || isSameAddress) {
      set({ error: 'O local de embarque e o destino não podem ser o mesmo local. Por favor, escolha um destino diferente.' });
      return null;
    }

    set({ isCreating: true, error: null });

    const newTripId = generateUUID();

    const newTrip: PassengerTrip = {
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
      estimatedFare,
      isScheduled: true,
      scheduledFor,
      scheduledNotes: notes,
      requestedAt: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured) {
        const tripPayload = {
          id: newTrip.id,
          passenger_id: passenger.id,
          passenger_name: passenger.name,
          pickup: origin.address || `${origin.latitude}, ${origin.longitude}`,
          dropoff: destination.address || `${destination.latitude}, ${destination.longitude}`,
          origin_lat: origin.latitude,
          origin_lng: origin.longitude,
          destination_lat: destination.latitude,
          destination_lng: destination.longitude,
          category: selectedCategory,
          payment_method: selectedPaymentMethod,
          fare: estimatedFare,
          estimated_price: estimatedFare,
          distance_meters: estimatedDistanceMeters,
          duration_seconds: estimatedDurationSeconds,
          status: 'SCHEDULED',
          scheduled_for: scheduledFor,
          notes: notes,
          created_at: newTrip.requestedAt
        };

        await supabase.from('trips').insert(tripPayload);
      }
    } catch (_) {
      // continua com persistência local
    }

    const updatedList = [newTrip, ...scheduledTrips];
    persistScheduledTrips(updatedList);
    set({
      scheduledTrips: updatedList,
      isCreating: false,
      destination: null,
      routeCoordinates: [],
      estimatedDistanceMeters: 0,
      estimatedDurationSeconds: 0,
      estimatedFare: 0,
      error: null
    });

    return newTrip;
  },

  cancelScheduledTrip: async (tripId: string) => {
    const { scheduledTrips } = get();
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('trips')
          .update({ status: 'CANCELLED', cancellation_reason: 'Cancelado pelo passageiro' })
          .eq('id', tripId);
      }
    } catch (_) {}

    const updatedList = scheduledTrips.filter((t) => t.id !== tripId);
    persistScheduledTrips(updatedList);
    set({ scheduledTrips: updatedList });
  },

  loadScheduledTrips: async (passengerId?: string) => {
    if (isSupabaseConfigured && passengerId) {
      try {
        const { data } = await supabase
          .from('trips')
          .select('*')
          .eq('passenger_id', passengerId)
          .eq('status', 'SCHEDULED')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const mapped: PassengerTrip[] = data.map((t: any) => ({
            id: t.id,
            status: 'SCHEDULED',
            passengerId: t.passenger_id,
            passengerName: t.passenger_name || 'Passageiro',
            origin: {
              latitude: t.origin_lat || -3.1037,
              longitude: t.origin_lng || -60.0125,
              address: t.pickup
            },
            destination: {
              latitude: t.destination_lat || -3.1037,
              longitude: t.destination_lng || -60.0125,
              address: t.dropoff
            },
            category: t.category || 'POPULAR',
            paymentMethod: t.payment_method || 'PIX',
            estimatedDistanceMeters: t.distance_meters || 0,
            estimatedDurationSeconds: t.duration_seconds || 0,
            estimatedFare: t.fare || t.estimated_price || 0,
            isScheduled: true,
            scheduledFor: t.scheduled_for,
            scheduledNotes: t.notes,
            requestedAt: t.created_at
          }));
          persistScheduledTrips(mapped);
          set({ scheduledTrips: mapped });
          return;
        }
      } catch (_) {}
    }
    set({ scheduledTrips: loadSavedScheduledTrips() });
  },

  finishRide: async (rating: number, feedback = '') => {
    const { currentTrip } = get();
    if (!currentTrip) return;

    try {
      if (currentTrip.driver?.id) {
        await supabase.from('ratings').insert({
          trip_id: currentTrip.id,
          passenger_id: currentTrip.passengerId,
          driver_id: currentTrip.driver.id,
          rating,
          feedback,
          created_at: new Date().toISOString()
        });
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
      isDriverTyping: false
    });
  },

  resetToIdle: () => {
    persistTrip(null);
    set({
      currentTrip: null,
      destination: null,
      routeCoordinates: [],
      estimatedDistanceMeters: 0,
      estimatedDurationSeconds: 0,
      estimatedFare: 0,
      error: null,
      chatMessages: [],
      unreadChatCount: 0,
      isDriverTyping: false
    });
  }
}));
