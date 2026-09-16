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
  Wallet,
  Eye,
  EyeOff
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
    subtitle: 'Av. Mário Ypiranga, Nº 1300 - Adrianópolis',
    coords: {
      latitude: -3.1037,
      longitude: -60.0125,
      street: 'Av. Mário Ypiranga',
      number: '1300',
      address: 'Manauara Shopping (Av. Mário Ypiranga, Nº 1300)',
      neighborhood: 'Adrianópolis',
      city: 'Manaus'
    }
  },
  {
    title: 'Aeroporto Eduardo Gomes',
    subtitle: 'Av. Santos Dumont, Nº 1350 - Tarumã',
    coords: {
      latitude: -3.0386,
      longitude: -60.0497,
      street: 'Av. Santos Dumont',
      number: '1350',
      address: 'Aeroporto Internacional Eduardo Gomes (Av. Santos Dumont, Nº 1350)',
      neighborhood: 'Tarumã',
      city: 'Manaus'
    }
  },
  {
    title: 'Amazonas Shopping',
    subtitle: 'Av. Djalma Batista, Nº 482 - Parque 10',
    coords: {
      latitude: -3.0964,
      longitude: -60.0238,
      street: 'Av. Djalma Batista',
      number: '482',
      address: 'Amazonas Shopping (Av. Djalma Batista, Nº 482)',
      neighborhood: 'Parque 10 de Novembro',
      city: 'Manaus'
    }
  },
  {
    title: 'Shopping Ponta Negra',
    subtitle: 'Av. Coronel Teixeira, Nº 5705 - Ponta Negra',
    coords: {
      latitude: -3.0768,
      longitude: -60.0817,
      street: 'Av. Coronel Teixeira',
      number: '5705',
      address: 'Shopping Ponta Negra (Av. Coronel Teixeira, Nº 5705)',
      neighborhood: 'Ponta Negra',
      city: 'Manaus'
    }
  },
  {
    title: 'Sumaúma Park Shopping',
    subtitle: 'Av. Noel Nutels, Nº 1762 - Cidade Nova',
    coords: {
      latitude: -3.0335,
      longitude: -59.9774,
      street: 'Av. Noel Nutels',
      number: '1762',
      address: 'Sumaúma Park Shopping (Av. Noel Nutels, Nº 1762)',
      neighborhood: 'Cidade Nova',
      city: 'Manaus'
    }
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

  // Estados de Ajuste / Confirmação Manual de Endereço com Rua e Número (Embarque ou Destino)
  const [editingAddressTarget, setEditingAddressTarget] = useState<'ORIGIN' | 'DESTINATION' | null>(null);
  const [customStreetInput, setCustomStreetInput] = useState('');
  const [customNumberInput, setCustomNumberInput] = useState('');
  const [customComplementInput, setCustomComplementInput] = useState('');
  const [customNeighborhoodInput, setCustomNeighborhoodInput] = useState('');

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
    cancellationNotification,
    arrivalNotification,
    dismissCancellationNotification,
    dismissArrivalNotification,
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
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [recenterRouteCount, setRecenterRouteCount] = useState(0);

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
      street: fav.coords.street,
      number: fav.coords.number,
      address: fav.coords.address,
      neighborhood: fav.coords.neighborhood,
      city: fav.coords.city
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

  // Abre modal de ajuste de endereço (rua, número, complemento) para Origem ou Destino
  const handleOpenEditAddress = (target: 'ORIGIN' | 'DESTINATION') => {
    const loc = target === 'ORIGIN' ? (origin || location) : destination;
    setEditingAddressTarget(target);

    const rawAddress = loc?.address || '';
    const extractedNum = loc?.number || rawAddress.match(/Nº\s*([0-9a-zA-Z-]+)/i)?.[1] || '';
    
    let streetName = loc?.street || '';
    if (!streetName) {
      if (rawAddress.includes('(')) {
        streetName = rawAddress.split('(')[0].trim();
      } else if (rawAddress.includes(',')) {
        streetName = rawAddress.split(',')[0].trim();
      } else {
        streetName = rawAddress;
      }
    }

    setCustomStreetInput(streetName);
    setCustomNumberInput(extractedNum);
    setCustomComplementInput('');
    setCustomNeighborhoodInput(loc?.neighborhood || 'Manaus');
  };

  // Salvar ajuste manual de endereço com Rua e Número
  const handleSaveCustomAddress = async () => {
    if (!editingAddressTarget) return;

    const street = customStreetInput.trim() || (editingAddressTarget === 'ORIGIN' ? 'Ponto de Embarque' : 'Ponto de Destino');
    const rawNum = customNumberInput.trim();
    const cleanNum = rawNum ? (rawNum.toLowerCase().startsWith('nº') || rawNum.toLowerCase() === 's/n' ? rawNum : `Nº ${rawNum}`) : 's/n';
    const complement = customComplementInput.trim();
    const neighborhood = customNeighborhoodInput.trim() || 'Manaus';

    const baseAddress = `${street}, ${cleanNum}`;
    const fullAddress = complement ? `${baseAddress} (${complement})` : baseAddress;

    if (editingAddressTarget === 'ORIGIN') {
      const updatedOrigin: LocationCoordinates = {
        latitude: origin?.latitude || location?.latitude || -3.1037,
        longitude: origin?.longitude || location?.longitude || -60.0125,
        street,
        number: rawNum || 's/n',
        address: fullAddress,
        neighborhood,
        city: origin?.city || location?.city || 'Manaus'
      };

      setIsCustomOrigin(true);
      setOrigin(updatedOrigin);
      setEditingAddressTarget(null);

      if (destination) {
        await updateRouteCalculation(updatedOrigin, destination);
      }

      setGpsToastMsg('📍 Endereço e número de embarque confirmados!');
    } else {
      const updatedDest: LocationCoordinates = {
        latitude: destination?.latitude || -3.0975,
        longitude: destination?.longitude || -60.0238,
        street,
        number: rawNum || 's/n',
        address: fullAddress,
        neighborhood,
        city: destination?.city || 'Manaus'
      };

      setDestination(updatedDest);
      setEditingAddressTarget(null);

      const currentOrigin = origin || location;
      if (currentOrigin) {
        await updateRouteCalculation(currentOrigin, updatedDest);
      }

      setGpsToastMsg('🏁 Endereço e número de destino confirmados!');
    }

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

  // Cancela a corrida e limpa o trajeto do mapa
  const handleCancelAndReset = useCallback(async () => {
    await cancelRide();
    setDestination(null);
    setRouteInfo({ coordinates: [], distanceMeters: 0, durationSeconds: 0, estimatedFare: 0 });
    setActiveStep('MAP');
    setIsPanelCollapsed(false);
    setGpsToastMsg('❌ Pedido cancelado. Mapa e rota redefinidos.');
    setTimeout(() => setGpsToastMsg(null), 3000);
  }, [cancelRide, setDestination, setRouteInfo]);

  // Limpa o trajeto / destino para visualizar o mapa limpo
  const handleClearRoute = useCallback(() => {
    setDestination(null);
    setRouteInfo({ coordinates: [], distanceMeters: 0, durationSeconds: 0, estimatedFare: 0 });
    setActiveStep('MAP');
    setGpsToastMsg('📍 Trajeto removido. Mapa pronto para nova busca.');
    setTimeout(() => setGpsToastMsg(null), 2500);
  }, [setDestination, setRouteInfo]);

  // Foca e exibe o trajeto completo no mapa
  const handleShowRoute = useCallback(async () => {
    setRecenterRouteCount((prev) => prev + 1);
    const activeOrigin = currentTrip?.origin || origin || location;
    const activeDest = currentTrip?.destination || destination;

    if (
      activeOrigin &&
      activeDest &&
      (!currentTrip?.routeCoordinates || currentTrip.routeCoordinates.length === 0)
    ) {
      try {
        const route = await calculateRoute(activeOrigin, activeDest);
        if (route?.coordinates?.length) {
          setRouteInfo({
            coordinates: route.coordinates,
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            estimatedFare: currentTrip?.estimatedFare || estimatedFare || 0
          });
        }
      } catch (_) {}
    }

    setGpsToastMsg('🗺️ Visualizando o trajeto completo no mapa');
    setTimeout(() => setGpsToastMsg(null), 2500);
  }, [currentTrip, origin, destination, location, estimatedFare, setRouteInfo]);

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
        address: 'Identificando rua e número do local marcado...',
        neighborhood: 'Ponto no Mapa',
        city: 'Manaus'
      };
      setOrigin(tempOrigin);
      setGpsToastMsg('📌 Alfinete posicionado! Identificando rua e número...');

      try {
        const geo = await reverseGeocode(lat, lng);
        const resolvedOrigin: LocationCoordinates = {
          latitude: lat,
          longitude: lng,
          street: geo.street,
          number: geo.number,
          address: geo.address,
          neighborhood: geo.neighborhood,
          city: geo.city
        };
        setOrigin(resolvedOrigin);
        if (destination) {
          await updateRouteCalculation(resolvedOrigin, destination);
        }
        setGpsToastMsg(`📍 Embarque ajustado: ${geo.address}`);
        setTimeout(() => setGpsToastMsg(null), 3500);
      } catch (e) {
        // mantém coordenadas
      }
    },
    [currentTrip, activeStep, searchTarget, destination, setOrigin, updateRouteCalculation, handleSelectPlace]
  );

  // Quando o usuário arrasta o alfinete de destino para marcar a entrada ou portão exato
  const handleDestinationPinMoved = useCallback(
    async ([lat, lng]: [number, number]) => {
      if (currentTrip && currentTrip.status !== 'IDLE') return;

      const tempDest: LocationCoordinates = {
        latitude: lat,
        longitude: lng,
        address: 'Identificando endereço do destino no mapa...',
        neighborhood: 'Destino no Mapa',
        city: 'Manaus'
      };
      setDestination(tempDest);
      setGpsToastMsg('🏁 Alfinete de destino posicionado! Identificando rua e número...');

      try {
        const geo = await reverseGeocode(lat, lng);
        const resolvedDest: LocationCoordinates = {
          latitude: lat,
          longitude: lng,
          street: geo.street,
          number: geo.number,
          address: geo.address,
          neighborhood: geo.neighborhood,
          city: geo.city
        };
        setDestination(resolvedDest);
        const currentOrigin = origin || location;
        if (currentOrigin) {
          await updateRouteCalculation(currentOrigin, resolvedDest);
        }
        setGpsToastMsg(`🏁 Destino ajustado: ${geo.address}`);
        setTimeout(() => setGpsToastMsg(null), 3500);
      } catch (e) {
        // mantém coordenadas
      }
    },
    [currentTrip, origin, location, setDestination, updateRouteCalculation]
  );

  // Categorias disponíveis com tarifas calculadas
  const categories = useMemo(() => {
    const rawCategories = getAvailableCategories({
      distanceMeters: estimatedDistanceMeters,
      durationSeconds: estimatedDurationSeconds
    });
    return rawCategories.map((cat) => ({
      ...cat,
      isVoucherEligible: true,
      calculatedFare: cat.price,
      estimatedArrivalMinutes: cat.etaMinutes
    }));
  }, [estimatedDistanceMeters, estimatedDurationSeconds]);

  // Tarifa dinâmica da categoria atualmente selecionada
  const activeCategoryFare = useMemo(() => {
    const matched = categories.find((c) => c.id === selectedCategory);
    return matched?.calculatedFare ?? estimatedFare;
  }, [categories, selectedCategory, estimatedFare]);

  // Validação se origem e destino são o mesmo local
  const isSameLocation = useMemo<boolean>(() => {
    if (!origin || !destination) return false;
    const dist = haversineDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
    const isSameAddress = Boolean(
      origin.address &&
      destination.address &&
      origin.address.trim().toLowerCase() === destination.address.trim().toLowerCase()
    );
    return Boolean(dist < 50 || isSameAddress);
  }, [origin, destination]);

  // Validação da data/hora de agendamento
  const validateScheduledDateTime = (): boolean => {
    if (rideMode !== 'SCHEDULE') return true;

    if (!scheduledDate || !scheduledTime) {
      setScheduleError('Por favor, selecione a data e o horário desejados.');
      return false;
    }

    const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const minAllowedTime = new Date(Date.now() + 25 * 60 * 1000); // Mínimo 25 min de antecedência

    if (selectedDateTime.getTime() < minAllowedTime.getTime()) {
      setScheduleError('O agendamento precisa ser feito com no mínimo 30 minutos de antecedência.');
      return false;
    }

    setScheduleError(null);
    return true;
  };

  // Submissão do Pedido de Corrida (Imediato ou Agendado)
  const handleConfirmRideRequest = async () => {
    if (!isApproved && selectedPaymentMethod === 'VOUCHER') {
      setIsPendingModalOpen(true);
      return;
    }

    if (!origin || !destination) {
      setGpsToastMsg('Selecione o ponto de partida e o destino');
      setTimeout(() => setGpsToastMsg(null), 3000);
      return;
    }

    if (isSameLocation) {
      setGpsToastMsg('Origem e destino não podem ser o mesmo local');
      setTimeout(() => setGpsToastMsg(null), 3500);
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
          origin={currentTrip?.origin || origin || location}
          destination={currentTrip?.destination || destination}
          routeCoordinates={
            currentTrip?.routeCoordinates && currentTrip.routeCoordinates.length > 0
              ? currentTrip.routeCoordinates
              : routeCoordinates
          }
          driver={currentTrip?.driver}
          nearbyDrivers={onlineDrivers}
          accuracy={accuracy}
          onMapClick={handleOriginPinMoved}
          onOriginDragEnd={handleOriginPinMoved}
          onDestinationDragEnd={handleDestinationPinMoved}
          isPinDraggable={!currentTrip || currentTrip.status === 'IDLE'}
          isDestinationDraggable={!currentTrip || currentTrip.status === 'IDLE'}
          pinLabel={currentTrip?.origin?.address || origin?.address || location?.address || 'Alfinete de Embarque'}
          focusRouteTrigger={recenterRouteCount}
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
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-dark-900" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">
                  {profile?.name || 'Passageiro SR'}
                </span>
                {(profile?.payment_preference === 'VOUCHER' || Boolean(profile?.corporate_company || profile?.company)) && (
                  <Badge className="bg-brand/20 text-brand-800 dark:text-brand border-brand/40 text-[9px] py-0 px-1">
                    Voucher
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{onlineDrivers.length > 0 ? `${onlineDrivers.length} motoristas ativos` : 'Radar ativo em Manaus'}</span>
              </div>
            </div>
          </Link>

          {/* Botões Superiores Direitos: Tema & Suporte */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 dark:bg-dark-900/95 shadow-xl border border-slate-200/80 dark:border-dark-700/80 text-blue-500 backdrop-blur-xl transition hover:scale-105 active:scale-95"
              title="Central de Ajuda e Suporte SR"
            >
              <HelpCircle size={19} />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Notificação Flutuante / Toast de Chegada do Motorista */}
        {arrivalNotification && currentTrip?.status === 'DRIVER_ARRIVED' && (
          <div className="pointer-events-auto self-center w-full max-w-md rounded-2xl bg-emerald-600 text-white p-3 shadow-2xl border border-emerald-400 flex items-center justify-between animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-700 font-black shrink-0 shadow-sm">
                <Car size={18} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black uppercase tracking-wider">Motorista chegou ao local!</h4>
                <p className="text-[11px] text-emerald-100 font-medium">Aguardando você no ponto de embarque.</p>
              </div>
            </div>
            <button
              onClick={() => dismissArrivalNotification()}
              className="p-1.5 rounded-lg hover:bg-emerald-700 text-white font-bold ml-2 transition text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Notificação Flutuante / Toast de GPS em Tempo Real */}
        {gpsToastMsg && (
          <div className="pointer-events-auto self-center rounded-full bg-slate-900/95 dark:bg-dark-900/95 text-white px-4 py-2 text-xs font-bold shadow-2xl border border-brand/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>{gpsToastMsg}</span>
          </div>
        )}
      </div>

      {/* BOTÕES FLUTUANTES NO MAPA: RECENTRALIZAR GPS, EXIBIR/OCULTAR & LIMPAR ROTA */}
      <div className="absolute right-3.5 bottom-[350px] z-10 flex flex-col gap-2.5 items-end pointer-events-none">
        {/* Botão Ver Trajeto / Rota Completa no Mapa */}
        {(currentTrip || destination) && (
          <button
            onClick={handleShowRoute}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/95 dark:bg-dark-900/95 text-brand shadow-2xl border border-brand/50 hover:scale-105 active:scale-95 transition backdrop-blur-xl text-xs font-black"
            title="Ver trajeto completo no mapa"
          >
            <Navigation size={16} className="text-brand" />
            <span>Ver Rota</span>
          </button>
        )}

        {/* Botão de Exibir/Ocultar Painel para visualização ampla do mapa */}
        <button
          onClick={() => setIsPanelCollapsed((prev) => !prev)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 dark:bg-dark-900/95 text-slate-800 dark:text-slate-100 shadow-2xl border border-slate-200/80 dark:border-dark-700/80 hover:scale-105 active:scale-95 transition backdrop-blur-xl text-xs font-black"
          title={isPanelCollapsed ? "Exibir painel de solicitação" : "Ocultar painel para ver o mapa completo"}
        >
          {isPanelCollapsed ? (
            <>
              <Eye size={17} className="text-brand-600 dark:text-brand" />
              <span>Exibir Painel</span>
            </>
          ) : (
            <>
              <EyeOff size={17} className="text-slate-500" />
              <span>Ocultar Painel</span>
            </>
          )}
        </button>

        {/* Botão Limpar Trajeto (se houver destino/rota e não tiver corrida ativa) */}
        {destination && (!currentTrip || currentTrip.status === 'IDLE') && (
          <button
            onClick={handleClearRoute}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 dark:bg-dark-900/95 text-red-600 dark:text-red-400 shadow-2xl border border-red-200 dark:border-red-900/40 hover:scale-105 active:scale-95 transition backdrop-blur-xl text-xs font-black"
            title="Limpar rota e destino do mapa"
          >
            <X size={16} />
            <span>Limpar Rota</span>
          </button>
        )}

        {/* Botão Recentralizar GPS */}
        <button
          onClick={handleRecenterGPS}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-dark-900 text-emerald-600 dark:text-emerald-400 shadow-2xl border border-slate-200 dark:border-dark-700 hover:scale-105 active:scale-95 transition"
          title="Recentralizar no meu GPS em tempo real"
        >
          <Crosshair size={22} className={gpsLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ÁREA INFERIOR: PAINEL DE SOLICITAÇÃO (BOTTOM SHEET INTERATIVO) */}
      <div className="mt-auto z-20 w-full max-w-lg mx-auto p-3">
        {isPanelCollapsed ? (
          <div className="w-full pb-2 animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={() => setIsPanelCollapsed(false)}
              className="w-full flex items-center justify-between rounded-2xl bg-white/95 dark:bg-dark-900/95 p-3.5 shadow-2xl border border-brand/50 backdrop-blur-xl transition hover:scale-[1.01] active:scale-95"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-3 w-3 rounded-full bg-brand animate-ping shrink-0" />
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {currentTrip && currentTrip.status === 'SEARCHING_DRIVER'
                    ? 'Procurando motorista... (Toque para abrir)'
                    : destination
                    ? 'Corrida configurada (Toque para abrir painel)'
                    : '📍 Para onde vamos? (Toque para abrir painel)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black text-brand-700 dark:text-brand shrink-0 ml-2">
                <Eye size={16} />
                <span>Exibir Painel</span>
              </div>
            </button>
          </div>
        ) : (
          <>
            {/* FLUXO 1: EM BUSCA DE MOTORISTA (RADAR) */}
            {currentTrip && currentTrip.status === 'SEARCHING_DRIVER' && (
              <PassengerSearchingRadar trip={currentTrip} onCancel={handleCancelAndReset} />
            )}

            {/* FLUXO 2: CORRIDA ACEITA OU EM ANDAMENTO */}
            {currentTrip &&
              (currentTrip.status === 'DRIVER_ASSIGNED' ||
                currentTrip.status === 'DRIVER_ARRIVING' ||
                currentTrip.status === 'DRIVER_ARRIVED' ||
                currentTrip.status === 'IN_PROGRESS') && (
                <PassengerActiveRideSheet
                  trip={currentTrip}
                  onCancel={handleCancelAndReset}
                  onShowRoute={handleShowRoute}
                />
              )}

        {/* FLUXO 3: DASHBOARD DE SOLICITAÇÃO / ESCOLHA DE DESTINO */}
        {(!currentTrip || currentTrip.status === 'IDLE') && (
          <>
            {/* ETAPA A: DASHBOARD INICIAL DO MAPA */}
            {activeStep === 'MAP' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-4 shadow-2xl space-y-3">
                {/* Cabeçalho do Painel com Botão Ver Mapa */}
                <div className="flex items-center justify-between pb-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Solicitar Transporte SR
                  </span>
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-800 transition"
                    title="Ocultar painel para ver mapa em tela cheia"
                  >
                    <EyeOff size={13} />
                    <span>Ver Mapa</span>
                  </button>
                </div>

                {/* Banner de Aprovação Pendente (se aplicável) */}
                {!isApproved && (
                  <button
                    onClick={() => setIsPendingModalOpen(true)}
                    className="w-full flex items-center justify-between rounded-2xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-left text-amber-900 dark:text-amber-200 transition hover:bg-amber-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black">Cadastro em Análise</p>
                        <p className="text-[10px] opacity-80">Você pode solicitar via PIX enquanto seu convênio é validado</p>
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

                {/* Card de Confirmação e Exibição do Ponto de Embarque / GPS em Tempo Real */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-50 dark:to-dark-800/80 p-3.5 border border-emerald-500/30 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shadow-md mt-0.5">
                        <MapPin size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Ponto de Embarque (GPS)
                          </span>
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {isLiveTracking ? (accuracy ? `GPS em Tempo Real (±${accuracy}m)` : 'GPS em Tempo Real') : 'Local Selecionado'}
                          </span>
                        </div>

                        {isResolvingAddress ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs py-1">
                            <Sparkles size={13} className="animate-spin text-amber-500" />
                            <span>Identificando rua e número exatos via GPS...</span>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs font-black text-slate-900 dark:text-white leading-snug break-words">
                              {origin?.address || location?.address || (gpsLoading ? '📍 Sintonizando GPS do aparelho...' : 'Toque no mapa para marcar o local 📌')}
                            </p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                              {origin?.neighborhood || location?.neighborhood || 'Manaus'} • {origin?.city || 'Manaus'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenEditAddress('ORIGIN')}
                      className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition flex items-center gap-1"
                      title="Adicionar ou corrigir número da casa, prédio ou portão"
                    >
                      <MapPin size={11} />
                      <span>Ajustar Nº</span>
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm transition active:scale-95"
                    >
                      <CheckCircle2 size={14} />
                      <span>Confirmar Embarque</span>
                    </button>

                    <button
                      onClick={() => {
                        setSearchTarget('ORIGIN');
                        setSearchQuery('');
                        setActiveStep('SELECT_DESTINATION');
                      }}
                      className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 hover:text-white font-bold text-xs border border-slate-200 dark:border-dark-700 transition active:scale-95"
                    >
                      <span>Mudar Local</span>
                    </button>
                  </div>
                </div>

                {/* Bloco do Destino */}
                <div className="rounded-2xl bg-slate-50 dark:bg-dark-800/80 p-3 border border-slate-200/60 dark:border-dark-700/60 hover:border-brand transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => {
                        setSearchTarget('DESTINATION');
                        setSearchQuery('');
                        setActiveStep('SELECT_DESTINATION');
                      }}
                      className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-700 dark:text-brand font-black text-xs mt-0.5">
                        <Navigation size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ponto de Destino (Para)
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {destination?.address || 'Para onde vamos hoje?'}
                        </p>
                        {destination?.neighborhood && (
                          <p className="text-[10px] text-slate-400 truncate">
                            {destination.neighborhood} • {destination.city || 'Manaus'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {destination && (
                        <button
                          onClick={() => handleOpenEditAddress('DESTINATION')}
                          className="text-[11px] font-black text-brand-700 dark:text-brand hover:underline bg-brand/10 hover:bg-brand/20 px-2 py-1 rounded-lg border border-brand/20 transition"
                          title="Ajustar número do destino"
                        >
                          Ajustar Nº
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSearchTarget('DESTINATION');
                          setSearchQuery('');
                          setActiveStep('SELECT_DESTINATION');
                        }}
                        className="text-[11px] font-black text-slate-600 dark:text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-900 transition"
                      >
                        {destination ? 'Alterar' : 'Escolher'}
                      </button>
                    </div>
                  </div>
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
                    if (destination) {
                      setActiveStep('SELECT_CATEGORY');
                    } else {
                      setSearchTarget('DESTINATION');
                      setSearchQuery('');
                      setActiveStep('SELECT_DESTINATION');
                    }
                  }}
                  className="py-3.5 text-sm font-black shadow-xl"
                >
                  <Search size={16} />
                  <span>{destination ? 'Ver Categorias e Preços' : 'Buscar Ponto de Destino'}</span>
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

                {/* Input de Pesquisa com Suporte a Rua e Número */}
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchTarget === 'ORIGIN'
                        ? 'Digite o ponto de embarque (Rua, Número, Shopping)...'
                        : 'Digite o destino (Rua, Número, Bairro, Shopping)...'
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

                {/* Botão Usar GPS atual para Embarque com Exibição de Rua e Número */}
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
                        <h4 className="text-xs font-black truncate">Usar Minha Localização Atual (GPS)</h4>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                          {isResolvingAddress
                            ? 'Identificando rua e número...'
                            : (location?.address || 'Detectando endereço via GPS...')}
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenEditAddress('ORIGIN')}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-black hover:bg-emerald-500/30 transition flex items-center gap-1"
                    >
                      <MapPin size={10} />
                      <span>+ Nº / Compl.</span>
                    </button>
                  </div>
                )}

                {/* Sugestões de Lugares Formatadas com Rua e Número */}
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

            {/* ETAPA C: TELA DE SOLICITAÇÃO (CONFIRMAÇÃO DE ROTA, CATEGORIAS, ENDEREÇOS COM NÚMERO E ENVIO) */}
            {activeStep === 'SELECT_CATEGORY' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-4 shadow-2xl space-y-3.5 max-h-[82vh] overflow-y-auto">
                {/* Barra de Ações Superior do Painel: Minimizar e Limpar Rota */}
                <div className="flex items-center justify-between pb-0.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Confirmar Viagem
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsPanelCollapsed(true)}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-dark-800 transition"
                      title="Ocultar painel para ver o mapa"
                    >
                      <EyeOff size={13} />
                      <span>Ver Mapa</span>
                    </button>
                    <button
                      onClick={handleClearRoute}
                      className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded-xl border border-red-200 dark:border-red-900/40 transition"
                      title="Cancelar e limpar rota do mapa"
                    >
                      <X size={13} />
                      <span>Limpar Rota</span>
                    </button>
                  </div>
                </div>

                {/* Resumo da Rota Editável com Rua e Número Claros de acordo com o GPS */}
                <div className="rounded-2xl bg-slate-50 dark:bg-dark-950/80 p-3.5 border border-slate-200/80 dark:border-dark-800 space-y-3">
                  {/* Ponto de Embarque com Rua e Número */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-xs mt-0.5 shadow-sm">
                        ●
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Embarque (De) • GPS
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                          {origin?.address || (location?.address ? location.address : `${origin?.latitude}, ${origin?.longitude}`)}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {origin?.neighborhood || location?.neighborhood || 'Manaus'} • {origin?.city || 'Manaus'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={() => handleOpenEditAddress('ORIGIN')}
                        className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 transition"
                        title="Ajustar número do embarque"
                      >
                        Ajustar Nº
                      </button>
                      <button
                        onClick={() => {
                          setSearchTarget('ORIGIN');
                          setSearchQuery('');
                          setActiveStep('SELECT_DESTINATION');
                        }}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-850 transition"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>

                  {/* Divisor com Botão de Inverter */}
                  <div className="flex items-center justify-between px-1">
                    <div className="h-px bg-slate-200 dark:bg-dark-800 flex-1" />
                    <button
                      onClick={handleSwapLocations}
                      className="mx-2 flex items-center gap-1 rounded-full bg-slate-200 dark:bg-dark-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-brand hover:border-brand border border-slate-300 dark:border-dark-700 transition active:scale-95"
                      title="Inverter Embarque e Destino"
                    >
                      <ArrowDownUp size={11} />
                      <span>Inverter</span>
                    </button>
                    <div className="h-px bg-slate-200 dark:bg-dark-800 flex-1" />
                  </div>

                  {/* Ponto de Destino com Rua e Número */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-dark-950 font-black text-xs mt-0.5 shadow-sm">
                        🏁
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-700 dark:text-brand block">
                          Destino (Para)
                        </span>
                        <p className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                          {destination?.address || `${destination?.latitude}, ${destination?.longitude}`}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {destination?.neighborhood || 'Manaus'} • {destination?.city || 'Manaus'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={() => handleOpenEditAddress('DESTINATION')}
                        className="text-[11px] font-black text-brand-700 dark:text-brand hover:underline bg-brand/10 px-2 py-1 rounded-lg border border-brand/20 transition"
                        title="Ajustar número do destino"
                      >
                        Ajustar Nº
                      </button>
                      <button
                        onClick={() => {
                          setSearchTarget('DESTINATION');
                          setSearchQuery('');
                          setActiveStep('SELECT_DESTINATION');
                        }}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-850 transition"
                      >
                        Alterar
                      </button>
                    </div>
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

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Observações para o Motorista (Opcional)
                      </label>
                      <input
                        type="text"
                        value={scheduledNotes}
                        onChange={(e) => setScheduledNotes(e.target.value)}
                        placeholder="Ex: Viagem com 2 malas grandes para o aeroporto"
                        className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-brand"
                      />
                    </div>

                    {scheduleError && (
                      <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{scheduleError}</p>
                    )}
                  </div>
                )}

                {/* Lista de Categorias de Veículos */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Escolha a Categoria
                  </span>

                  <div className="space-y-2">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id as TripCategory)}
                          className={`flex items-center justify-between rounded-2xl p-3 cursor-pointer transition border ${
                            isSelected
                              ? 'bg-brand/15 dark:bg-brand/10 border-brand shadow-sm'
                              : 'bg-slate-50 dark:bg-dark-800/60 border-slate-200/60 dark:border-dark-700/60 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                                isSelected
                                  ? 'bg-brand text-dark-950 font-black'
                                  : 'bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {getCategoryIcon(cat.icon)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white">{cat.name}</h4>
                                {cat.isVoucherEligible && (
                                  <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-black text-emerald-700 dark:text-emerald-400">
                                    Voucher
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">{cat.description}</p>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                Chega em ~{cat.estimatedArrivalMinutes} min
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 dark:text-white block">
                              {formatCurrency(cat.calculatedFare)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">estimativa</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seletor de Método de Pagamento */}
                <div className="rounded-2xl bg-slate-50 dark:bg-dark-800/80 p-3 border border-slate-200/60 dark:border-dark-700/60 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Forma de Pagamento
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Opção 1: PIX */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('PIX')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                        selectedPaymentMethod === 'PIX'
                          ? 'border-brand bg-brand/10 text-slate-900 dark:text-white shadow-sm'
                          : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <QrCode size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black block truncate">PIX Imediato</span>
                        <span className="text-[9px] text-slate-400 block">Direto ao motorista</span>
                      </div>
                    </button>

                    {/* Opção 2: Voucher Quinzenal */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('VOUCHER')}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                        selectedPaymentMethod === 'VOUCHER'
                          ? 'border-brand bg-brand/10 text-slate-900 dark:text-white shadow-sm'
                          : 'border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="h-6 w-6 rounded-lg bg-brand/20 text-brand-800 dark:text-brand flex items-center justify-center shrink-0">
                        <Building2 size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black block truncate">Voucher Empresa</span>
                        <span className="text-[9px] text-slate-400 block">Faturamento quinzenal</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Botão de Solicitação / Confirmação */}
                <div className="space-y-2 pt-1">
                  <Button
                    variant="primary"
                    size="lg"
                    full
                    disabled={isCreating || isSameLocation}
                    onClick={handleConfirmRideRequest}
                    className="py-4 text-sm font-black shadow-2xl tracking-wide"
                  >
                    {isCreating ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-dark-950 border-t-transparent animate-spin" />
                        <span>Enviando Pedido...</span>
                      </div>
                    ) : rideMode === 'SCHEDULE' ? (
                      <div className="flex items-center justify-center gap-2">
                        <CalendarCheck size={18} />
                        <span>Agendar {getCategoryTitle(selectedCategory)} • {formatCurrency(activeCategoryFare)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>Solicitar {getCategoryTitle(selectedCategory)}</span>
                        <span>•</span>
                        <span>{formatCurrency(activeCategoryFare)}</span>
                        <ArrowRight size={18} />
                      </div>
                    )}
                  </Button>

                  <button
                    onClick={() => setActiveStep('MAP')}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white py-1"
                  >
                    Voltar ao Mapa
                  </button>
                </div>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>

      {/* Modal de Alerta de Cancelamento Imediato pelo Motorista */}
      {cancellationNotification && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-dark-900 p-6 shadow-2xl border border-red-500/40 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Corrida Cancelada</h3>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {cancellationNotification}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              full
              onClick={() => {
                dismissCancellationNotification();
                setActiveStep('MAP');
              }}
              className="py-3 font-black bg-brand text-dark-950 hover:bg-brand-dark"
            >
              OK, Entendido
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Sucesso de Agendamento */}
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

      {/* Modal Unificado de Ajuste e Confirmação de Endereço com Rua e Número */}
      {editingAddressTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-dark-900 p-5 shadow-2xl border border-slate-200 dark:border-dark-700 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                {editingAddressTarget === 'ORIGIN' ? (
                  <MapPin size={20} className="text-emerald-500" />
                ) : (
                  <Navigation size={20} className="text-brand" />
                )}
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingAddressTarget === 'ORIGIN' ? 'Confirmar Endereço de Embarque' : 'Confirmar Endereço de Destino'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {editingAddressTarget === 'ORIGIN' ? 'Informe a rua e número exatos para o GPS' : 'Informe o número exato do destino'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAddressTarget(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Rua / Avenida / Logradouro *
                </label>
                <input
                  type="text"
                  value={customStreetInput}
                  onChange={(e) => setCustomStreetInput(e.target.value)}
                  placeholder="Ex: Av. Mário Ypiranga, Rua Salvador..."
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Número da Casa / Prédio *
                  </label>
                  <input
                    type="text"
                    value={customNumberInput}
                    onChange={(e) => setCustomNumberInput(e.target.value)}
                    placeholder="Ex: 1300 ou s/n"
                    className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-3 py-2.5 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={customNeighborhoodInput}
                    onChange={(e) => setCustomNeighborhoodInput(e.target.value)}
                    placeholder="Ex: Adrianópolis"
                    className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Complemento / Bloco / Ponto de Referência
                </label>
                <input
                  type="text"
                  value={customComplementInput}
                  onChange={(e) => setCustomComplementInput(e.target.value)}
                  placeholder="Ex: Apto 302, Bloco B, Portão Verde, Ao lado da padaria"
                  className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                💡 O motorista receberá a rua e o número exatos para localizá-lo sem desencontros.
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="md"
                full
                onClick={() => setEditingAddressTarget(null)}
                className="py-2.5 font-bold border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                full
                onClick={handleSaveCustomAddress}
                className="py-2.5 font-black bg-brand text-dark-950 hover:bg-brand-dark"
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
