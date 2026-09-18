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
  userEmail?: string;
  userName: string;
  tipoAlteracao: 'dados_cadastrais' | 'empresa' | 'dados_pessoais';
  dadosAnteriores: Record<string, any>;
  dadosNovos: Record<string, any>;
  justificativa?: string;
}): Promise<AlterationRequest> {
  const { userId, userEmail, userName, tipoAlteracao, dadosAnteriores, dadosNovos, justificativa } = params;

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
      if (userEmail) {
        window.localStorage.setItem(
          `${ALTERATION_STORAGE_PREFIX}${userEmail}`,
          JSON.stringify(newRequest)
        );
        window.localStorage.setItem(
          `${ALTERATION_STATUS_PREFIX}${userEmail}`,
          'Aguardando aprovação'
        );
      }
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

      if (userEmail) {
        try {
          await supabase
            .from('passageiros')
            .update({ solicitacao_pendente: true, updated_at: new Date().toISOString() })
            .eq('email', userEmail);
        } catch (_) {}
      }

      try {
        await supabase
          .from('profiles')
          .update({ solicitacao_pendente: true, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (_) {}

      if (userEmail) {
        try {
          await supabase
            .from('profiles')
            .update({ solicitacao_pendente: true, updated_at: new Date().toISOString() })
            .eq('email', userEmail);
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('[PassengerAlteration] Falha ao enviar para Supabase, mantendo cópia local:', err?.message);
    }
  }

  return newRequest;
}

/**
 * Consulta a última solicitação de alteração do passageiro (Pendente, Aprovada ou Rejeitada)
 */
export async function getPassengerPendingAlteration(userId: string, userEmail?: string): Promise<AlterationRequest | null> {
  if (!userId && !userEmail) return null;

  // 1. Tenta buscar do Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('solicitacoes_alteracao')
        .select('*');

      if (userId && userEmail && userId !== userEmail) {
        query = query.or(`usuario_id.eq.${userId},usuario_id.eq.${userEmail}`);
      } else if (userId) {
        query = query.eq('usuario_id', userId);
      } else if (userEmail) {
        query = query.eq('usuario_id', userEmail);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const isApproved = data.status === 'Aprovado' || data.status === 'aprovado';

        if (typeof window !== 'undefined') {
          try {
            if (isApproved) {
              // Limpa status pendente do localStorage se aprovado
              window.localStorage.removeItem(`${ALTERATION_STORAGE_PREFIX}${userId}`);
              window.localStorage.removeItem(`${ALTERATION_STATUS_PREFIX}${userId}`);
              if (userEmail) {
                window.localStorage.removeItem(`${ALTERATION_STORAGE_PREFIX}${userEmail}`);
                window.localStorage.removeItem(`${ALTERATION_STATUS_PREFIX}${userEmail}`);
              }
            } else {
              window.localStorage.setItem(
                `${ALTERATION_STORAGE_PREFIX}${userId}`,
                JSON.stringify(data)
              );
              window.localStorage.setItem(
                `${ALTERATION_STATUS_PREFIX}${userId}`,
                data.status === 'Pendente' ? 'Aguardando aprovação' : data.status
              );
            }
          } catch (_) {}
        }
        return data as AlterationRequest;
      }
    } catch (_) {}
  }

  // 2. Fallback do LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${ALTERATION_STORAGE_PREFIX}${userId}`) ||
                  (userEmail ? window.localStorage.getItem(`${ALTERATION_STORAGE_PREFIX}${userEmail}`) : null);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
  }

  return null;
}

/**
 * Aplica e sincroniza dados de alteração aprovados diretamente no banco de dados e Auth
 */
export async function syncApprovedAlterationToProfile(params: {
  userId: string;
  userEmail?: string;
  dadosNovos: Record<string, any>;
}): Promise<void> {
  const { userId, userEmail, dadosNovos } = params;
  if (!dadosNovos || (!userId && !userEmail)) return;

  const nome = dadosNovos.nome || dadosNovos.name || dadosNovos.nome_completo || dadosNovos.full_name;
  const telefone = dadosNovos.telefone || dadosNovos.phone || dadosNovos.whatsapp;
  const cpf = dadosNovos.cpf;
  const endereco = dadosNovos.endereco || dadosNovos.pickup_address || dadosNovos.address || dadosNovos.ponto_embarque;
  const empresa = dadosNovos.empresa || dadosNovos.company || dadosNovos.corporate_company;
  const setor = dadosNovos.setor || dadosNovos.department;
  const matricula = dadosNovos.matricula || dadosNovos.employee_registration || dadosNovos.employee_id;
  const turno = dadosNovos.turno || dadosNovos.shift;

  if (isSupabaseConfigured && supabase) {
    try {
      const profileUpdates: Record<string, any> = {
        solicitacao_pendente: false,
        updated_at: new Date().toISOString()
      };
      if (nome) { profileUpdates.name = nome; profileUpdates.nome = nome; }
      if (telefone) { profileUpdates.phone = telefone; profileUpdates.telefone = telefone; }
      if (cpf) profileUpdates.cpf = cpf;
      if (endereco) { profileUpdates.pickup_address = endereco; profileUpdates.endereco = endereco; }
      if (empresa) { profileUpdates.company = empresa; profileUpdates.corporate_company = empresa; }
      if (setor) { profileUpdates.department = setor; profileUpdates.setor = setor; }
      if (matricula) { profileUpdates.employee_registration = matricula; profileUpdates.matricula = matricula; }
      if (turno) { profileUpdates.shift = turno; profileUpdates.turno = turno; }

      if (userId) {
        await supabase.from('profiles').update(profileUpdates).eq('id', userId);
      }
      if (userEmail) {
        await supabase.from('profiles').update(profileUpdates).eq('email', userEmail);
      }

      const passUpdates: Record<string, any> = {
        solicitacao_pendente: false,
        updated_at: new Date().toISOString()
      };
      if (nome) { passUpdates.nome = nome; passUpdates.nome_completo = nome; passUpdates.nome_social = nome.split(' ')[0]; }
      if (telefone) { passUpdates.telefone = telefone; passUpdates.phone = telefone; }
      if (cpf) passUpdates.cpf = cpf;
      if (endereco) { passUpdates.endereco = endereco; passUpdates.pickup_address = endereco; }
      if (empresa) { passUpdates.empresa = empresa; passUpdates.company = empresa; }
      if (setor) { passUpdates.setor = setor; passUpdates.department = setor; }
      if (matricula) { passUpdates.matricula = matricula; passUpdates.employee_registration = matricula; }
      if (turno) { passUpdates.turno = turno; passUpdates.shift = turno; }

      if (userId) {
        await supabase.from('passageiros').update(passUpdates).eq('id', userId);
      }
      if (userEmail) {
        await supabase.from('passageiros').update(passUpdates).eq('email', userEmail);
      }

      try {
        const authData: Record<string, any> = {
          solicitacao_pendente: false
        };
        if (nome) { authData.name = nome; authData.nome = nome; }
        if (telefone) { authData.phone = telefone; authData.telefone = telefone; }
        if (cpf) authData.cpf = cpf;
        if (endereco) { authData.endereco = endereco; authData.pickup_address = endereco; }
        if (empresa) { authData.company = empresa; authData.empresa = empresa; }
        if (setor) { authData.department = setor; authData.setor = setor; }
        if (matricula) { authData.matricula = matricula; }
        if (turno) { authData.turno = turno; }

        await supabase.auth.updateUser({ data: authData });
      } catch (_) {}
    } catch (err: any) {
      console.warn('[syncApprovedAlterationToProfile] Erro ao sincronizar no banco:', err?.message);
    }
  }

  // Limpa pendências locais
  if (typeof window !== 'undefined') {
    try {
      if (userId) {
        window.localStorage.removeItem(`${ALTERATION_STORAGE_PREFIX}${userId}`);
        window.localStorage.removeItem(`${ALTERATION_STATUS_PREFIX}${userId}`);
      }
      if (userEmail) {
        window.localStorage.removeItem(`${ALTERATION_STORAGE_PREFIX}${userEmail}`);
        window.localStorage.removeItem(`${ALTERATION_STATUS_PREFIX}${userEmail}`);
      }
    } catch (_) {}
  }
}
