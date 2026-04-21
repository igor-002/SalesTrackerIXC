import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  sincronizarStatusIxc,
  syncContratosFromIXC,
  type SyncResultado,
  type SyncContratosResult,
} from '@/services/ixcSync'
import { ixcConfigurado } from '@/lib/ixc'

export type { SyncResultado, SyncContratosResult }

const SYNC_QUERY_KEY = ['ixc-sync'] as const

interface UseIxcSyncOptions {
  /** Chamado sempre que uma sincronização for concluída com sucesso */
  onSyncComplete?: () => void
}

export function useIxcSync(options?: UseIxcSyncOptions) {
  const queryClient = useQueryClient()
  const prevUpdatedAt = useRef<number>(0)

  const { data, isFetching, dataUpdatedAt } = useQuery<SyncResultado>({
    queryKey: SYNC_QUERY_KEY,
    queryFn: sincronizarStatusIxc,
    refetchInterval: 30 * 60 * 1000,   // 30 minutos
    staleTime: 29 * 60 * 1000,          // não re-executa se < 29min
    enabled: ixcConfigurado(),
    retry: 1,
  })

  // Dispara onSyncComplete quando dataUpdatedAt muda (nova sync concluída)
  useEffect(() => {
    if (dataUpdatedAt > 0 && dataUpdatedAt !== prevUpdatedAt.current) {
      prevUpdatedAt.current = dataUpdatedAt
      options?.onSyncComplete?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  const ultimaSincronizacao: Date | null = dataUpdatedAt > 0 ? new Date(dataUpdatedAt) : null

  function sincronizarAgora() {
    return queryClient.invalidateQueries({ queryKey: SYNC_QUERY_KEY })
  }

  return {
    ultimaSincronizacao,
    sincronizando: isFetching,
    sincronizarAgora,
    resultado: data ?? null,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Hook para sync completo de contratos IXC (Fase 6)
// ══════════════════════════════════════════════════════════════════════════════

export interface SyncProgressState {
  message: string
  percent: number
  running: boolean
  error: string | null
  result: SyncContratosResult | null
}

export function useIxcSyncFull() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<SyncProgressState>({
    message: '',
    percent: 0,
    running: false,
    error: null,
    result: null,
  })

  const executarSyncCompleto = useCallback(async () => {
    if (progress.running) return

    setProgress({
      message: 'Iniciando...',
      percent: 0,
      running: true,
      error: null,
      result: null,
    })

    try {
      const result = await syncContratosFromIXC((msg, pct) => {
        setProgress((prev) => ({
          ...prev,
          message: msg,
          percent: pct ?? prev.percent,
        }))
      })

      setProgress({
        message: `Sync concluído — ${result.importados} contratos importados`,
        percent: 100,
        running: false,
        error: null,
        result,
      })

      // Invalidar queries para atualizar dados no Dashboard
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['ixc-sync'] })
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      setProgress({
        message: errorMsg,
        percent: 0,
        running: false,
        error: errorMsg,
        result: null,
      })
    }
  }, [progress.running, queryClient])

  const resetProgress = useCallback(() => {
    setProgress({
      message: '',
      percent: 0,
      running: false,
      error: null,
      result: null,
    })
  }, [])

  return {
    progress,
    executarSyncCompleto,
    resetProgress,
    habilitado: ixcConfigurado(),
  }
}
