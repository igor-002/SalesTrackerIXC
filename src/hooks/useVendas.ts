import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/database.types'

export interface VendaComJoins {
  id: string
  cliente_nome: string
  cliente_cpf_cnpj: string | null
  cliente_uf: string | null
  codigo_cliente_ixc: string | null
  codigo_contrato_ixc: string | null
  quantidade: number
  valor_unitario: number
  valor_total: number | null
  comissao_pct: number | null
  comissao_valor: number | null
  mrr: boolean | null
  data_venda: string
  descricao: string | null
  created_at: string | null
  status_ixc: string | null
  status_atualizado_em: string | null
  dias_em_aa: number | null
  dias_aguardando: number | null
  mes_referencia: number | null
  ano_referencia: number | null
  tags: string | null
  vendedor: { id: string; nome: string } | null
  segmento: { id: string; nome: string } | null
  produto: { id: string; nome: string } | null
  status: { id: string; nome: string } | null
}

type VendaInsert = Omit<TablesInsert<'vendas'>, 'valor_total' | 'comissao_valor'>

export function useVendas(options?: { vendedorId?: string | null }) {
  const [vendas, setVendas] = useState<VendaComJoins[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('vendas')
      .select(`
        *,
        vendedor:vendedores(id, nome),
        segmento:segmentos(id, nome),
        produto:produtos(id, nome),
        status:status_venda(id, nome)
      `)
      .order('data_venda', { ascending: false })
      .limit(200)

    if (options?.vendedorId) {
      query = query.eq('vendedor_id', options.vendedorId)
    }

    const { data } = await query
    setVendas((data ?? []) as VendaComJoins[])
    setLoading(false)
  }, [options?.vendedorId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function createVenda(payload: VendaInsert) {
    const { error } = await supabase.from('vendas').insert(payload)
    if (error) throw error
    await fetch()
  }

  async function updateStatus(vendaId: string, statusId: string) {
    const { error } = await supabase
      .from('vendas')
      .update({ status_id: statusId })
      .eq('id', vendaId)
    if (error) throw error
    await fetch()
  }

  async function updateVenda(vendaId: string, payload: VendaInsert) {
    const { error } = await supabase
      .from('vendas')
      .update(payload)
      .eq('id', vendaId)
    if (error) throw error
    await fetch()
  }

  async function deleteVenda(vendaId: string) {
    const { error } = await supabase
      .from('vendas')
      .delete()
      .eq('id', vendaId)
    if (error) throw error
    await fetch()
  }

  return { vendas, loading, refetch: fetch, createVenda, updateStatus, updateVenda, deleteVenda }
}
