import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useComissaoConfig } from '@/hooks/useComissaoConfig'

export interface ComissaoPagamento {
  id: string
  vendedor_id: string | null
  vendedor_nome: string | null
  codigo_contrato_ixc: string | null
  cliente_nome: string
  plano: string | null
  valor_plano: number
  comissao_pct: number | null
  comissao_valor: number | null
  periodo_referencia: string
  periodo_pagamento: string
  data_ativacao: string | null
  status: 'pendente' | 'pago'
  data_pagamento: string | null
  marcado_por: string | null
  marcado_por_nome: string | null
  observacao: string | null
  is_transferida: boolean
}

function calcularPeriodoPagamento(dataAtivacao: string | null, mes: number, ano: number): string {
  const mesStr = mes.toString().padStart(2, '0')
  if (!dataAtivacao) return `${ano}-${mesStr}`

  const d = new Date(dataAtivacao + 'T00:00:00')
  if (isNaN(d.getTime())) return `${ano}-${mesStr}`

  const dAno = d.getFullYear()
  const dMes = d.getMonth() + 1

  if (d.getDate() <= 20) return `${dAno}-${dMes.toString().padStart(2, '0')}`

  const proximo = new Date(dAno, dMes - 1, 1)
  proximo.setMonth(proximo.getMonth() + 1)
  return `${proximo.getFullYear()}-${(proximo.getMonth() + 1).toString().padStart(2, '0')}`
}

export function useComissaoPagamentos({
  mes,
  ano,
  vendedorId,
  isAdmin,
}: {
  mes: number
  ano: number
  vendedorId: string | null
  isAdmin: boolean
}) {
  const userId = useAuthStore(s => s.user?.id)
  const { resolverPct, empresaId, loading: loadingConfig } = useComissaoConfig()

  const [comissoes, setComissoes] = useState<ComissaoPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const syncedRef = useRef<string>('')

  const periodoRef = `${ano}-${mes.toString().padStart(2, '0')}`

  const fetchComissoes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('comissao_pagamentos')
        .select('*, vendedor:vendedores(nome)')
        .eq('periodo_pagamento', periodoRef)
        .order('status', { ascending: true })
        .order('cliente_nome', { ascending: true })

      if (vendedorId) q = q.eq('vendedor_id', vendedorId)

      const { data, error: err } = await q
      if (err) throw err

      const rows = (data ?? []) as (typeof data extends (infer T)[] | null ? T : never)[]
      setComissoes(rows.map((r: Record<string, unknown>) => {
        const vendedor = r.vendedor as { nome: string } | null
        return {
          id: r.id as string,
          vendedor_id: (r.vendedor_id as string | null) ?? null,
          vendedor_nome: vendedor?.nome ?? null,
          codigo_contrato_ixc: (r.codigo_contrato_ixc as string | null) ?? null,
          cliente_nome: r.cliente_nome as string,
          plano: (r.plano as string | null) ?? null,
          valor_plano: r.valor_plano as number,
          comissao_pct: (r.comissao_pct as number | null) ?? null,
          comissao_valor: (r.comissao_valor as number | null) ?? null,
          periodo_referencia: r.periodo_referencia as string,
          periodo_pagamento: r.periodo_pagamento as string,
          data_ativacao: (r.data_ativacao as string | null) ?? null,
          status: (r.status as 'pendente' | 'pago') ?? 'pendente',
          data_pagamento: (r.data_pagamento as string | null) ?? null,
          marcado_por: (r.marcado_por as string | null) ?? null,
          marcado_por_nome: null,
          observacao: (r.observacao as string | null) ?? null,
          is_transferida: (r.periodo_referencia as string) !== (r.periodo_pagamento as string),
        }
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar comissões')
    } finally {
      setLoading(false)
    }
  }, [periodoRef, vendedorId])

  const syncContratos = useCallback(async () => {
    if (loadingConfig) return
    const syncKey = `${periodoRef}-${loadingConfig}`
    if (syncedRef.current === syncKey) return
    syncedRef.current = syncKey

    setSyncing(true)
    try {
      console.log('[CP-DEBUG] iniciando sync', { empresaId, mes, ano, vendedorId })

      if (!empresaId) {
        console.warn('[CP-DEBUG] empresaId nulo, abortando sync')
        return
      }

      const mesAnterior = mes === 1 ? 12 : mes - 1
      const anoAnterior = mes === 1 ? ano - 1 : ano

      const SELECT = 'codigo_contrato_ixc, cliente_nome, plano, valor_unitario, quantidade, data_ativacao, status_ixc, vendedor_id, empresa_id, mes_referencia, ano_referencia'

      const [res1, res2] = await Promise.all([
        supabase
          .from('vendas_historico')
          .select(SELECT)
          .eq('empresa_id', empresaId)
          .eq('status_ixc', 'A')
          .eq('ano_referencia', ano)
          .eq('mes_referencia', mes)
          .not('data_ativacao', 'is', null),
        supabase
          .from('vendas_historico')
          .select(SELECT)
          .eq('empresa_id', empresaId)
          .eq('status_ixc', 'A')
          .eq('ano_referencia', anoAnterior)
          .eq('mes_referencia', mesAnterior)
          .not('data_ativacao', 'is', null),
      ])

      console.log('[CP-DEBUG] res1 data:', res1.data?.length, 'error:', res1.error?.message)
      console.log('[CP-DEBUG] res2 data:', res2.data?.length, 'error:', res2.error?.message)

      if (res1.error) throw res1.error
      if (res2.error) throw res2.error

      const contratos = [...(res1.data ?? []), ...(res2.data ?? [])]
      console.log('[CP-DEBUG] contratos raw:', contratos?.length, JSON.stringify(contratos?.[0]))

      const registros = contratos.map(h => {
        const pct = resolverPct(h.vendedor_id ?? '')
        const valorPlano = (h.valor_unitario ?? 0) * (h.quantidade ?? 1)
        const periodoRefRow = `${h.ano_referencia}-${h.mes_referencia.toString().padStart(2, '0')}`
        const periodoPag = calcularPeriodoPagamento(h.data_ativacao, h.mes_referencia, h.ano_referencia)
        return {
          empresa_id: empresaId ?? undefined,
          vendedor_id: h.vendedor_id ?? null,
          codigo_contrato_ixc: h.codigo_contrato_ixc ?? null,
          cliente_nome: h.cliente_nome,
          plano: h.plano ?? null,
          valor_plano: valorPlano,
          comissao_pct: pct > 0 ? pct : null,
          periodo_referencia: periodoRefRow,
          periodo_pagamento: periodoPag,
          data_ativacao: h.data_ativacao ?? null,
        }
      }).filter(r => r.codigo_contrato_ixc)
      console.log('[CP-DEBUG] registros para upsert:', registros.length, JSON.stringify(registros[0]))

      // Passo 1: insert novos (em lotes de 100)
      for (let i = 0; i < registros.length; i += 100) {
        const lote = registros.slice(i, i + 100)
        await supabase
          .from('comissao_pagamentos')
          .upsert(lote as never, { onConflict: 'codigo_contrato_ixc,periodo_referencia', ignoreDuplicates: true })
      }

      // Passo 2: corrige periodo_pagamento se mudou (preserva status/data_pagamento/marcado_por)
      for (const r of registros) {
        await supabase
          .from('comissao_pagamentos')
          .update({ periodo_pagamento: r.periodo_pagamento } as never)
          .eq('codigo_contrato_ixc', r.codigo_contrato_ixc as string)
          .eq('periodo_referencia', r.periodo_referencia)
          .neq('periodo_pagamento', r.periodo_pagamento)
      }
    } catch (e) {
      console.error('[useComissaoPagamentos] sync error:', e)
    } finally {
      setSyncing(false)
      await fetchComissoes()
    }
  }, [mes, ano, periodoRef, empresaId, loadingConfig, resolverPct, fetchComissoes])

  useEffect(() => {
    syncedRef.current = ''
  }, [mes, ano])

  useEffect(() => {
    if (!loadingConfig) syncContratos()
  }, [syncContratos, loadingConfig])

  async function marcarPago(id: string, observacao?: string) {
    if (!isAdmin) return
    const agora = new Date().toISOString()
    setComissoes(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'pago', data_pagamento: agora, marcado_por: userId ?? null } : c
    ))
    await supabase
      .from('comissao_pagamentos')
      .update({
        status: 'pago',
        data_pagamento: agora,
        marcado_por: userId ?? null,
        observacao: observacao ?? null,
      } as never)
      .eq('id', id)
  }

  async function marcarPendente(id: string) {
    if (!isAdmin) return
    setComissoes(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'pendente', data_pagamento: null, marcado_por: null } : c
    ))
    await supabase
      .from('comissao_pagamentos')
      .update({ status: 'pendente', data_pagamento: null, marcado_por: null, observacao: null } as never)
      .eq('id', id)
  }

  const pendentes = comissoes.filter(c => c.status === 'pendente')
  const pagas = comissoes.filter(c => c.status === 'pago')
  const transferidas = pendentes.filter(c => c.is_transferida)

  const totais = {
    pago: pagas.reduce((s, c) => s + (c.comissao_valor ?? 0), 0),
    pendente: pendentes.reduce((s, c) => s + (c.comissao_valor ?? 0), 0),
    transferidas: transferidas.reduce((s, c) => s + (c.comissao_valor ?? 0), 0),
    total: comissoes.reduce((s, c) => s + (c.comissao_valor ?? 0), 0),
  }

  const refetch = useCallback(async () => {
    syncedRef.current = ''
    await syncContratos()
    await fetchComissoes()
  }, [syncContratos, fetchComissoes])

  return {
    comissoes,
    pendentes,
    pagas,
    totais,
    loading,
    syncing,
    error,
    marcarPago,
    marcarPendente,
    refetch,
  }
}
