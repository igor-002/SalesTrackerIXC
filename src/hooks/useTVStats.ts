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
  mrr12Meses: { mes: string; valor: number }[]
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
  mrr12Meses: [],
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

    // 12 meses para a linha de MRR no gráfico
    const inicio12Meses = new Date(now)
    inicio12Meses.setFullYear(inicio12Meses.getFullYear() - 1)
    inicio12Meses.setDate(1)
    const inicio12MesesStr = inicio12Meses.toISOString().slice(0, 10)

    const [mesRes, semanaRes, mrr12Res] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, status_ixc, mrr, valor_total, dias_em_aa, cliente_nome, data_venda, codigo_contrato_ixc, vendedor:vendedores(id, nome)')
        .gte('data_venda', inicioMes),
      supabase
        .from('vendas')
        .select('data_venda')
        .gte('data_venda', inicioSemanaStr),
      supabase
        .from('vendas')
        .select('data_venda, valor_total')
        .eq('mrr', true)
        .eq('status_ixc', 'A')
        .gte('data_venda', inicio12MesesStr),
    ])

    const vendasMes = mesRes.data ?? []
    const vendasSemana = semanaRes.data ?? []
    const vendasMrr12 = mrr12Res.data ?? []

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

    // Agrupar MRR dos últimos 12 meses por mês
    const mrrMap = new Map<string, number>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mrrMap.set(key, 0)
    }
    for (const v of vendasMrr12) {
      const key = v.data_venda.slice(0, 7)
      if (mrrMap.has(key)) mrrMap.set(key, (mrrMap.get(key) ?? 0) + (v.valor_total ?? 0))
    }
    const mrr12Meses = Array.from(mrrMap.entries()).map(([key, valor]) => {
      const [ano, mes] = key.split('-')
      const label = new Date(Number(ano), Number(mes) - 1, 1).toLocaleString('pt-BR', { month: 'short' })
      return { mes: label, valor }
    })

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
      mrr12Meses,
      loading: false,
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...stats, refetch: fetch }
}
