'use client';

import { useState, useEffect } from 'react';
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
import type { PassengerTrip } from '@/features/trips/domain/passenger-trip.types';

interface HistoricalRide {
  id: string;
  pickup: string;
  dropoff: string;
  fare: number;
  status: string;
  created_at: string;
  driver_name?: string;
  category?: string;
}

const SEED_RIDES: HistoricalRide[] = [
  {
    id: 'ride-101',
    pickup: 'Av. Mário Ypiranga, 1300 - Adrianópolis',
    dropoff: 'Av. Djalma Batista, 482 - Parque 10',
    fare: 18.50,
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    driver_name: 'Carlos Eduardo da Silva',
    category: 'SR Pop'
  },
  {
    id: 'ride-102',
    pickup: 'Rua Salvador, 450 - Adrianópolis',
    dropoff: 'Av. Santos Dumont, 1350 - Aeroporto',
    fare: 45.00,
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    driver_name: 'Marcos Vinicius Ferreira',
    category: 'SR Confort'
  },
  {
    id: 'ride-103',
    pickup: 'Praça São Sebastião - Centro',
    dropoff: 'Av. Coronel Teixeira - Ponta Negra',
    fare: 32.00,
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    driver_name: 'Lucas Gabriel Albuquerque',
    category: 'SR Pop'
  }
];

export default function CorridasPage() {
  const { user } = useAuth();
  const { scheduledTrips, cancelScheduledTrip, loadScheduledTrips } = usePassengerTripStore();
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'SCHEDULED'>('HISTORY');
  const [rides, setRides] = useState<HistoricalRide[]>(SEED_RIDES);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    loadScheduledTrips(user?.id);
  }, [user, loadScheduledTrips]);

  useEffect(() => {
    async function loadRides() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('passenger_id', user.id)
            .neq('status', 'SCHEDULED')
            .order('created_at', { ascending: false });

          if (data && data.length > 0) {
            const mapped: HistoricalRide[] = data.map((t: any) => ({
              id: t.id,
              pickup: t.pickup || `${t.origin_lat}, ${t.origin_lng}`,
              dropoff: t.dropoff || `${t.destination_lat}, ${t.destination_lng}`,
              fare: t.fare || t.estimated_price || 20.0,
              status: t.status,
              created_at: t.created_at,
              driver_name: t.driver_name || 'Motorista SR',
              category: t.category || 'SR Pop'
            }));
            setRides(mapped);
          } else {
            setRides(SEED_RIDES);
          }
        }
      } catch {
        setRides(SEED_RIDES);
      } finally {
        setLoading(false);
      }
    }

    loadRides();
  }, [user]);

  const handleCancelScheduled = async (tripId: string) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      setCancellingId(tripId);
      await cancelScheduledTrip(tripId);
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'FINISHED':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Finalizada</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">Cancelada</Badge>;
      case 'SCHEDULED':
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40">Agendada</Badge>;
      default:
        return <Badge className="bg-brand/20 text-brand-800 dark:text-brand border-brand/40">Em Andamento</Badge>;
    }
  };

  const getCategoryTitle = (category?: string) => {
    if (category === 'CONFORT') return 'SR Confort';
    if (category === 'MOTO') return 'SR Moto';
    if (category === 'ENTREGA') return 'SR Entrega';
    return 'SR Pop';
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

        <button
          onClick={() => setIsSupportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand/40 shadow-sm transition"
        >
          <HelpCircle size={15} className="text-blue-500" />
          <span>Ajuda</span>
        </button>
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
              title="Nenhuma viagem realizada"
              description="Solicite sua primeira corrida e ela aparecerá aqui no seu histórico."
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
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ride.category || 'SR Pop'}</span>
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
                    <span className="text-slate-400 font-medium">{ride.driver_name || 'Motorista Parceiro'}</span>
                    <div className="flex items-center gap-1 font-black text-slate-900 dark:text-brand text-sm">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {scheduledTrips.length} {scheduledTrips.length === 1 ? 'Agendamento ativo' : 'Agendamentos ativos'}
            </span>
            <Link href="/mapa?mode=schedule">
              <Button variant="primary" size="sm" className="gap-1 text-xs">
                <Plus size={14} /> Novo Agendamento
              </Button>
            </Link>
          </div>

          {scheduledTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-3xl border border-dashed border-slate-300 dark:border-dark-700 p-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-3">
                <CalendarCheck size={26} />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Nenhuma corrida agendada
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                Programe suas viagens para o aeroporto, compromissos ou saídas de rotina com antecedência.
              </p>
              <Link href="/mapa?mode=schedule">
                <Button variant="primary" size="md">
                  <Calendar size={16} />
                  Solicitar Corrida Agendada
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-3xl border border-amber-500/30 bg-white dark:bg-dark-800 p-4 shadow-md space-y-3"
                >
                  {/* Topo do Card Agendado */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-dark-700/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Horário Marcado</span>
                        <span className="text-xs font-black text-slate-900 dark:text-brand">
                          {trip.scheduledFor ? formatDateTime(trip.scheduledFor) : 'Data agendada'}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge('SCHEDULED')}
                  </div>

                  {/* Endereços */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">Embarque</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {trip.origin.address || `${trip.origin.latitude}, ${trip.origin.longitude}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">Destino</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {trip.destination.address || `${trip.destination.latitude}, ${trip.destination.longitude}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Observações (se houver) */}
                  {trip.scheduledNotes && (
                    <div className="rounded-xl bg-slate-50 dark:bg-dark-900/60 p-2.5 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-dark-750">
                      <span className="font-bold">Observações: </span>
                      <span>{trip.scheduledNotes}</span>
                    </div>
                  )}

                  {/* Rodapé e Ação de Cancelamento */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-dark-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {getCategoryTitle(trip.category)} • {trip.paymentMethod === 'VOUCHER' ? '🏢 Voucher Quinzenal' : 'PIX'}
                      </span>
                      <span className="font-black text-slate-900 dark:text-brand text-sm">
                        {formatCurrency(trip.estimatedFare)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancellingId === trip.id}
                      onClick={() => handleCancelScheduled(trip.id)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/20 text-xs gap-1"
                    >
                      <Trash2 size={13} />
                      {cancellingId === trip.id ? 'Cancelando...' : 'Cancelar Agendamento'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Apoio e Suporte */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </div>
  );
}
