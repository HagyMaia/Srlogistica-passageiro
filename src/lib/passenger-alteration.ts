import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AlterationRequest } from '@/types';

const ALTERATION_STORAGE_PREFIX = 'sr_passenger_pending_alt_';
const ALTERATION_STATUS_PREFIX = 'sr_passenger_alt_status_';

export interface PassengerPersonalData {
  name: string;
  phone: string;
  cpf?: string;
  pickup_address?: string;
  justificativa?: string;
}

export interface PassengerCompanyData {
  company: string;
  department?: string;
  employee_registration?: string;
  shift?: string;
  justificativa?: string;
}

/**
 * Envia uma solicitação de alteração cadastral para a moderação administrativa.
 * Os dados oficiais permanecem inalterados até a aprovação pelo painel administrativo.
 */
export async function submitPassengerAlteration(params: {
  userId: string;
  userName: string;
  tipoAlteracao: 'dados_cadastrais' | 'empresa' | 'dados_pessoais';
  dadosAnteriores: Record<string, any>;
  dadosNovos: Record<string, any>;
  justificativa?: string;
}): Promise<AlterationRequest> {
  const { userId, userName, tipoAlteracao, dadosAnteriores, dadosNovos, justificativa } = params;

  const newRequest: AlterationRequest = {
    id: `solic-pass-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tipo_usuario: 'passageiro',
    usuario_id: userId,
    usuario_nome: userName || 'Passageiro',
    tipo_alteracao: tipoAlteracao,
    dados_anteriores: dadosAnteriores,
    dados_novos: dadosNovos,
    justificativa: justificativa || 'Atualização cadastral solicitada via aplicativo do passageiro.',
    status: 'Pendente',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Persiste no LocalStorage para resposta imediata e suporte offline
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        `${ALTERATION_STORAGE_PREFIX}${userId}`,
        JSON.stringify(newRequest)
      );
      window.localStorage.setItem(
        `${ALTERATION_STATUS_PREFIX}${userId}`,
        'Aguardando aprovação'
      );
      window.dispatchEvent(
        new CustomEvent('sr_passenger_alteration_updated', { detail: newRequest })
      );
    } catch (_) {}
  }

  // 2. Persiste no Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_alteracao')
        .insert([{
          tipo_usuario: 'passageiro',
          usuario_id: userId,
          usuario_nome: userName,
          tipo_alteracao: tipoAlteracao,
          dados_anteriores: dadosAnteriores,
          dados_novos: dadosNovos,
          justificativa: justificativa || 'Atualização de cadastro via aplicativo',
          status: 'Pendente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .maybeSingle();

      if (!error && data) {
        newRequest.id = data.id;
      }

      // Marca flag de solicitação pendente nas tabelas de passageiro
      try {
        await supabase
          .from('passageiros')
          .update({ solicitacao_pendente: true, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (_) {}

      try {
        await supabase
          .from('profiles')
          .update({ solicitacao_pendente: true, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (_) {}
    } catch (err: any) {
      console.warn('[PassengerAlteration] Falha ao enviar para Supabase, mantendo cópia local:', err?.message);
    }
  }

  return newRequest;
}

/**
 * Consulta a última solicitação de alteração do passageiro (Pendente, Aprovada ou Rejeitada)
 */
export async function getPassengerPendingAlteration(userId: string): Promise<AlterationRequest | null> {
  if (!userId) return null;

  // 1. Tenta buscar do Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_alteracao')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              `${ALTERATION_STORAGE_PREFIX}${userId}`,
              JSON.stringify(data)
            );
            window.localStorage.setItem(
              `${ALTERATION_STATUS_PREFIX}${userId}`,
              data.status === 'Pendente' ? 'Aguardando aprovação' : data.status
            );
          } catch (_) {}
        }
        return data as AlterationRequest;
      }
    } catch (_) {}
  }

  // 2. Fallback do LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${ALTERATION_STORAGE_PREFIX}${userId}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
  }

  return null;
}
