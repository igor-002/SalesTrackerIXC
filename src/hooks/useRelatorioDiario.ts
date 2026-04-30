import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RelDiarioRow {
  id: string
  vendedor_id: string
  data_relatorio: string
  leads: number
  contatos: number
  calls_reunioes: number
  vendas: number
  valor_total: number
  observacoes: string | null
}

export interface RelDiarioHistoricoItem {
  data_relatorio: string
  totalVendas: number
  valorTotal: number
  vendedoresPreenchidos: number
}

export function useRelatorioDiario(data: string) {
  const qc = useQueryClient()

  const { data: relatorios = [], isLoading } = useQuery({
    queryKey: ['relatorio-diario', data],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('relatorio_diario')
        .select('id, vendedor_id, data_relatorio, leads, contatos, calls_reunioes, vendas, valor_total, observacoes')
        .eq('data_relatorio', data)
      if (error) throw error
      return (rows ?? []) as RelDiarioRow[]
    },
    staleTime: 60 * 1000,
  })

  const upsert = useCallback(async (
    vendedorId: string,
    payload: Omit<RelDiarioRow, 'id' | 'vendedor_id' | 'data_relatorio'>,
    createdBy: string | null,
  ) => {
    const { data: emp } = await supabase.from('empresas').select('id').limit(1).single()
    const { error } = await supabase.from('relatorio_diario').upsert({
      vendedor_id: vendedorId,
      data_relatorio: data,
      empresa_id: emp?.id ?? '',
      leads: payload.leads,
      contatos: payload.contatos,
      calls_reunioes: payload.calls_reunioes,
      vendas: payload.vendas,
      valor_total: payload.valor_total,
      observacoes: payload.observacoes || null,
      created_by: createdBy,
    } as never, { onConflict: 'vendedor_id,data_relatorio' })
    if (error) throw error
    await qc.invalidateQueries({ queryKey: ['relatorio-diario', data] })
    await qc.invalidateQueries({ queryKey: ['relatorio-diario-historico'] })
  }, [data, qc])

  return { relatorios, loading: isLoading, upsert }
}

export function useRelatorioDiarioHistorico() {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['relatorio-diario-historico'],
    queryFn: async () => {
      const trinta = new Date()
      trinta.setDate(trinta.getDate() - 30)
      const desde = trinta.toISOString().split('T')[0]

      const { data: rows, error } = await supabase
        .from('relatorio_diario')
        .select('data_relatorio, vendas, valor_total, vendedor_id')
        .gte('data_relatorio', desde)
        .order('data_relatorio', { ascending: false })
      if (error) throw error

      const map = new Map<string, RelDiarioHistoricoItem>()
      for (const r of rows ?? []) {
        const d = r.data_relatorio as string
        const existing = map.get(d) ?? { data_relatorio: d, totalVendas: 0, valorTotal: 0, vendedoresPreenchidos: 0 }
        existing.totalVendas += (r.vendas as number) ?? 0
        existing.valorTotal += (r.valor_total as number) ?? 0
        existing.vendedoresPreenchidos++
        map.set(d, existing)
      }
      return Array.from(map.values())
    },
    staleTime: 60 * 1000,
  })
  return { historico, loading: isLoading }
}
