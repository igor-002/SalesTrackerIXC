import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sincronizarStatusIxc, type SyncResultado } from '@/services/ixcSync'
import { ixcConfigurado } from '@/lib/ixc'

export type { SyncResultado }

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
