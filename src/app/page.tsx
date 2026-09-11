'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Clock,
  Shield,
  ShieldCheck,
  Car,
  Package,
  Sparkles,
  ChevronRight,
  Navigation,
  Star,
  Calendar,
  CalendarCheck,
  HelpCircle,
  Globe,
  ExternalLink,
  Crosshair,
  ArrowRight,
  ArrowDownUp,
  X,
  AlertCircle,
  QrCode,
  Building2,
  Phone,
  CheckCircle2,
  Award,
  Wallet
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PassengerMapWrapper } from '@/components/map/PassengerMapWrapper';
import { PassengerSearchingRadar } from '@/components/Ride/PassengerSearchingRadar';
import { PassengerActiveRideSheet } from '@/components/Ride/PassengerActiveRideSheet';
import { RideFinishedModal } from '@/components/Ride/RideFinishedModal';
import { ScheduledSuccessModal } from '@/components/Ride/ScheduledSuccessModal';
import { SupportModal } from '@/components/SupportModal';
import { PendingApprovalModal } from '@/components/PendingApprovalModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePassengerLocation } from '@/hooks/usePassengerLocation';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import { useRideStatus } from '@/hooks/useRideStatus';
import { useOnlineDrivers } from '@/hooks/useOnlineDrivers';
import { searchPlaces, reverseGeocode, PlaceSuggestion } from '@/services/geocoding';
import { calculateRoute, haversineDistance } from '@/services/routing';
import { getAvailableCategories, calculateFare } from '@/features/trips/domain/pricing';
import { formatCurrency, formatDistance, formatDuration, formatDateTime } from '@/lib/utils';
import { SR_SUPPORT_CONFIG } from '@/types';
import type { TripCategory, PassengerTrip } from '@/features/trips/domain/passenger-trip.types';
import type { LocationCoordinates, PaymentMethod } from '@/types';

function getDefaultScheduleTime(): { date: string; time: string } {
  const d = new Date(Date.now() + 45 * 60 * 1000); // 45 minutos no futuro
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String((Math.ceil(d.getMinutes() / 5) * 5) % 60).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

const FAVORITE_DESTINATIONS = [
  {
    title: 'Manauara Shopping',
    subtitle: 'Av. Mário Ypiranga, 1300 - Adrianópolis',
    coords: { latitude: -3.1037, longitude: -60.0125, address: 'Manauara Shopping (Av. Mário Ypiranga, 1300)' }
  },
  {
    title: 'Aeroporto Eduardo Gomes',
    subtitle: 'Av. Santos Dumont, 1350 - Tarumã',
    coords: { latitude: -3.0386, longitude: -60.0497, address: 'Aeroporto Internacional Eduardo Gomes' }
  },
  {
    title: 'Amazonas Shopping',
    subtitle: 'Av. Djalma Batista, 482 - Parque 10',
    coords: { latitude: -3.0964, longitude: -60.0238, address: 'Amazonas Shopping (Av. Djalma Batista)' }
  },
  {
    title: 'Ponta Negra',
    subtitle: 'Av. Coronel Teixeira - Orla Ponta Negra',
    coords: { latitude: -3.0642, longitude: -60.1009, address: 'Praia de Ponta Negra, Manaus' }
  },
  {
    title: 'Distrito Industrial',
    subtitle: 'Av. Rodrigo Otávio - Polo Industrial de Manaus',
    coords: { latitude: -3.1319, longitude: -59.9822, address: 'Distrito Industrial I, Manaus' }
  }
];

export default function HomePage() {
  const { user, profile, loading: authLoading, loginAsGuest } = useAuth();
  const router = useRouter();
  const {
    location,
    hasRealGPS,
    accuracy,
    loading: gpsLoading,
    isResolvingAddress,
    isLiveTracking,
    permissionGranted,
    gpsError,
    refreshLocation,
    forceResolveAddress
  } = usePassengerLocation();
  const [isCustomOrigin, setIsCustomOrigin] = useState(false);
  const [gpsToastMsg, setGpsToastMsg] = useState<string | null>(null);

  // Estados de Ajuste / Confirmação Manual de Endereço de Embarque
  const [isEditingOriginAddress, setIsEditingOriginAddress] = useState(false);
  const [customAddressInput, setCustomAddressInput] = useState('');
  const [addressComplement, setAddressComplement] = useState('');

  const {
    currentTrip,
    origin,
    destination,
    selectedCategory,
    selectedPaymentMethod,
    routeCoordinates,
    estimatedDistanceMeters,
    estimatedDurationSeconds,
    estimatedFare,
    scheduledTrips,
    isCreating,
    error: storeError,
    setOrigin,
    setDestination,
    swapOriginAndDestination,
    setSelectedCategory,
    setSelectedPaymentMethod,
    setRouteInfo,
    requestRide,
    scheduleRide,
    cancelRide,
    finishRide,
    loadScheduledTrips
  } = usePassengerTripStore();

  useRideStatus();

  // Carrega motoristas reais e online do Supabase
  const { onlineDrivers, refreshOnlineDrivers } = useOnlineDrivers(location || origin);

  // Estados locais da UI
  const [searchTarget, setSearchTarget] = useState<'ORIGIN' | 'DESTINATION'>('DESTINATION');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeStep, setActiveStep] = useState<'MAP' | 'SELECT_DESTINATION' | 'SELECT_CATEGORY'>('MAP');

  // Modo de Solicitação: Imediato ('NOW') ou Agendado ('SCHEDULE')
  const [rideMode, setRideMode] = useState<'NOW' | 'SCHEDULE'>('NOW');
  const defaultSchedule = useMemo(() => getDefaultScheduleTime(), []);
  const [scheduledDate, setScheduledDate] = useState(defaultSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(defaultSchedule.time);
  const [scheduledNotes, setScheduledNotes] = useState('');
  const [scheduledSuccessTrip, setScheduledSuccessTrip] = useState<PassengerTrip | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Modais de Apoio
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const isApproved = profile?.is_approved !== false && profile?.status !== 'pending';

  // Garante que o passageiro consiga navegar e solicitar corridas sem ser expulso
  useEffect(() => {
    if (!authLoading && !user) {
      loginAsGuest();
    }
  }, [user, authLoading, loginAsGuest]);

  // Carrega agendamentos
  useEffect(() => {
    if (user?.id) {
      loadScheduledTrips(user.id);
    }
  }, [user, loadScheduledTrips]);

  // Sincroniza origem com o GPS em tempo real continuamente (se não foi customizado manualmente)
  useEffect(() => {
    if (location && !isCustomOrigin) {
      setOrigin(location);
    }
  }, [location, isCustomOrigin, setOrigin]);

  // Busca de endereços com debounce
  useEffect(() => {
    if (activeStep !== 'SELECT_DESTINATION') return;

    const timer = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setSuggestions(results);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, activeStep]);

  // Recalcula rota sempre que origem ou destino mudam
  const updateRouteCalculation = useCallback(
    async (origLoc: LocationCoordinates, destLoc: LocationCoordinates) => {
      const dist = haversineDistance(origLoc.latitude, origLoc.longitude, destLoc.latitude, destLoc.longitude);
      if (dist < 50) {
        setRouteInfo({
          coordinates: [],
          distanceMeters: 0,
          durationSeconds: 0,
          estimatedFare: 0
        });
        return;
      }

      try {
        const route = await calculateRoute(origLoc, destLoc);
        const fare = calculateFare({
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          category: selectedCategory
        });

        setRouteInfo({
          coordinates: route.coordinates,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          estimatedFare: fare.totalFare
        });
      } catch (err) {
        console.warn('Erro ao calcular rota:', err);
      }
    },
    [selectedCategory, setRouteInfo]
  );

  // Seleciona um local das sugestões
  const handleSelectPlace = async (place: PlaceSuggestion) => {
    setIsSearching(true);
    const selectedCoords = place.coordinates;

    if (searchTarget === 'ORIGIN') {
      setIsCustomOrigin(true);
      setOrigin(selectedCoords);
      if (destination) {
        await updateRouteCalculation(selectedCoords, destination);
        setActiveStep('SELECT_CATEGORY');
      } else {
        setSearchTarget('DESTINATION');
        setSearchQuery('');
      }
    } else {
      setDestination(selectedCoords);
      const currentOrigin = origin || location;
      if (currentOrigin) {
        await updateRouteCalculation(currentOrigin, selectedCoords);
      }
      setActiveStep('SELECT_CATEGORY');
    }

    setIsSearching(false);
  };

  // Seleciona um destino favorito rápido
  const handleSelectQuickFavorite = async (fav: (typeof FAVORITE_DESTINATIONS)[0]) => {
    const destCoords: LocationCoordinates = {
      latitude: fav.coords.latitude,
      longitude: fav.coords.longitude,
      address: fav.coords.address
    };
    setDestination(destCoords);
    const currentOrigin = origin || location;
    if (currentOrigin) {
      await updateRouteCalculation(currentOrigin, destCoords);
    }
    setActiveStep('SELECT_CATEGORY');
  };

  // Usar GPS atual como Origem
  const handleUseCurrentLocationAsOrigin = async () => {
    setIsCustomOrigin(false);
    refreshLocation();
    if (location) {
      setOrigin(location);
      if (destination) {
        await updateRouteCalculation(location, destination);
        setActiveStep('SELECT_CATEGORY');
      } else {
        setSearchTarget('DESTINATION');
        setSearchQuery('');
      }
      setGpsToastMsg('📍 Localização GPS sincronizada com sucesso!');
      setTimeout(() => setGpsToastMsg(null), 3000);
    }
  };

  // Salvar ajuste manual de endereço de embarque
  const handleSaveCustomOriginAddress = async () => {
    const baseAddr = customAddressInput.trim() || origin?.address || location?.address || 'Manaus - AM';
    const finalAddr = addressComplement.trim() ? `${baseAddr} (${addressComplement.trim()})` : baseAddr;

    const updatedOrigin: LocationCoordinates = {
      latitude: origin?.latitude || location?.latitude || -3.1037,
      longitude: origin?.longitude || location?.longitude || -60.0125,
      address: finalAddr,
      neighborhood: origin?.neighborhood || location?.neighborhood || 'Manaus',
      city: origin?.city || location?.city || 'Manaus'
    };

    setIsCustomOrigin(true);
    setOrigin(updatedOrigin);
    setIsEditingOriginAddress(false);

    if (destination) {
      await updateRouteCalculation(updatedOrigin, destination);
      setActiveStep('SELECT_CATEGORY');
    }

    setGpsToastMsg('📍 Endereço de embarque confirmado!');
    setTimeout(() => setGpsToastMsg(null), 3000);
  };

  // Recentralizar GPS em tempo real
  const handleRecenterGPS = () => {
    setIsCustomOrigin(false);
    refreshLocation();
    forceResolveAddress();
    if (location) {
      setOrigin(location);
      if (destination) {
        updateRouteCalculation(location, destination);
      }
      setGpsToastMsg(
        accuracy ? `📍 GPS ativo (precisão ±${accuracy}m)` : '📍 GPS sincronizado em tempo real'
      );
      setTimeout(() => setGpsToastMsg(null), 3500);
    } else {
      setGpsToastMsg('📍 Buscando sinal do GPS do seu aparelho...');
      setTimeout(() => setGpsToastMsg(null), 3000);
    }
  };

  // Inverter Origem e Destino
  const handleSwapLocations = async () => {
    if (origin && destination) {
      setIsCustomOrigin(true);
      swapOriginAndDestination();
      await updateRouteCalculation(destination, origin);
    }
  };

  // Quando o usuário arrasta o alfinete de embarque ou clica no mapa para marcar o local exato
  const handleOriginPinMoved = useCallback(
    async ([lat, lng]: [number, number]) => {
      if (currentTrip && currentTrip.status !== 'IDLE') return;

      if (activeStep === 'SELECT_DESTINATION' && searchTarget === 'DESTINATION') {
        const geo = await reverseGeocode(lat, lng);
        const clickedPlace: PlaceSuggestion = {
          id: `custom-dest-${Date.now()}`,
          title: geo.address || 'Ponto de Destino',
          subtitle: `${geo.neighborhood || 'Manaus'}`,
          coordinates: geo
        };
        handleSelectPlace(clickedPlace);
        return;
      }

      // Posiciona o Alfinete de Embarque (Ponto de Partida)
      setIsCustomOrigin(true);
      const tempOrigin: LocationCoordinates = {
        latitude: lat,
        longitude: lng,
        address: 'Identificando rua do local marcado...',
        neighborhood: 'Ponto no Mapa',
        city: 'Manaus'
      };
      setOrigin(tempOrigin);
      setGpsToastMsg('📌 Alfinete posicionado! Identificando rua...');

      try {
        const geo = await reverseGeocode(lat, lng);
        const resolvedOrigin: LocationCoordinates = {
          latitude: lat,
          longitude: lng,
          address: geo.address,
          neighborhood: geo.neighborhood,
          city: geo.city
        };
        setOrigin(resolvedOrigin);
        if (destination) {
          await updateRouteCalculation(resolvedOrigin, destination);
        }
        setGpsToastMsg(`📍 Ponto de embarque: ${geo.address}`);
        setTimeout(() => setGpsToastMsg(null), 3500);
      } catch (e) {
        // mantém coordenadas
      }
    },
    [currentTrip, activeStep, searchTarget, destination, setOrigin, updateRouteCalculation]
  );

  // Lista de categorias de corrida com tarifas calculadas
  const availableCategories = useMemo(() => {
    return getAvailableCategories({
      distanceMeters: estimatedDistanceMeters || 4500,
      durationSeconds: estimatedDurationSeconds || 600
    });
  }, [estimatedDistanceMeters, estimatedDurationSeconds]);

  // Verifica se origem e destino são o mesmo ponto
  const isSameLocation = useMemo(() => {
    if (!origin || !destination) return false;
    const dist = haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    const sameAddress =
      origin.address &&
      destination.address &&
      origin.address.trim().toLowerCase() === destination.address.trim().toLowerCase();
    return dist < 50 || Boolean(sameAddress);
  }, [origin, destination]);

  // Validação do agendamento
  const validateScheduledDateTime = () => {
    if (rideMode !== 'SCHEDULE') return true;
    try {
      const selected = new Date(`${scheduledDate}T${scheduledTime}:00`);
      const now = new Date();
      const diffMinutes = (selected.getTime() - now.getTime()) / (1000 * 60);

      if (isNaN(selected.getTime())) {
        setScheduleError('Por favor, informe uma data e hora válidas.');
        return false;
      }

      if (diffMinutes < 15) {
        setScheduleError('O agendamento precisa ser feito com no mínimo 15 minutos de antecedência.');
        return false;
      }

      setScheduleError(null);
      return true;
    } catch {
      setScheduleError('Data e hora inválidas.');
      return false;
    }
  };

  // Dispara solicitação (imediata ou agendada)
  const handleSubmitRide = async () => {
    if (isSameLocation) return;

    if (!isApproved) {
      setIsPendingModalOpen(true);
      return;
    }

    const passengerData = {
      id: profile?.id || user?.id || 'demo-passenger',
      name: profile?.name || 'Passageiro SR',
      phone: profile?.phone || '(92) 99123-4567'
    };

    if (rideMode === 'SCHEDULE') {
      if (!validateScheduledDateTime()) return;
      const scheduledDateTimeISO = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      const scheduledTrip = await scheduleRide(passengerData, scheduledDateTimeISO, scheduledNotes);
      if (scheduledTrip) {
        setScheduledSuccessTrip(scheduledTrip);
        setActiveStep('MAP');
      }
    } else {
      await requestRide(passengerData);
      setActiveStep('MAP');
    }
  };

  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case 'car':
        return <Car size={22} />;
      case 'shield-check':
        return <ShieldCheck size={22} />;
      case 'sparkles':
        return <Sparkles size={22} />;
      case 'package':
        return <Package size={22} />;
      default:
        return <Car size={22} />;
    }
  };

  const getCategoryTitle = (cat: TripCategory) => {
    switch (cat) {
      case 'POPULAR':
        return 'SR Pop';
      case 'CONFORT':
        return 'SR Confort';
      case 'EXECUTIVO':
        return 'SR Executivo';
      case 'ENTREGA':
        return 'SR Entrega';
      default:
        return 'SR Pop';
    }
  };

  const todayDateString = new Date().toISOString().split('T')[0];
  const nextScheduledTrip = scheduledTrips.length > 0 ? scheduledTrips[0] : null;

  if (authLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 bg-slate-50 dark:bg-dark-950">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Carregando SR Logística...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative flex flex-col h-dvh w-full overflow-hidden bg-slate-100 dark:bg-dark-950">
      {/* MAPA INTERATIVO PRINCIPAL AO VIVO COM ALFINETE DE EMBARQUE */}
      <div className="absolute inset-0 z-0">
        <PassengerMapWrapper
          origin={origin || location}
          destination={destination}
          routeCoordinates={routeCoordinates}
          driver={currentTrip?.driver}
          nearbyDrivers={onlineDrivers}
          accuracy={accuracy}
          onMapClick={handleOriginPinMoved}
          onOriginDragEnd={handleOriginPinMoved}
          isPinDraggable={true}
          pinLabel={origin?.address || location?.address || 'Alfinete de Embarque'}
          className="w-full h-full"
        />
      </div>

      {/* HEADER EXECUTIVO FLUTUANTE SUPERIOR */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between">
          {/* Card do Usuário + Indicador de Motoristas Online */}
          <Link
            href="/perfil"
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-white/95 dark:bg-dark-900/95 p-2 pr-3.5 shadow-2xl border border-slate-200/80 dark:border-dark-700/80 backdrop-blur-xl transition hover:scale-[1.02] active:scale-95"
          >
            <div className="relative">
              <img
                src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt="Avatar"
                className="h-10 w-10 rounded-xl object-cover border-2 border-brand"
              />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white dark:border-dark-900" />
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                  {profile?.name?.split(' ')[0] || 'Passageiro'}
                </span>
                <span className="text-[10px] font-bold text-amber-500 flex items-center">
                  ★ {profile?.rating || 4.98}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                {onlineDrivers.length > 0 ? `${onlineDrivers.length} motorista(s) online` : 'SR Logística'}
              </span>
            </div>
          </Link>

          {/* Botões de Ação Rápida: Ajuda, Tema e GPS */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <ThemeToggle />

            <button
              onClick={() => setIsSupportOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 dark:bg-dark-900/95 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-dark-700/80 backdrop-blur-xl active:scale-95 transition"
              title="Central de Ajuda & WhatsApp 24h"
            >
              <HelpCircle size={18} className="text-blue-500" />
            </button>

            <button
              onClick={handleRecenterGPS}
              className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 dark:bg-dark-900/95 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-dark-700/80 backdrop-blur-xl active:scale-95 transition ${
                gpsLoading ? 'animate-pulse' : ''
              }`}
              title="Centralizar Meu GPS em Tempo Real"
            >
              <Crosshair size={18} className="text-brand-600 dark:text-brand" />
            </button>
          </div>
        </div>

        {/* Dica Flutuante: Alfinete de Embarque Interativo */}
        {!destination && activeStep === 'MAP' && (
          <div className="pointer-events-auto self-center flex items-center gap-2 rounded-full bg-dark-950/90 text-white text-[10.5px] font-bold px-3.5 py-1.5 shadow-2xl border border-emerald-500/50 backdrop-blur-md animate-in fade-in slide-in-from-top-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Toque no mapa ou arraste o alfinete 📌 para marcar o local exato</span>
          </div>
        )}

        {/* Notificação Flutuante de Status do GPS */}
        {gpsToastMsg && (
          <div className="pointer-events-auto self-center rounded-full bg-dark-900/90 text-white text-[11px] font-bold px-3.5 py-1.5 shadow-xl border border-brand/40 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {gpsToastMsg}
          </div>
        )}

        {/* Alerta caso o GPS tenha sido negado no navegador */}
        {permissionGranted === false && gpsError && (
          <div className="pointer-events-auto flex items-center justify-between rounded-2xl bg-amber-500/95 text-dark-950 px-3 py-2 text-xs font-bold shadow-xl border border-amber-400 backdrop-blur-md animate-in fade-in">
            <span>⚠️ Ative a localização nas permissões do navegador para precisão total.</span>
            <button
              onClick={handleRecenterGPS}
              className="ml-2 px-2 py-0.5 rounded-lg bg-dark-950 text-white text-[10px] uppercase font-black"
            >
              Tentar
            </button>
          </div>
        )}
      </div>

      {/* PAINEL INFERIOR INTERATIVO E INTELIGENTE */}
      <div className="absolute bottom-16 inset-x-3 z-30 flex flex-col gap-2.5 max-w-lg mx-auto w-full">
        {/* CASO 1: Em busca de motorista (Radar em Tempo Real) */}
        {currentTrip && currentTrip.status === 'SEARCHING_DRIVER' && (
          <PassengerSearchingRadar
            trip={currentTrip}
            onCancel={() => cancelRide('Cancelado pelo usuário')}
          />
        )}

        {/* CASO 2: Motorista Designado / A Caminho / Em Rota (100% Real) */}
        {currentTrip &&
          ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(
            currentTrip.status
          ) && (
            <PassengerActiveRideSheet
              trip={currentTrip}
              onCancel={() => cancelRide('Cancelado pelo usuário')}
            />
          )}

        {/* CASO 3: Sem corrida em andamento -> HUB PRINCIPAL DE SOLICITAÇÃO & DESTINOS */}
        {(!currentTrip || currentTrip.status === 'IDLE') && (
          <>
            {/* ETAPA A: DASHBOARD INICIAL PROFISSIONAL */}
            {activeStep === 'MAP' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-4 shadow-2xl space-y-3">
                {/* Alerta de Aprovação Pendente se aplicável */}
                {!isApproved && (
                  <button
                    onClick={() => setIsPendingModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-2xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-left text-slate-900 dark:text-white transition hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-dark-950 font-black">
                        <Clock size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                          Cadastro em Análise no Admin
                        </span>
                        <span className="text-xs font-bold truncate block">
                          Toque para agilizar liberação ➔
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-amber-600 shrink-0" />
                  </button>
                )}

                {/* Card de Próxima Viagem Agendada (se houver) */}
                {nextScheduledTrip && (
                  <Link
                    href="/corridas"
                    className="flex items-center justify-between rounded-2xl bg-brand/10 border border-brand/30 p-2.5 text-slate-900 dark:text-white transition hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand text-dark-950 font-black">
                        <CalendarCheck size={15} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-brand-700 dark:text-brand block">
                          Corrida Agendada
                        </span>
                        <span className="text-xs font-bold">
                          {nextScheduledTrip.scheduledFor ? formatDateTime(nextScheduledTrip.scheduledFor) : 'Programada'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-black text-brand-700 dark:text-brand">
                      <span>Ver</span>
                      <ChevronRight size={14} />
                    </div>
                  </Link>
                )}

                {/* Seletor de Modo: Agora vs Agendar */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-dark-950 p-1 border border-slate-200/60 dark:border-dark-800">
                  <button
                    onClick={() => setRideMode('NOW')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition ${
                      rideMode === 'NOW'
                        ? 'bg-brand text-dark-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Car size={16} />
                    <span>Solicitar Agora</span>
                  </button>

                  <button
                    onClick={() => setRideMode('SCHEDULE')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition ${
                      rideMode === 'SCHEDULE'
                        ? 'bg-brand text-dark-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={16} />
                    <span>Agendar Viagem</span>
                  </button>
                </div>

                {/* Card de Confirmação e Exibição do Ponto de Embarque / GPS */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-50 dark:to-dark-800/80 p-3 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shadow-md mt-0.5">
                        <MapPin size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Ponto de Partida / Embarque
                          </span>
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                            {isLiveTracking ? '● GPS em Tempo Real' : 'Localização'}
                          </span>
                        </div>

                        {isResolvingAddress ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs py-1">
                            <Sparkles size={13} className="animate-spin text-amber-500" />
                            <span>Identificando rua e número exatos...</span>
                          </div>
                        ) : (
                          <div className="mt-0.5 space-y-0.5">
                            <p className="text-xs font-black text-slate-900 dark:text-white leading-snug break-words">
                              {origin?.address || location?.address || (gpsLoading ? '📍 Obtendo sinal GPS do aparelho...' : 'Toque no mapa para posicionar o alfinete 📌')}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {origin?.neighborhood || location?.neighborhood || 'Local Marcado'} • {origin?.city || 'Manaus'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCustomAddressInput(origin?.address || location?.address || '');
                        setAddressComplement('');
                        setIsEditingOriginAddress(true);
                      }}
                      className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 transition"
                      title="Adicionar número da casa, bloco ou ponto de referência"
                    >
                      Ajustar Nº
                    </button>
                  </div>

                  {/* Ações Rápidas de Embarque */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20">
                    <button
                      onClick={() => {
                        setSearchTarget('DESTINATION');
                        setSearchQuery('');
                        setActiveStep('SELECT_DESTINATION');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm transition active:scale-95"
                    >
                      <CheckCircle2 size={13} />
                      <span>Confirmar Partida</span>
                    </button>

                    <button
                      onClick={() => {
                        setSearchTarget('ORIGIN');
                        setSearchQuery('');
                        setActiveStep('SELECT_DESTINATION');
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 hover:text-white font-bold text-xs border border-slate-200 dark:border-dark-700 transition active:scale-95"
                    >
                      <span>Mudar Local</span>
                    </button>
                  </div>
                </div>

                {/* Bloco do Destino */}
                <div
                  onClick={() => {
                    setSearchTarget('DESTINATION');
                    setSearchQuery('');
                    setActiveStep('SELECT_DESTINATION');
                  }}
                  className="flex items-center justify-between cursor-pointer group rounded-2xl bg-slate-50 dark:bg-dark-800/80 p-3 border border-slate-200/60 dark:border-dark-700/60 hover:border-brand transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-700 dark:text-brand font-black text-xs">
                      <Navigation size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                        Ponto de Destino (Para)
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {destination?.address || 'Para onde vamos hoje?'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-brand-700 dark:text-brand group-hover:underline shrink-0 ml-2">
                    {destination ? 'Alterar' : 'Escolher'}
                  </span>
                </div>

                {/* Atalhos Rápidos de Destinos em Manaus (1-Tap Fast Fill) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Destinos Rápidos
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {FAVORITE_DESTINATIONS.map((fav, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectQuickFavorite(fav)}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-100 dark:bg-dark-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand border border-slate-200/70 dark:border-dark-700 transition active:scale-95 shrink-0"
                      >
                        <MapPin size={12} className="text-brand" />
                        <span>{fav.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botão de Ação Principal */}
                <Button
                  variant="primary"
                  size="lg"
                  full
                  onClick={() => {
                    if (destination && origin && !isSameLocation) {
                      setActiveStep('SELECT_CATEGORY');
                    } else {
                      setSearchTarget('DESTINATION');
                      setSearchQuery('');
                      setActiveStep('SELECT_DESTINATION');
                    }
                  }}
                >
                  <Search size={18} />
                  <span>{destination ? 'Ver Preços e Categorias' : 'Buscar Destino'}</span>
                </Button>
              </div>
            )}

            {/* ETAPA B: DRAWER DE BUSCA DE ENDEREÇOS (EMBARQUE OU DESTINO) */}
            {activeStep === 'SELECT_DESTINATION' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-4 shadow-2xl max-h-[80vh] overflow-y-auto space-y-3.5">
                {/* Header de Troca: Embarque vs Destino */}
                <div className="flex items-center justify-between">
                  <div className="flex rounded-xl bg-slate-100 dark:bg-dark-950 p-1 border border-slate-200/60 dark:border-dark-800">
                    <button
                      onClick={() => {
                        setSearchTarget('ORIGIN');
                        setSearchQuery('');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                        searchTarget === 'ORIGIN'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      <MapPin size={13} />
                      <span>Embarque (De)</span>
                    </button>

                    <button
                      onClick={() => {
                        setSearchTarget('DESTINATION');
                        setSearchQuery('');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                        searchTarget === 'DESTINATION'
                          ? 'bg-brand text-dark-950 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      <Navigation size={13} />
                      <span>Destino (Para)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {origin && destination && (
                      <button
                        onClick={handleSwapLocations}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-200 hover:text-brand transition active:scale-95"
                        title="Inverter Origem e Destino"
                      >
                        <ArrowDownUp size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => setActiveStep(destination ? 'SELECT_CATEGORY' : 'MAP')}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-400 hover:text-white transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Input de Pesquisa */}
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchTarget === 'ORIGIN'
                        ? 'Digite o ponto de embarque (rua, prédio, shopping)...'
                        : 'Digite o destino (shopping, aeroporto, bairro)...'
                    }
                    className="w-full rounded-2xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-4 py-3 pl-10 text-xs font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Botão Usar GPS atual para Embarque */}
                {searchTarget === 'ORIGIN' && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 p-2.5">
                    <button
                      onClick={handleUseCurrentLocationAsOrigin}
                      className="flex-1 flex items-center gap-2.5 text-left text-emerald-700 dark:text-emerald-400 hover:opacity-80 transition active:scale-[0.99] min-w-0"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                        <Crosshair size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black truncate">Usar Minha Localização Atual</h4>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                          {isResolvingAddress
                            ? 'Identificando rua e número...'
                            : (location?.address || 'Detectando endereço via GPS...')}
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setCustomAddressInput(location?.address || '');
                        setAddressComplement('');
                        setIsEditingOriginAddress(true);
                      }}
                      className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-black hover:bg-emerald-500/30 transition"
                    >
                      + Nº / Compl.
                    </button>
                  </div>
                )}

                {/* Sugestões de Lugares */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Sugestões em Manaus
                  </span>
                  {suggestions.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => handleSelectPlace(place)}
                      className="w-full flex items-start gap-3 rounded-2xl p-2.5 text-left transition border border-transparent hover:border-brand/30 hover:bg-brand/10 dark:hover:bg-dark-800"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-800 text-brand-600 dark:text-brand mt-0.5">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {place.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {place.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ETAPA C: ESCOLHA DE CATEGORIAS, VALORES, AGENDAMENTO & CONFIRMAÇÃO */}
            {activeStep === 'SELECT_CATEGORY' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-4 shadow-2xl space-y-3.5 max-h-[82vh] overflow-y-auto">
                {/* Resumo da Rota Editável */}
                <div className="rounded-2xl bg-slate-50 dark:bg-dark-950/70 p-3 border border-slate-200/80 dark:border-dark-800 space-y-2.5">
                  {/* Ponto de Embarque */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-[10px]">
                        ●
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ponto de Embarque (De)
                        </span>
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {origin?.address || `${origin?.latitude}, ${origin?.longitude}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSearchTarget('ORIGIN');
                        setSearchQuery('');
                        setActiveStep('SELECT_DESTINATION');
                      }}
                      className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 ml-2"
                    >
                      Alterar
                    </button>
                  </div>

                  {/* Divisor com Botão de Inverter */}
                  <div className="flex items-center justify-between px-1">
                    <div className="h-px bg-slate-200 dark:bg-dark-800 flex-1" />
                    <button
                      onClick={handleSwapLocations}
                      className="mx-2 flex items-center gap-1 rounded-full bg-slate-200 dark:bg-dark-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-brand hover:border-brand border border-slate-300 dark:border-dark-700 transition active:scale-95"
                      title="Inverter Embarque e Destino"
                    >
                      <ArrowDownUp size={11} />
                      <span>Inverter</span>
                    </button>
                    <div className="h-px bg-slate-200 dark:bg-dark-800 flex-1" />
                  </div>

                  {/* Ponto de Destino */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-dark-950 font-black text-[10px]">
                        🏁
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ponto de Destino (Para)
                        </span>
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {destination?.address || `${destination?.latitude}, ${destination?.longitude}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSearchTarget('DESTINATION');
                        setSearchQuery('');
                        setActiveStep('SELECT_DESTINATION');
                      }}
                      className="text-xs font-black text-brand-700 dark:text-brand hover:underline shrink-0 ml-2"
                    >
                      Alterar
                    </button>
                  </div>

                  {/* Detalhes de Rota */}
                  {!isSameLocation && estimatedDistanceMeters > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-dark-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <span>Distância: {formatDistance(estimatedDistanceMeters)}</span>
                      <span>•</span>
                      <span>Tempo estimado: {formatDuration(estimatedDurationSeconds)}</span>
                    </div>
                  )}
                </div>

                {/* ALERTA: Origem e Destino Iguais */}
                {isSameLocation && (
                  <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-bold">Embarque e Destino são iguais!</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Por favor, selecione um destino diferente para calcular a rota e solicitar.
                      </p>
                    </div>
                  </div>
                )}

                {/* Seletor de Modo na Confirmação: Agora vs Agendar */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-dark-950 p-1 border border-slate-200/60 dark:border-dark-800">
                  <button
                    onClick={() => {
                      setRideMode('NOW');
                      setScheduleError(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      rideMode === 'NOW'
                        ? 'bg-brand text-dark-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Car size={15} />
                    <span>Agora</span>
                  </button>

                  <button
                    onClick={() => setRideMode('SCHEDULE')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      rideMode === 'SCHEDULE'
                        ? 'bg-brand text-dark-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Calendar size={15} />
                    <span>Agendar Corrida</span>
                  </button>
                </div>

                {/* Bloco de Agendamento (se modo agendar) */}
                {rideMode === 'SCHEDULE' && (
                  <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-brand">
                        <Calendar size={15} />
                        <span>Data & Hora Marcada</span>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px]">
                        Agendamento
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Data
                        </label>
                        <input
                          type="date"
                          min={todayDateString}
                          value={scheduledDate}
                          onChange={(e) => {
                            setScheduledDate(e.target.value);
                            setScheduleError(null);
                          }}
                          className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Horário
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => {
                            setScheduledTime(e.target.value);
                            setScheduleError(null);
                          }}
                          className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      value={scheduledNotes}
                      onChange={(e) => setScheduledNotes(e.target.value)}
                      placeholder="Instruções para o motorista (ex: malas, portaria)..."
                      className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-brand placeholder:text-slate-400"
                    />

                    {scheduleError && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{scheduleError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Seleção de Categorias de Veículos */}
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {availableCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex flex-col justify-between rounded-2xl p-2.5 text-left transition border ${
                          isSelected
                            ? 'border-brand bg-brand/10 dark:bg-brand/15 shadow-md shadow-brand/10 scale-[1.01]'
                            : 'border-slate-200/80 dark:border-dark-700/60 bg-slate-50 dark:bg-dark-950/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div
                            className={`p-1.5 rounded-xl ${
                              isSelected ? 'bg-brand text-dark-950' : 'bg-slate-200 dark:bg-dark-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {getCategoryIcon(cat.icon)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{cat.etaMinutes} min</span>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">{cat.name}</h4>
                          <span className="text-sm font-black text-slate-900 dark:text-brand mt-0.5 block">
                            {formatCurrency(cat.price)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Forma de Pagamento */}
                <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 dark:bg-dark-950/60 p-2.5 border border-slate-100 dark:border-dark-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedPaymentMethod === 'PIX' ? (
                        <QrCode size={18} className="text-emerald-500" />
                      ) : (
                        <Building2 size={18} className="text-brand-600 dark:text-brand" />
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {selectedPaymentMethod === 'PIX' ? 'PIX Imediato' : 'Voucher Corporativo'}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {(['PIX', 'VOUCHER'] as PaymentMethod[]).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(pm)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition ${
                            selectedPaymentMethod === pm
                              ? 'bg-brand text-dark-950 shadow-sm'
                              : 'bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {pm === 'PIX' ? 'PIX' : '🏢 Voucher'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {storeError && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{storeError}</span>
                  </div>
                )}

                {/* Botão de Solicitação Final */}
                <Button
                  variant="primary"
                  size="xl"
                  full
                  disabled={isCreating || isSameLocation}
                  onClick={handleSubmitRide}
                >
                  {isCreating ? (
                    'Processando solicitação...'
                  ) : isSameLocation ? (
                    'Selecione locais diferentes'
                  ) : rideMode === 'SCHEDULE' ? (
                    <>
                      <Calendar size={18} />
                      Solicitar Corrida Agendada
                    </>
                  ) : (
                    <>
                      Solicitar {getCategoryTitle(selectedCategory)}
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Confirmação de Agendamento */}
      {scheduledSuccessTrip && (
        <ScheduledSuccessModal
          trip={scheduledSuccessTrip}
          onClose={() => setScheduledSuccessTrip(null)}
        />
      )}

      {/* Modal de Suporte */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Modal de Aprovação Pendente */}
      <PendingApprovalModal isOpen={isPendingModalOpen} onClose={() => setIsPendingModalOpen(false)} />

      {/* Modal de Avaliação Quando Concluída */}
      {currentTrip && currentTrip.status === 'COMPLETED' && (
        <RideFinishedModal
          trip={currentTrip}
          onFinish={(rating, feedback) => finishRide(rating, feedback)}
        />
      )}

      {/* Modal de Ajuste e Confirmação de Endereço de Embarque */}
      {isEditingOriginAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-dark-900 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Confirmar Ponto de Embarque</h3>
              </div>
              <button
                onClick={() => setIsEditingOriginAddress(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Endereço / Rua Principal *
                </label>
                <input
                  type="text"
                  value={customAddressInput}
                  onChange={(e) => setCustomAddressInput(e.target.value)}
                  placeholder="Ex: Av. Djalma Batista, Rua Recife..."
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Número / Complemento / Ponto de Referência
                </label>
                <input
                  type="text"
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  placeholder="Ex: Nº 123, Bloco B, Portão 2, Em frente ao shopping"
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                💡 O motorista receberá exatamente esse ponto de embarque para encontrar você rapidamente sem desencontros.
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="md"
                full
                onClick={() => setIsEditingOriginAddress(false)}
                className="py-2.5 font-bold border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                full
                onClick={handleSaveCustomOriginAddress}
                className="py-2.5 font-black bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Salvar e Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
