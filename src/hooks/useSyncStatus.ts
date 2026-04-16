/**
 * Hook de status de sincronização — lê a tabela sync_log.
 * useSyncStatus: último registro (para indicador do TV Dashboard).
 * useHistoricoSync: últimos 10 registros (para painel do Dashboard).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type SyncLogRow = Tables<'sync_log'>

const SYNC_LOG_SELECT =
  'id, tipo, status, registros_processados, registros_atualizados, registros_erro, erro_mensagem, iniciado_em, finalizado_em, duracao_ms'

async function fetchUltimoSync(): Promise<SyncLogRow | null> {
  const { data } = await supabase
    .from('sync_log')
    .select(SYNC_LOG_SELECT)
    .order('iniciado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as SyncLogRow | null
}

async function fetchHistoricoSync(): Promise<SyncLogRow[]> {
  const { data } = await supabase
    .from('sync_log')
    .select(SYNC_LOG_SELECT)
    .order('iniciado_em', { ascending: false })
    .limit(10)
  return (data ?? []) as SyncLogRow[]
}

/** Último status de sync — atualiza a cada 60s. */
export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status-ultimo'],
    queryFn: fetchUltimoSync,
    refetchInterval: 60 * 1000,
    staleTime: 55 * 1000,
  })
}

/** Últimos 10 registros de sync — para o painel do Dashboard. */
export function useHistoricoSync() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['sync-historico'],
    queryFn: fetchHistoricoSync,
    staleTime: 55 * 1000,
  })

  function refetchTudo() {
    queryClient.invalidateQueries({ queryKey: ['sync-status-ultimo'] })
    queryClient.invalidateQueries({ queryKey: ['sync-historico'] })
  }

  return { ...query, refetchTudo }
}
