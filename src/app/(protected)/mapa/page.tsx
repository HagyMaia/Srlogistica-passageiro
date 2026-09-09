'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Crosshair,
  Car,
  ShieldCheck,
  Bike,
  Package,
  Building2,
  QrCode,
  Receipt,
  Sparkles,
  ArrowRight,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { PassengerMapWrapper } from '@/components/map/PassengerMapWrapper';
import { PassengerSearchingRadar } from '@/components/Ride/PassengerSearchingRadar';
import { PassengerActiveRideSheet } from '@/components/Ride/PassengerActiveRideSheet';
import { RideFinishedModal } from '@/components/Ride/RideFinishedModal';
import { ScheduledSuccessModal } from '@/components/Ride/ScheduledSuccessModal';
import { SupportModal } from '@/components/SupportModal';
import { PendingApprovalModal } from '@/components/PendingApprovalModal';
import { Button, Badge, Card } from '@/components/ui';
import { usePassengerLocation } from '@/hooks/usePassengerLocation';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import { useRideStatus } from '@/hooks/useRideStatus';
import { searchPlaces, reverseGeocode, PlaceSuggestion } from '@/services/geocoding';
import { calculateRoute } from '@/services/routing';
import { getAvailableCategories, calculateFare } from '@/features/trips/domain/pricing';
import { formatCurrency, formatDistance, formatDuration } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { TripCategory, PassengerTrip } from '@/features/trips/domain/passenger-trip.types';
import type { LocationCoordinates, PaymentMethod } from '@/types';

function getDefaultScheduleTime(): { date: string; time: string } {
  const d = new Date(Date.now() + 45 * 60 * 1000); // 45 minutos no futuro
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(Math.ceil(d.getMinutes() / 5) * 5 % 60).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

export default function MapaPage() {
  const { profile } = useAuth();
  const { location, loading: locLoading, refreshLocation } = usePassengerLocation();
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
    isCreating,
    setOrigin,
    setDestination,
    setSelectedCategory,
    setSelectedPaymentMethod,
    setRouteInfo,
    requestRide,
    scheduleRide,
    cancelRide,
    finishRide,
    changeStatus,
    resetToIdle
  } = usePassengerTripStore();

  useRideStatus();

  // Estados locais da UI
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

  // Lê parâmetro de URL inicial (ex: /mapa?mode=schedule)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'schedule') {
        setRideMode('SCHEDULE');
        setActiveStep('SELECT_DESTINATION');
      }
    }
  }, []);

  // Inicializa origem com a localização do passageiro
  useEffect(() => {
    if (location && !origin) {
      setOrigin(location);
    }
  }, [location, origin, setOrigin]);

  // Motoristas próximos simulados para sensação de app vivo
  const nearbyDrivers = useMemo(() => {
    const lat = location?.latitude || -3.1037;
    const lng = location?.longitude || -60.0125;
    return [
      { id: 'd-1', latitude: lat + 0.0028, longitude: lng + 0.0031 },
      { id: 'd-2', latitude: lat - 0.0035, longitude: lng + 0.0018 },
      { id: 'd-3', latitude: lat + 0.0015, longitude: lng - 0.0042 },
      { id: 'd-4', latitude: lat - 0.0022, longitude: lng - 0.0025 }
    ];
  }, [location]);

  // Busca de endereços com debounce
  useEffect(() => {
    if (activeStep !== 'SELECT_DESTINATION') return;

    const timer = setTimeout(async () => {
      const results = await searchPlaces(searchQuery);
      setSuggestions(results);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeStep]);

  // Seleciona destino e calcula rota
  const handleSelectDestination = async (place: PlaceSuggestion) => {
    setIsSearching(true);
    const destLoc = place.coordinates;
    setDestination(destLoc);

    const origLoc = origin || location;
    if (origLoc) {
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
      } catch {
        // fallback
      }
    }

    setIsSearching(false);
    setActiveStep('SELECT_CATEGORY');
  };

  // Clique no mapa para selecionar ponto
  const handleMapClick = useCallback(
    async ([lat, lng]: [number, number]) => {
      if (currentTrip && currentTrip.status !== 'IDLE') return;

      const geo = await reverseGeocode(lat, lng);
      if (!destination) {
        handleSelectDestination({
          id: `custom-dest-${Date.now()}`,
          title: geo.address || 'Ponto no Mapa',
          subtitle: `${geo.neighborhood || 'Manaus'}`,
          coordinates: geo
        });
      }
    },
    [currentTrip, destination]
  );

  // Lista de categorias de corrida com tarifas calculadas
  const availableCategories = useMemo(() => {
    return getAvailableCategories({
      distanceMeters: estimatedDistanceMeters || 4500,
      durationSeconds: estimatedDurationSeconds || 600
    });
  }, [estimatedDistanceMeters, estimatedDurationSeconds]);

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
    // Validação de Aprovação do Cadastro no Admin
    if (!isApproved) {
      setIsPendingModalOpen(true);
      return;
    }

    const passengerData = {
      id: profile?.id || 'demo-passenger',
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

  // Ícones para as categorias
  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case 'car':
        return <Car size={22} />;
      case 'shield-check':
        return <ShieldCheck size={22} />;
      case 'bike':
        return <Bike size={22} />;
      case 'package':
        return <Package size={22} />;
      default:
        return <Car size={22} />;
    }
  };

  // Nomes amigáveis de categoria
  const getCategoryTitle = (cat: TripCategory) => {
    switch (cat) {
      case 'POPULAR':
        return 'SR Pop';
      case 'CONFORT':
        return 'SR Confort';
      case 'MOTO':
        return 'SR Moto';
      case 'ENTREGA':
        return 'SR Entrega';
      default:
        return 'SR Pop';
    }
  };

  // Data mínima (hoje) para o input
  const todayDateString = new Date().toISOString().split('T')[0];

  return (
    <div className="relative flex flex-col h-dvh w-full overflow-hidden bg-slate-100 dark:bg-dark-950">
      {/* Mapa Principal de Fundo */}
      <div className="absolute inset-0 z-0">
        <PassengerMapWrapper
          origin={origin || location}
          destination={destination}
          routeCoordinates={routeCoordinates}
          driver={currentTrip?.driver}
          nearbyDrivers={nearbyDrivers}
          onMapClick={handleMapClick}
          className="w-full h-full"
        />
      </div>

      {/* Header Flutuante Superior */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/95 dark:bg-dark-900/95 px-3.5 py-2 shadow-xl border border-slate-200/80 dark:border-dark-700/80 backdrop-blur-md">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[100px]">
            {profile?.name?.split(' ')[0] || 'Passageiro'}
          </span>
          {isApproved ? (
            <Badge className="bg-brand/20 text-brand-800 dark:text-brand border-brand/40 text-[10px]">
              ★ {profile?.rating || 4.9}
            </Badge>
          ) : (
            <button
              onClick={() => setIsPendingModalOpen(true)}
              className="rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 text-[9px] font-black uppercase"
            >
              Pendente
            </button>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Botão de Suporte & Central */}
          <button
            onClick={() => setIsSupportOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 dark:bg-dark-900/95 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-dark-700/80 backdrop-blur-md active:scale-95 transition"
            aria-label="Central de Ajuda e Suporte"
            title="Ajuda e Suporte SR"
          >
            <HelpCircle size={20} className="text-blue-500" />
          </button>

          {/* Botão de GPS */}
          <button
            onClick={refreshLocation}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 dark:bg-dark-900/95 text-slate-700 dark:text-slate-200 shadow-xl border border-slate-200/80 dark:border-dark-700/80 backdrop-blur-md active:scale-95 transition"
            aria-label="Centralizar no meu GPS"
            title="Centralizar GPS"
          >
            <Crosshair size={20} className="text-brand-600 dark:text-brand" />
          </button>
        </div>
      </div>

      {/* Camadas Inferiores Condicionais com base no Estado da Corrida */}
      <div className="absolute bottom-16 inset-x-3 z-30 flex flex-col gap-3">
        {/* CASO 1: Em busca de motorista (Radar) */}
        {currentTrip && currentTrip.status === 'SEARCHING_DRIVER' && (
          <PassengerSearchingRadar
            trip={currentTrip}
            onCancel={() => cancelRide('Cancelado pelo usuário')}
          />
        )}

        {/* CASO 2: Motorista Designado, A Caminho ou Em Andamento */}
        {currentTrip &&
          ['DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(
            currentTrip.status
          ) && (
            <PassengerActiveRideSheet
              trip={currentTrip}
              onCancel={() => cancelRide('Cancelado pelo usuário')}
              onSimulateNext={() => {
                if (currentTrip.status === 'DRIVER_ASSIGNED') changeStatus('DRIVER_ARRIVING');
                else if (currentTrip.status === 'DRIVER_ARRIVING') changeStatus('DRIVER_ARRIVED');
                else if (currentTrip.status === 'DRIVER_ARRIVED') changeStatus('IN_PROGRESS');
                else if (currentTrip.status === 'IN_PROGRESS') changeStatus('COMPLETED');
              }}
            />
          )}

        {/* CASO 3: Sem corrida ativa -> Fluxo de Seleção e Solicitação */}
        {(!currentTrip || currentTrip.status === 'IDLE') && (
          <>
            {/* ETAPA A: Barra Inicial "Para onde vamos?" com atalhos Agora / Agendar */}
            {activeStep === 'MAP' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-4 shadow-2xl space-y-3">
                {/* Seletor de Tipo de Solicitação (Agora vs Agendar) */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-dark-950 p-1 border border-slate-200/60 dark:border-dark-800">
                  <button
                    onClick={() => {
                      setRideMode('NOW');
                      setActiveStep('SELECT_DESTINATION');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                      rideMode === 'NOW'
                        ? 'bg-brand text-dark-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Car size={16} />
                    <span>Solicitar Agora</span>
                  </button>

                  <button
                    onClick={() => {
                      setRideMode('SCHEDULE');
                      setActiveStep('SELECT_DESTINATION');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                      rideMode === 'SCHEDULE'
                        ? 'bg-brand text-dark-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={16} />
                    <span>Agendar Viagem</span>
                    <span className="rounded-full bg-dark-950/15 dark:bg-brand/20 px-1.5 py-0.2 text-[9px] font-black uppercase">
                      Novo
                    </span>
                  </button>
                </div>

                {/* Toque para pesquisar destino */}
                <div
                  onClick={() => setActiveStep('SELECT_DESTINATION')}
                  className="cursor-pointer rounded-2xl bg-slate-50 dark:bg-dark-800/80 p-3.5 border border-slate-200/60 dark:border-dark-700/60 transition hover:border-brand/50 flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-dark-950 font-black shadow-md shadow-brand/25">
                    <Search size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      {rideMode === 'SCHEDULE' ? 'Para onde quer agendar sua corrida?' : 'Para onde você quer ir hoje?'}
                    </h3>
                    <p className="text-[11px] text-slate-400">Toque para selecionar o endereço de destino</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                  <span className="truncate">
                    {origin?.address || 'Detectando seu ponto de embarque...'}
                  </span>
                </div>
              </div>
            )}

            {/* ETAPA B: Modal / Drawer de Busca de Destino */}
            {activeStep === 'SELECT_DESTINATION' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-5 shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {rideMode === 'SCHEDULE' ? (
                        <>
                          <Calendar size={12} className="text-brand" /> Corrida Agendada
                        </>
                      ) : (
                        <>
                          <Car size={12} className="text-brand" /> Solicitação Imediata
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Definir Destino
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveStep('MAP')}
                    className="p-1 rounded-full text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Campo de Busca */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite shopping, aeroporto, rua..."
                    className="w-full rounded-2xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-950 px-4 py-3.5 pl-11 text-sm font-medium outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-slate-900 dark:text-white"
                  />
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                </div>

                {/* Lista de Sugestões de Lugares */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Locais Populares & Sugestões
                  </span>
                  {suggestions.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => handleSelectDestination(place)}
                      className="w-full flex items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-brand/10 dark:hover:bg-dark-800 border border-transparent hover:border-brand/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-dark-800 text-brand-600 dark:text-brand">
                        <MapPin size={18} />
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

            {/* ETAPA C: Escolha de Categoria, Agendamento & Tarifa Estimada */}
            {activeStep === 'SELECT_CATEGORY' && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-900 p-4 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto">
                {/* Cabeçalho da Rota Selecionada */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-brand-600 dark:text-brand" />
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Destino</span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                        {destination?.address || destination?.neighborhood || 'Destino Escolhido'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>{formatDistance(estimatedDistanceMeters)}</span>
                    <span>•</span>
                    <span>{formatDuration(estimatedDurationSeconds)}</span>
                    <button
                      onClick={() => setActiveStep('SELECT_DESTINATION')}
                      className="text-brand-700 dark:text-brand font-black underline ml-1 text-xs"
                    >
                      Trocar
                    </button>
                  </div>
                </div>

                {/* Abas Alternadoras: Agora vs Agendar */}
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

                {/* SEÇÃO ESPECÍFICA DE CORRIDA AGENDADA */}
                {rideMode === 'SCHEDULE' && (
                  <div className="rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-brand">
                        <Calendar size={16} />
                        <span>Programar Horário de Embarque</span>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px]">
                        Agendamento
                      </Badge>
                    </div>

                    {/* Controles de Data e Hora */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                          Data do Embarque
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
                          Horário Previsto
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

                    {/* Observação / Notas de Agendamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Instruções para o Motorista (Opcional)
                      </label>
                      <input
                        type="text"
                        value={scheduledNotes}
                        onChange={(e) => setScheduledNotes(e.target.value)}
                        placeholder="Ex: Viagem para o aeroporto, 2 malas grandes..."
                        className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-brand placeholder:text-slate-400"
                      />
                    </div>

                    {scheduleError && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{scheduleError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Seleção de Categorias (SR Pop, Confort, Moto, Entrega) */}
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
                          {pm === 'PIX' ? 'PIX' : '🏢 Voucher (Quinzenal)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedPaymentMethod === 'VOUCHER' && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      🏢 Faturamento quinzenal direto para a empresa conveniada
                    </p>
                  )}
                </div>

                {/* Botão de Confirmação: Solicitar Agora ou Solicitar Corrida Agendada */}
                <Button
                  variant="primary"
                  size="xl"
                  full
                  disabled={isCreating}
                  onClick={handleSubmitRide}
                >
                  {isCreating ? (
                    'Processando solicitação...'
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

      {/* Modal de Sucesso de Corrida Agendada */}
      {scheduledSuccessTrip && (
        <ScheduledSuccessModal
          trip={scheduledSuccessTrip}
          onClose={() => setScheduledSuccessTrip(null)}
        />
      )}

      {/* Modal de Central de Suporte e Ajuda */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Modal de Aprovação Pendente no Painel Admin */}
      <PendingApprovalModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
      />

      {/* Modal de Avaliação Quando Corrida é Concluída */}
      {currentTrip && currentTrip.status === 'COMPLETED' && (
        <RideFinishedModal
          trip={currentTrip}
          onFinish={(rating, feedback) => finishRide(rating, feedback)}
        />
      )}
    </div>
  );
}
