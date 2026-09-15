'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Navigation, Star, ShieldCheck, Car, Calendar, Receipt, DollarSign } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function CorridaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rideData, setRideData] = useState<any>(null);

  useEffect(() => {
    const fetchRideDetails = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        // Tenta buscar da tabela rides
        const { data: ride } = await supabase
          .from('rides')
          .select('*')
          .eq('id', resolvedParams.id)
          .maybeSingle();

        if (ride) {
          let driverInfo = null;
          if (ride.driver_id) {
            const { data: drv } = await supabase
              .from('motoristas')
              .select('*')
              .eq('id', ride.driver_id)
              .maybeSingle();
            driverInfo = drv;
          }

          setRideData({
            id: ride.id,
            date: ride.created_at || new Date().toISOString(),
            pickup: ride.pickup_address || 'Ponto de Embarque',
            dropoff: ride.dropoff_address || 'Ponto de Desembarque',
            distance: `${ride.distance_km || 4.5} km`,
            duration: `${Math.round((ride.distance_km || 4.5) * 3)} min`,
            category: 'SR Pop',
            driver: driverInfo ? {
              name: driverInfo.nome || driverInfo.nome_social || 'Motorista SR',
              vehicle: `${driverInfo.marca_veiculo || ''} ${driverInfo.modelo_veiculo || ''} · ${driverInfo.cor_veiculo || ''} (${driverInfo.placa_veiculo || ''})`,
              avatar: driverInfo.avatar_url,
              rating: driverInfo.rating || 4.95
            } : null,
            payment: {
              method: 'PIX',
              base: 5.50,
              km: (ride.fare_amount || 20) * 0.6,
              time: (ride.fare_amount || 20) * 0.4 - 5.50,
              discount: 0.00,
              total: ride.fare_amount || 20.00
            }
          });
          return;
        }

        // Se não achou no banco, tenta buscar no histórico local
        if (typeof window !== 'undefined') {
          try {
            const localHistory = JSON.parse(localStorage.getItem('sr_passenger_ride_history') || '[]');
            const found = localHistory.find((h: any) => h.id === resolvedParams.id);
            if (found) {
              setRideData({
                id: found.id,
                date: found.created_at || new Date().toISOString(),
                pickup: found.pickup,
                dropoff: found.dropoff,
                distance: '4.5 km',
                duration: '12 min',
                category: found.category || 'SR Pop',
                driver: found.driver_name ? {
                  name: found.driver_name,
                  vehicle: found.driver_vehicle || 'Veículo Padrão SR',
                  avatar: found.driver_avatar,
                  rating: 4.95
                } : null,
                payment: {
                  method: 'PIX',
                  base: 5.50,
                  km: found.fare * 0.6,
                  time: found.fare * 0.4 - 5.50,
                  discount: 0.00,
                  total: found.fare
                }
              });
            }
          } catch (_) {}
        }
      } catch (e) {
        console.warn('Erro ao carregar detalhes da corrida:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchRideDetails();
  }, [resolvedParams.id]);

  const ride = rideData || {
    id: resolvedParams.id,
    date: new Date().toISOString(),
    pickup: 'Ponto de Embarque Manaus',
    dropoff: 'Destino Manaus',
    distance: '4.8 km',
    duration: '14 min',
    category: 'SR Pop',
    driver: null,
    payment: {
      method: 'PIX',
      base: 5.50,
      km: 10.08,
      time: 4.90,
      discount: 0.00,
      total: 20.48
    }
  };

  return (
    <div className="flex flex-col min-h-dvh p-5 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Link
          href="/corridas"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-700 dark:text-slate-200"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detalhe da Viagem</span>
          <h1 className="text-base font-black text-slate-900 dark:text-white">Recibo #{ride.id.slice(-6)}</h1>
        </div>
      </div>

      {/* Card do Motorista Real se atribuído */}
      {ride.driver && (
        <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ride.driver.avatar ? (
              <img
                src={ride.driver.avatar}
                alt={ride.driver.name}
                className="h-12 w-12 rounded-2xl object-cover border border-brand"
              />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-dark-700 border border-brand flex items-center justify-center text-brand font-black">
                {ride.driver.name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{ride.driver.name}</h3>
              <p className="text-xs text-slate-400">{ride.driver.vehicle}</p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-brand mt-0.5">
                <Star size={12} fill="#FFC800" /> {ride.driver.rating}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rota */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm space-y-3 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Itinerário</span>
        <div className="flex items-start gap-2.5">
          <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Ponto de Embarque</span>
            <p className="font-bold text-slate-800 dark:text-slate-200">{ride.pickup}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Navigation size={16} className="text-brand shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block">Ponto de Desembarque</span>
            <p className="font-bold text-slate-800 dark:text-slate-200">{ride.dropoff}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-dark-700 text-slate-400 font-medium">
          <span>Distância: {ride.distance}</span>
          <span>Duração: {ride.duration}</span>
        </div>
      </div>

      {/* Detalhamento Financeiro / Recibo */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm space-y-2.5 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Detalhamento do Preço</span>
        
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Tarifa Base</span>
          <span>{formatCurrency(ride.payment.base)}</span>
        </div>

        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Distância ({ride.distance})</span>
          <span>{formatCurrency(ride.payment.km)}</span>
        </div>

        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>Tempo no trânsito ({ride.duration})</span>
          <span>{formatCurrency(ride.payment.time)}</span>
        </div>

        <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-dark-700 text-sm font-black text-slate-900 dark:text-white">
          <span>Total Pago ({ride.payment.method})</span>
          <span className="text-brand-700 dark:text-brand">{formatCurrency(ride.payment.total)}</span>
        </div>
      </div>

      {/* Ação: Solicitar Novamente */}
      <Link href="/mapa" className="w-full block">
        <Button variant="primary" size="lg" full>
          Solicitar Nova Viagem
        </Button>
      </Link>
    </div>
  );
}
