import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DIAS_SEMANA } from '@/constants'

export interface FunilCounts {
  A: number
  AA: number
  CM: number
  FA: number
  CN: number
  N: number
}

export interface AlertaAATv {
  id: string
  cliente_nome: string
  dias_em_aa: number | null
  vendedor: { id: string; nome: string } | null
  codigo_contrato_ixc: string | null
}

export interface VendedorRanking {
  id: string
  nome: string
  total: number
  qtd: number
  ticketMedio: number
  totalCadastrados: number
  taxaConversao: number
}

export interface TVStats {
  faturamentoReal: number
  faturamentoPrometido: number
  mrrReal: number
  mrrProjetado: number
  funilCounts: FunilCounts
  taxaConversao: number
  alertasAA: AlertaAATv[]
  rankingVendedores: VendedorRanking[]
  vendasPorDiaSemana: { dia: string; qtd: number }[]
  loading: boolean
}

const EMPTY: TVStats = {
  faturamentoReal: 0,
  faturamentoPrometido: 0,
  mrrReal: 0,
  mrrProjetado: 0,
  funilCounts: { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 },
  taxaConversao: 0,
  alertasAA: [],
  rankingVendedores: [],
  vendasPorDiaSemana: [],
  loading: true,
}

export function useTVStats() {
  const [stats, setStats] = useState<TVStats>(EMPTY)

  const fetch = useCallback(async () => {
    setStats((s) => ({ ...s, loading: true }))

    const now = new Date()
    const anoAtual = now.getFullYear()
    const mesAtual = now.getMonth() + 1
    const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`

    const dayOfWeek = now.getDay()
    const inicioSemana = new Date(now)
    inicioSemana.setDate(now.getDate() - dayOfWeek)
    const inicioSemanaStr = inicioSemana.toISOString().slice(0, 10)

    const [mesRes, semanaRes] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, status_ixc, mrr, valor_total, dias_em_aa, cliente_nome, data_venda, codigo_contrato_ixc, vendedor:vendedores(id, nome)')
        .gte('data_venda', inicioMes),
      supabase
        .from('vendas')
        .select('data_venda')
        .gte('data_venda', inicioSemanaStr),
    ])

    const vendasMes = mesRes.data ?? []
    const vendasSemana = semanaRes.data ?? []

    const faturamentoReal = vendasMes
      .filter((v) => v.status_ixc === 'A')
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    const faturamentoPrometido = vendasMes
      .filter((v) => v.status_ixc === 'AA')
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    const mrrReal = vendasMes
      .filter((v) => v.mrr && v.status_ixc === 'A')
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    const mrrProjetado = vendasMes
      .filter((v) => v.mrr)
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    const funilCounts: FunilCounts = { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 }
    for (const v of vendasMes) {
      const code = (v.status_ixc ?? '') as keyof FunilCounts
      if (code in funilCounts) funilCounts[code]++
    }

    const denom = funilCounts.A + funilCounts.AA
    const taxaConversao = denom > 0 ? (funilCounts.A / denom) * 100 : 0

    const alertasAA = (vendasMes as AlertaAATv[])
      .filter((v) => (v as { status_ixc?: string | null }).status_ixc === 'AA')
      .sort((a, b) => (b.dias_em_aa ?? 0) - (a.dias_em_aa ?? 0))

    // Ranking: contratos ativos (A) para faturamento + todos os status para conversão
    const rankMap = new Map<string, { nome: string; total: number; qtd: number; totalCadastrados: number }>()
    for (const v of vendasMes) {
      const vend = v.vendedor as { id: string; nome: string } | null
      if (!vend) continue
      const entry = rankMap.get(vend.id) ?? { nome: vend.nome, total: 0, qtd: 0, totalCadastrados: 0 }
      entry.totalCadastrados++
      if (v.status_ixc === 'A') {
        entry.total += v.valor_total ?? 0
        entry.qtd++
      }
      rankMap.set(vend.id, entry)
    }
    const rankingVendedores: VendedorRanking[] = Array.from(rankMap.entries())
      .map(([id, e]) => ({
        id,
        nome: e.nome,
        total: e.total,
        qtd: e.qtd,
        ticketMedio: e.qtd > 0 ? e.total / e.qtd : 0,
        totalCadastrados: e.totalCadastrados,
        taxaConversao: e.totalCadastrados > 0 ? (e.qtd / e.totalCadastrados) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    const counts = new Array(7).fill(0)
    for (const v of vendasSemana) {
      const day = new Date(v.data_venda + 'T12:00:00').getDay()
      counts[day]++
    }
    const vendasPorDiaSemana = DIAS_SEMANA.map((dia, i) => ({ dia, qtd: counts[i] }))

    setStats({
      faturamentoReal,
      faturamentoPrometido,
      mrrReal,
      mrrProjetado,
      funilCounts,
      taxaConversao,
      alertasAA,
      rankingVendedores,
      vendasPorDiaSemana,
      loading: false,
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...stats, refetch: fetch }
}
