import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ContratoComVendedor {
  id: string
  codigo_contrato_ixc: string | null
  codigo_cliente_ixc: string | null
  cliente_nome: string
  valor_unitario: number
  status_ixc: string | null
  data_venda: string | null
  created_at: string
  vendedor: { id: string; nome: string; ixc_id: string | null } | null
}

export interface SyncLogEntry {
  id: string
  tipo: string
  status: string
  iniciado_em: string
  finalizado_em: string | null
  duracao_ms: number | null
  registros_processados: number | null
  registros_atualizados: number | null
  registros_erro: number | null
  erro_mensagem: string | null
}

export function useDiagnosticoIXC() {
  const [contratos, setContratos] = useState<ContratoComVendedor[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)

  const fetchContratos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vendas')
      .select(`
        id,
        codigo_contrato_ixc,
        codigo_cliente_ixc,
        cliente_nome,
        valor_unitario,
        status_ixc,
        data_venda,
        created_at,
        vendedor:vendedores(id, nome, ixc_id)
      `)
      .not('codigo_contrato_ixc', 'is', null)
      .order('data_venda', { ascending: false })

    setContratos((data ?? []) as ContratoComVendedor[])
    setLoading(false)
  }, [])

  const fetchSyncLogs = useCallback(async () => {
    setLoadingLogs(true)
    const { data } = await supabase
      .from('sync_log')
      .select('*')
      .order('iniciado_em', { ascending: false })
      .limit(20)

    setSyncLogs((data ?? []) as SyncLogEntry[])
    setLoadingLogs(false)
  }, [])

  useEffect(() => {
    fetchContratos()
    fetchSyncLogs()
  }, [fetchContratos, fetchSyncLogs])

  return {
    contratos,
    syncLogs,
    loading,
    loadingLogs,
    refetch: fetchContratos,
    refetchLogs: fetchSyncLogs,
  }
}

export interface VendedorAutorizado {
  id: string
  nome: string
  ixc_id: string
}

export function useVendedoresAutorizados() {
  const [vendedores, setVendedores] = useState<VendedorAutorizado[]>([])

  useEffect(() => {
    supabase
      .from('vendedores')
      .select('id, nome, ixc_id')
      .eq('incluir_historico', true)
      .not('ixc_id', 'is', null)
      .order('nome')
      .then(({ data }) => setVendedores((data ?? []) as VendedorAutorizado[]))
  }, [])

  return vendedores
}
