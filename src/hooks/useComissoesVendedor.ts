import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ComissaoContrato {
  id: string
  cliente_nome: string
  vendedor_id: string | null
  mes_referencia: number | null
  ano_referencia: number | null
  status_ixc: string | null
  valor_unitario: number
  valor_total: number | null
  comissao_pct: number | null
  comissao_valor: number | null
  data_venda: string
  produto: { id: string; nome: string } | null
}

export function useComissoesVendedor(
  vendedorId: string | null,
  mes: number,
  ano: number
) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['comissoes-vendedor', vendedorId, mes, ano],
    queryFn: async () => {
      let q = supabase
        .from('vendas')
        .select('id, cliente_nome, vendedor_id, mes_referencia, ano_referencia, status_ixc, valor_unitario, valor_total, comissao_pct, comissao_valor, data_venda, produto:produtos(id, nome)')
        .eq('mes_referencia', mes)
        .eq('ano_referencia', ano)
        .order('comissao_valor', { ascending: false, nullsFirst: false })

      if (vendedorId) q = q.eq('vendedor_id', vendedorId)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ComissaoContrato[]
    },
    staleTime: 10 * 60 * 1000,
  })

  const liberadas  = useMemo(() => data.filter(c => c.status_ixc === 'A'), [data])
  const aguardando = useMemo(() => data.filter(c => c.status_ixc === 'AA' || c.status_ixc === 'P'), [data])
  const canceladas = useMemo(() => data.filter(c => c.status_ixc === 'C' || c.status_ixc === 'CN'), [data])

  const totalLiberado = useMemo(() => liberadas.reduce((s, c) => s + (c.comissao_valor ?? 0), 0), [liberadas])
  const totalPendente = useMemo(() => aguardando.reduce((s, c) => s + (c.comissao_valor ?? 0), 0), [aguardando])
  const totalPerdido  = useMemo(() => canceladas.reduce((s, c) => s + (c.comissao_valor ?? 0), 0), [canceladas])

  return { loading: isLoading, liberadas, aguardando, canceladas, totalLiberado, totalPendente, totalPerdido }
}
