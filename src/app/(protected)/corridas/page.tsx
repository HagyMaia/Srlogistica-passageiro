'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Navigation,
  Car,
  Star,
  ChevronRight,
  RefreshCw,
  DollarSign,
  Calendar,
  CalendarCheck,
  AlertCircle,
  Trash2,
  Plus,
  HelpCircle
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { usePassengerTripStore } from '@/features/trips/store/usePassengerTripStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { SupportModal } from '@/components/SupportModal';

interface HistoricalRide {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  status: string;
  created_at: string;
  driver_name?: string;
  driver_vehicle?: string;
  driver_avatar?: string;
  category?: string;
}

export default function CorridasPage() {
  const { user } = useAuth();
  const { scheduledTrips, cancelScheduledTrip, loadScheduledTrips } = usePassengerTripStore();
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'SCHEDULED'>('HISTORY');
  const [rides, setRides] = useState<HistoricalRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    loadScheduledTrips(user?.id);
  }, [user, loadScheduledTrips]);

  const loadRides = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let rawRides: any[] = [];

      if (isSupabaseConfigured) {
        // 1. Busca direta na tabela 'rides' filtrando pelo ID do passageiro
        const { data: userRides, error: ridesErr } = await supabase
          .from('rides')
          .select('id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fare_amount, distance_km, status, created_at, driver_id, passenger_id')
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (!ridesErr && Array.isArray(userRides)) {
          rawRides = [...userRides];
        }

        // Se for um usuário temporário/convidado, tenta também buscar por IDs armazenados localmente
        if (rawRides.length === 0 && typeof window !== 'undefined') {
          try {
            const savedLocalIds = JSON.parse(localStorage.getItem('sr_passenger_ride_ids') || '[]');
            if (Array.isArray(savedLocalIds) && savedLocalIds.length > 0) {
              const { data: localRides } = await supabase
                .from('rides')
                .select('id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fare_amount, distance_km, status, created_at, driver_id, passenger_id')
                .in('id', savedLocalIds)
                .order('created_at', { ascending: false });

              if (localRides && localRides.length > 0) {
                rawRides = localRides;
              }
            }
          } catch (_) {}
        }
      }

      // 2. Busca dados complementares dos motoristas associados (sem depender de joins relacionais frágeis)
      const driverIds = Array.from(new Set(rawRides.map((r) => r.driver_id).filter(Boolean)));
      const driverMap: Record<string, any> = {};

      if (driverIds.length > 0 && isSupabaseConfigured) {
        try {
          const { data: drivers } = await supabase
            .from('motoristas')
            .select('id, nome, nome_social, nome_completo, marca_veiculo, modelo_veiculo, cor_veiculo, placa_veiculo, avatar_url, rating')
            .in('id', driverIds);

          if (drivers && Array.isArray(drivers)) {
            drivers.forEach((d) => {
              driverMap[d.id] = d;
            });
          }
        } catch (e) {
          console.warn('Não foi possível carregar motoristas do histórico:', e);
        }
      }

      // 3. Mapeia todas as corridas (concluídas, canceladas e ativas)
      const mapped: HistoricalRide[] = rawRides.map((t: any) => {
        const driver = t.driver_id ? driverMap[t.driver_id] : null;
        const driverName = driver
          ? driver.nome || driver.nome_social || driver.nome_completo || 'Motorista SR'
          : 'Motorista Parceiro';
        const driverVehicle = driver
          ? `${driver.marca_veiculo || ''} ${driver.modelo_veiculo || ''} (${driver.placa_veiculo || 'SR'})`.trim()
          : undefined;

        return {
          id: t.id,
          pickup: t.pickup_address || `${t.pickup_lat}, ${t.pickup_lng}`,
          dropoff: t.dropoff_address || `${t.dropoff_lat}, ${t.dropoff_lng}`,
          fare: Number(t.fare_amount) || 0,
          status: String(t.status || 'COMPLETED').toUpperCase(),
          created_at: t.created_at || new Date().toISOString(),
          driver_name: driverName,
          driver_vehicle: driverVehicle,
          driver_avatar: driver?.avatar_url,
          category: 'SR Logística'
        };
      });

      // Também recupera histórico do localStorage caso o Supabase não retorne nada ou esteja offline
      if (mapped.length === 0 && typeof window !== 'undefined') {
        try {
          const localHistory = JSON.parse(localStorage.getItem('sr_passenger_ride_history') || '[]');
          if (Array.isArray(localHistory) && localHistory.length > 0) {
            setRides(localHistory);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      setRides(mapped);
    } catch (err) {
      console.warn('Erro ao carregar histórico de corridas:', err);
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  const handleCancelScheduled = async (tripId: string) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      setCancellingId(tripId);
      await cancelScheduledTrip(tripId);
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'COMPLETED':
      case 'FINISHED':
      case 'FINALIZADA':
      case 'FINALIZADO':
      case 'CONCLUIDA':
      case 'CONCLUIDO':
      case 'PAID':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold">Finalizada</Badge>;
      case 'CANCELLED':
      case 'CANCELED':
      case 'CANCELADA':
      case 'CANCELADO':
      case 'REJECTED':
      case 'REJEITADA':
      case 'RECUSADA':
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-bold">Cancelada</Badge>;
      case 'SCHEDULED':
      case 'AGENDADA':
      case 'AGENDADO':
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold">Agendada</Badge>;
      case 'IN_PROGRESS':
      case 'EM_ANDAMENTO':
      case 'EM_VIAGEM':
      case 'INICIADA':
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 font-bold animate-pulse">Em Viagem</Badge>;
      case 'DRIVER_ASSIGNED':
      case 'DRIVER_ARRIVING':
      case 'A_CAMINHO':
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-brand border-amber-500/40 font-bold">A Caminho</Badge>;
      case 'DRIVER_ARRIVED':
      case 'CHEGOU':
      case 'NO_LOCAL':
        return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold">No Local</Badge>;
      default:
        return <Badge className="bg-brand/20 text-brand-800 dark:text-brand border-brand/40 font-bold">Em Andamento</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-dvh p-5 space-y-5 pb-24">
      {/* Topo */}
      <div className="pt-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <Clock size={14} /> Minhas Viagens
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Gerenciar Viagens</h1>
          <p className="text-xs text-slate-400">Consulte recibos ou acompanhe suas corridas agendadas</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRides()}
            className="p-2 rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 hover:border-brand/40 shadow-sm transition active:scale-95"
            title="Atualizar lista"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsSupportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand/40 shadow-sm transition"
          >
            <HelpCircle size={15} className="text-blue-500" />
            <span>Ajuda</span>
          </button>
        </div>
      </div>

      {/* Tabs de Filtro: Histórico vs Agendadas */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-dark-800/90 p-1 border border-slate-200/80 dark:border-dark-700/80">
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'HISTORY'
              ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock size={15} />
          <span>Histórico</span>
          {rides.length > 0 && (
            <span className="rounded-full px-1.5 py-0.2 text-[10px] font-black bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300">
              {rides.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SCHEDULED')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'SCHEDULED'
              ? 'bg-brand text-dark-950 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Agendadas</span>
          {scheduledTrips.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === 'SCHEDULED'
                  ? 'bg-dark-950 text-brand'
                  : 'bg-brand/20 text-brand-800 dark:text-brand'
              }`}
            >
              {scheduledTrips.length}
            </span>
          )}
        </button>
      </div>

      {/* ABA: HISTÓRICO */}
      {activeTab === 'HISTORY' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-brand border-t-transparent animate-spin mb-2" />
              <span className="text-xs text-slate-400">Carregando viagens...</span>
            </div>
          ) : rides.length === 0 ? (
            <EmptyState
              icon={<Car size={40} />}
              title="Nenhuma viagem encontrada"
              description="Suas viagens concluídas e canceladas aparecerão aqui automaticamente."
            />
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <Link
                  key={ride.id}
                  href={`/corridas/${ride.id}`}
                  className="block rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm transition hover:border-brand/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-700/60">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">
                        {formatDateTime(ride.created_at)}
                      </span>
                      <span className="text-xs text-slate-300 dark:text-dark-600">•</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ride.category || 'SR Logística'}</span>
                    </div>
                    {getStatusBadge(ride.status)}
                  </div>

                  {/* Endereços */}
                  <div className="my-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{ride.pickup}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{ride.dropoff}</p>
                    </div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-dark-700/60 text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[65%]">
                      {ride.driver_avatar ? (
                        <img src={ride.driver_avatar} alt="Driver" className="h-5 w-5 rounded-full object-cover border border-brand shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-dark-900 border border-brand flex items-center justify-center text-[10px] text-brand font-black shrink-0">
                          {ride.driver_name?.charAt(0) || 'M'}
                        </div>
                      )}
                      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                        {ride.driver_name} {ride.driver_vehicle ? `· ${ride.driver_vehicle}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-black text-slate-900 dark:text-brand text-sm shrink-0">
                      <span>{formatCurrency(ride.fare)}</span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ABA: AGENDADAS */}
      {activeTab === 'SCHEDULED' && (
        <div className="space-y-3">
          {scheduledTrips.length === 0 ? (
            <EmptyState
              icon={<Calendar size={40} />}
              title="Nenhuma corrida agendada"
              description="Você pode agendar suas viagens corporativas com antecedência para garantir seu veículo no horário desejado."
            />
          ) : (
            scheduledTrips.map((trip) => (
              <div
                key={trip.id}
                className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-white dark:via-dark-800 to-amber-500/10 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <CalendarCheck size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-brand block">
                        Viagem Agendada
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {trip.scheduledFor ? formatDateTime(trip.scheduledFor) : 'Data programada'}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">
                    Confirmada
                  </Badge>
                </div>

                {/* Trajeto */}
                <div className="my-3 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-semibold">Embarque</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {trip.origin?.address || `${trip.origin?.latitude}, ${trip.origin?.longitude}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand mt-1 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-semibold">Destino</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {trip.destination?.address || `${trip.destination?.latitude}, ${trip.destination?.longitude}`}
                      </p>
                    </div>
                  </div>
                </div>

                {trip.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-dark-900/60 text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-3">
                    📝 Obs: {trip.notes}
                  </div>
                )}

                {/* Ações do Agendamento */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold">Valor Estimado</span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      {formatCurrency(trip.estimatedFare)}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelScheduled(trip.id)}
                    disabled={cancellingId === trip.id}
                    className="text-red-600 border-red-200 dark:border-red-900/40 hover:bg-red-500/10 rounded-xl font-bold gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>{cancellingId === trip.id ? 'Cancelando...' : 'Cancelar Agendamento'}</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Suporte */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  );
}
