'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  HelpCircle,
  FileText,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Building2,
  Printer,
  ChevronDown
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
  distance_km: number;
  status: string;
  created_at: string;
  driver_name?: string;
  driver_vehicle?: string;
  driver_avatar?: string;
  category?: string;
  payment_method?: string;
}

type PeriodFilter = 'ALL' | 'Q1' | 'Q2' | 'CURRENT_MONTH' | 'LAST_MONTH' | 'CUSTOM';
type StatusFilter = 'ALL' | 'COMPLETED' | 'CANCELLED';

export default function CorridasPage() {
  const { user, profile } = useAuth();
  const { scheduledTrips, cancelScheduledTrip, loadScheduledTrips } = usePassengerTripStore();
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'REPORT' | 'SCHEDULED'>('HISTORY');
  const [rides, setRides] = useState<HistoricalRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Filtros do Relatório
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('CURRENT_MONTH');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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
          .select('id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fare_amount, distance_km, status, created_at, driver_id, passenger_id, payment_method, category')
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
                .select('id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, fare_amount, distance_km, status, created_at, driver_id, passenger_id, payment_method, category')
                .in('id', savedLocalIds)
                .order('created_at', { ascending: false });

              if (localRides && localRides.length > 0) {
                rawRides = localRides;
              }
            }
          } catch (_) {}
        }
      }

      // 2. Busca dados complementares dos motoristas associados
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
          distance_km: Number(t.distance_km) || 0,
          status: String(t.status || 'COMPLETED').toUpperCase(),
          created_at: t.created_at || new Date().toISOString(),
          driver_name: driverName,
          driver_vehicle: driverVehicle,
          driver_avatar: driver?.avatar_url,
          category: t.category || 'SR Logística',
          payment_method: t.payment_method || 'PIX'
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

  // Filtragem Dinâmica por Período e Status
  const filteredRides = useMemo(() => {
    return rides.filter((ride) => {
      // 1. Filtro de Status
      const isCompleted = ['COMPLETED', 'FINISHED', 'FINALIZADA', 'CONCLUIDA', 'PAID'].includes(ride.status);
      const isCancelled = ['CANCELLED', 'CANCELED', 'CANCELADA', 'REJECTED', 'REJEITADA'].includes(ride.status);

      if (statusFilter === 'COMPLETED' && !isCompleted) return false;
      if (statusFilter === 'CANCELLED' && !isCancelled) return false;

      // 2. Filtro de Período
      if (periodFilter === 'ALL') return true;

      const rideDate = new Date(ride.created_at);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      if (periodFilter === 'CURRENT_MONTH') {
        return rideDate.getFullYear() === currentYear && rideDate.getMonth() === currentMonth;
      }

      if (periodFilter === 'LAST_MONTH') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          rideDate.getFullYear() === lastMonthDate.getFullYear() &&
          rideDate.getMonth() === lastMonthDate.getMonth()
        );
      }

      if (periodFilter === 'Q1') {
        // 1ª Quinzena: Dia 1 ao dia 15 do mês atual
        return (
          rideDate.getFullYear() === currentYear &&
          rideDate.getMonth() === currentMonth &&
          rideDate.getDate() >= 1 &&
          rideDate.getDate() <= 15
        );
      }

      if (periodFilter === 'Q2') {
        // 2ª Quinzena: Dia 16 até o final do mês atual
        return (
          rideDate.getFullYear() === currentYear &&
          rideDate.getMonth() === currentMonth &&
          rideDate.getDate() >= 16
        );
      }

      if (periodFilter === 'CUSTOM') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(0);
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date(8640000000000000);
        return rideDate >= start && rideDate <= end;
      }

      return true;
    });
  }, [rides, periodFilter, statusFilter, customStartDate, customEndDate]);

  // Cálculos Consolidados
  const summary = useMemo(() => {
    const completed = filteredRides.filter((r) =>
      ['COMPLETED', 'FINISHED', 'FINALIZADA', 'CONCLUIDA', 'PAID'].includes(r.status)
    );
    const cancelled = filteredRides.filter((r) =>
      ['CANCELLED', 'CANCELED', 'CANCELADA', 'REJECTED'].includes(r.status)
    );

    const totalFare = completed.reduce((acc, r) => acc + r.fare, 0);
    const totalKm = filteredRides.reduce((acc, r) => acc + (r.distance_km || 0), 0);
    const avgFare = completed.length > 0 ? totalFare / completed.length : 0;

    return {
      totalRides: filteredRides.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      totalFare,
      totalKm,
      avgFare
    };
  }, [filteredRides]);

  // Rótulo do Período Selecionado
  const getPeriodLabel = () => {
    const now = new Date();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const curMonth = monthNames[now.getMonth()];
    const curYear = now.getFullYear();

    switch (periodFilter) {
      case 'Q1':
        return `1ª Quinzena de ${curMonth}/${curYear} (01 a 15)`;
      case 'Q2':
        return `2ª Quinzena de ${curMonth}/${curYear} (16 ao fim)`;
      case 'CURRENT_MONTH':
        return `Mês de ${curMonth}/${curYear}`;
      case 'LAST_MONTH': {
        const lastM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastY = now.getMonth() === 0 ? curYear - 1 : curYear;
        return `Mês de ${monthNames[lastM]}/${lastY}`;
      }
      case 'CUSTOM':
        return customStartDate && customEndDate
          ? `De ${customStartDate.split('-').reverse().join('/')} até ${customEndDate.split('-').reverse().join('/')}`
          : 'Período Personalizado';
      default:
        return 'Histórico Completo (Todas as Viagens)';
    }
  };

  // Exportar Relatório em PDF / Imprimir Extrato
  const handleExportPDF = () => {
    if (typeof window === 'undefined') return;

    const passengerName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Passageiro';
    const passengerEmail = profile?.email || user?.email || 'N/A';
    const passengerPhone = profile?.phone || user?.user_metadata?.phone || '';
    const passengerCompany = profile?.corporate_company || (profile as any)?.company || 'Passageiro Individual / Voucher';
    const periodLabel = getPeriodLabel();
    const emissionDate = formatDateTime(new Date().toISOString());

    const rowsHtml = filteredRides.map((ride, idx) => {
      const isComp = ['COMPLETED', 'FINISHED', 'FINALIZADA', 'CONCLUIDA', 'PAID'].includes(ride.status);
      const isCanc = ['CANCELLED', 'CANCELED', 'CANCELADA', 'REJECTED'].includes(ride.status);
      const statusLabel = isComp ? 'Finalizada' : isCanc ? 'Cancelada' : 'Em Andamento';
      const statusColor = isComp ? '#10b981' : isCanc ? '#ef4444' : '#f59e0b';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 6px; text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 6px; white-space: nowrap; color: #334155;">${formatDateTime(ride.created_at)}</td>
          <td style="padding: 8px 6px; color: #1e293b; max-width: 170px;">${ride.pickup}</td>
          <td style="padding: 8px 6px; color: #1e293b; max-width: 170px;">${ride.dropoff}</td>
          <td style="padding: 8px 6px; color: #334155;">${ride.driver_name || 'Motorista SR'}</td>
          <td style="padding: 8px 6px; text-align: center; color: #475569;">${ride.distance_km ? `${ride.distance_km.toFixed(1)} km` : '-'}</td>
          <td style="padding: 8px 6px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}30;">
              ${statusLabel}
            </span>
          </td>
          <td style="padding: 8px 6px; text-align: right; font-weight: bold; color: #0f172a;">${formatCurrency(ride.fare)}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no navegador para gerar o relatório em PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Viagens - ${passengerName}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .brand-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .brand-subtitle { font-size: 11px; color: #64748b; font-weight: 600; }
          .doc-badge { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 8px; text-align: right; }
          .card-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11.5px; }
          .card-info-item span:first-child { font-weight: 700; color: #475569; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
          .summary-box .val { font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px; }
          .summary-box .lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .summary-box.highlight { background: #0f172a; color: #fff; border-color: #0f172a; }
          .summary-box.highlight .val { color: #38bdf8; }
          .summary-box.highlight .lbl { color: #94a3b8; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          th { background: #f1f5f9; color: #334155; font-size: 10.5px; font-weight: 800; text-transform: uppercase; padding: 8px 6px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          .signatures { margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 11px; color: #475569; }
          .sig-line { border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: 600; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-title">SR Logística & Transporte</div>
            <div class="brand-subtitle">Relatório Oficial de Corridas e Extrato de Faturamento</div>
          </div>
          <div class="doc-badge">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Período do Relatório</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${periodLabel}</div>
            <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">Emissão: ${emissionDate}</div>
          </div>
        </div>

        <div class="card-info">
          <div class="card-info-item"><span>Passageiro:</span> ${passengerName}</div>
          <div class="card-info-item"><span>E-mail:</span> ${passengerEmail}</div>
          <div class="card-info-item"><span>Telefone:</span> ${passengerPhone}</div>
          <div class="card-info-item"><span>Empresa / Convênio:</span> ${passengerCompany}</div>
        </div>

        <div class="summary-grid">
          <div class="summary-box">
            <div class="lbl">Total de Viagens</div>
            <div class="val">${summary.totalRides}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">Finalizadas</div>
            <div class="val" style="color: #10b981;">${summary.completedCount}</div>
          </div>
          <div class="summary-box">
            <div class="lbl">Quilometragem</div>
            <div class="val">${summary.totalKm.toFixed(1)} km</div>
          </div>
          <div class="summary-box highlight">
            <div class="lbl">Total Faturado / Gasto</div>
            <div class="val">${formatCurrency(summary.totalFare)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 25px;">#</th>
              <th>Data / Hora</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Motorista</th>
              <th style="text-align: center;">Km</th>
              <th style="text-align: center;">Status</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 20px; color: #64748b;">Nenhuma corrida encontrada no período selecionado.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-line">Assinatura do Passageiro / Solicitante</div>
          </div>
          <div>
            <div class="sig-line">Aprovação Financeira / Gestor de Frotas</div>
          </div>
        </div>

        <div class="footer">
          SR Logística Executiva • Manaus - AM • Plataforma de Gestão de Corridas Corporativas
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Exportar Planilha Excel (.CSV)
  const handleExportCSV = () => {
    if (filteredRides.length === 0) {
      alert('Não há viagens para exportar no período selecionado.');
      return;
    }

    const headers = [
      'ID',
      'Data e Hora',
      'Origem',
      'Destino',
      'Motorista',
      'Veiculo',
      'Distancia_KM',
      'Status',
      'Forma_Pagamento',
      'Valor_R$'
    ];

    const rows = filteredRides.map((r, idx) => [
      `"${r.id}"`,
      `"${formatDateTime(r.created_at)}"`,
      `"${(r.pickup || '').replace(/"/g, '""')}"`,
      `"${(r.dropoff || '').replace(/"/g, '""')}"`,
      `"${(r.driver_name || 'Motorista SR').replace(/"/g, '""')}"`,
      `"${(r.driver_vehicle || '').replace(/"/g, '""')}"`,
      `"${r.distance_km || 0}"`,
      `"${r.status}"`,
      `"${r.payment_method || 'PIX'}"`,
      `"${r.fare.toFixed(2).replace('.', ',')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_corridas_sr_${periodFilter.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="flex flex-col min-h-dvh p-4 sm:p-6 space-y-4 max-w-4xl mx-auto pb-28">
      {/* Topo / Cabeçalho */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <Clock size={14} className="text-brand" /> Gestão de Viagens
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Minhas Viagens & Extratos</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe recibos, emita relatórios quinzenais/mensais e gerencie agendamentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRides()}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-slate-700 dark:text-slate-200 hover:border-brand/40 shadow-sm transition active:scale-95"
            title="Atualizar lista"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsSupportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand/40 shadow-sm transition"
          >
            <HelpCircle size={16} className="text-blue-500" />
            <span>Ajuda</span>
          </button>
        </div>
      </div>

      {/* Tabs Principais da Página */}
      <div className="flex rounded-2xl bg-slate-200/70 dark:bg-dark-800/90 p-1 border border-slate-200/80 dark:border-dark-700/80">
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'HISTORY'
              ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock size={15} />
          <span>Histórico de Corridas</span>
          {rides.length > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300">
              {rides.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('REPORT')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'REPORT'
              ? 'bg-brand text-dark-950 shadow-sm font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={15} />
          <span>Relatório & Extrato</span>
        </button>

        <button
          onClick={() => setActiveTab('SCHEDULED')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'SCHEDULED'
              ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar size={15} />
          <span>Agendadas</span>
          {scheduledTrips.length > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-brand/20 text-brand-800 dark:text-brand">
              {scheduledTrips.length}
            </span>
          )}
        </button>
      </div>

      {/* ABA 1: HISTÓRICO DE CORRIDAS */}
      {activeTab === 'HISTORY' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-9 w-9 rounded-full border-4 border-brand border-t-transparent animate-spin mb-2" />
              <span className="text-xs text-slate-400">Carregando histórico de viagens...</span>
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
                        <img src={ride.driver_avatar} alt="Driver" className="h-6 w-6 rounded-full object-cover border border-brand shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-dark-900 border border-brand flex items-center justify-center text-[10px] text-brand font-black shrink-0">
                          {ride.driver_name?.charAt(0) || 'M'}
                        </div>
                      )}
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
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

      {/* ABA 2: RELATÓRIOS, EXTRATOS & EXPORTAÇÃO QUINZENAL / MENSAL */}
      {activeTab === 'REPORT' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Card de Filtros de Período & Status */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-dark-700/60">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-brand" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Filtro por Período de Faturamento
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-brand">
                {getPeriodLabel()}
              </span>
            </div>

            {/* Botões Rápidos de Período (Quinzenal / Mensal) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <button
                onClick={() => setPeriodFilter('Q1')}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition border ${
                  periodFilter === 'Q1'
                    ? 'bg-brand text-dark-950 border-brand shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand/40'
                }`}
              >
                1ª Quinzena (1-15)
              </button>

              <button
                onClick={() => setPeriodFilter('Q2')}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition border ${
                  periodFilter === 'Q2'
                    ? 'bg-brand text-dark-950 border-brand shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand/40'
                }`}
              >
                2ª Quinzena (16-Fim)
              </button>

              <button
                onClick={() => setPeriodFilter('CURRENT_MONTH')}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition border ${
                  periodFilter === 'CURRENT_MONTH'
                    ? 'bg-brand text-dark-950 border-brand shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand/40'
                }`}
              >
                Este Mês
              </button>

              <button
                onClick={() => setPeriodFilter('LAST_MONTH')}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition border ${
                  periodFilter === 'LAST_MONTH'
                    ? 'bg-brand text-dark-950 border-brand shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand/40'
                }`}
              >
                Mês Anterior
              </button>

              <button
                onClick={() => setPeriodFilter('ALL')}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition border ${
                  periodFilter === 'ALL'
                    ? 'bg-brand text-dark-950 border-brand shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand/40'
                }`}
              >
                Todas
              </button>

              <button
                onClick={() => setPeriodFilter('CUSTOM')}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition border ${
                  periodFilter === 'CUSTOM'
                    ? 'bg-brand text-dark-950 border-brand shadow-sm font-black'
                    : 'bg-slate-50 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand/40'
                }`}
              >
                Personalizado
              </button>
            </div>

            {/* Seletor de Datas Personalizadas */}
            {periodFilter === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-dark-700 animate-in fade-in">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data Início</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-white dark:bg-dark-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Filtro de Status das Corridas */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                    statusFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Finalizadas
                </button>
                <button
                  onClick={() => setStatusFilter('CANCELLED')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                    statusFilter === 'CANCELLED'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-dark-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Canceladas
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Métricas e Totais Consolidados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Gasto */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Total Faturado</span>
                <DollarSign size={16} className="text-emerald-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {formatCurrency(summary.totalFare)}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">
                {summary.completedCount} corridas finalizadas
              </span>
            </div>

            {/* Total de Viagens */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Viagens Totais</span>
                <Car size={16} className="text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {summary.totalRides}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {summary.cancelledCount} cancelamentos
              </span>
            </div>

            {/* Distância */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Quilometragem</span>
                <Navigation size={16} className="text-brand" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {summary.totalKm.toFixed(1)} <span className="text-xs font-bold text-slate-400">km</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Trajeto percorrido
              </span>
            </div>

            {/* Ticket Médio */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider">Ticket Médio</span>
                <TrendingUp size={16} className="text-purple-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {formatCurrency(summary.avgFare)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Média por corrida
              </span>
            </div>
          </div>

          {/* Botões de Ação de Exportação (PDF / CSV) */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={handleExportPDF}
              className="w-full sm:flex-1 bg-slate-900 hover:bg-black dark:bg-brand dark:hover:bg-brand-600 dark:text-dark-950 text-white font-black py-3 rounded-2xl gap-2 shadow-lg hover:scale-[1.01] active:scale-95 transition"
            >
              <Printer size={18} />
              <span>Gerar Relatório em PDF / Imprimir</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="w-full sm:flex-1 border-slate-300 dark:border-dark-700 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-800 dark:text-slate-100 font-bold py-3 rounded-2xl gap-2 shadow-sm hover:scale-[1.01] active:scale-95 transition"
            >
              <Download size={18} className="text-emerald-500" />
              <span>Baixar Planilha Excel (.CSV)</span>
            </Button>
          </div>

          {/* Tabela de Extrato de Corridas do Período */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-dark-700/80 bg-white dark:bg-dark-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-dark-700/60 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Detalhamento das Corridas ({filteredRides.length})
              </h4>
              <span className="text-[11px] font-bold text-slate-400">
                {getPeriodLabel()}
              </span>
            </div>

            {filteredRides.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhuma corrida encontrada para o período selecionado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-dark-700/60">
                {filteredRides.map((ride) => (
                  <div key={ride.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-dark-750 transition">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{formatDateTime(ride.created_at)}</span>
                        {getStatusBadge(ride.status)}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        🟢 {ride.pickup}
                      </p>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                        🔴 {ride.dropoff}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Motorista: <strong className="text-slate-700 dark:text-slate-300">{ride.driver_name}</strong></span>
                        {ride.distance_km > 0 && <span>• {ride.distance_km.toFixed(1)} km</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-slate-900 dark:text-brand">
                        {formatCurrency(ride.fare)}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {ride.payment_method || 'PIX'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: AGENDADAS */}
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
