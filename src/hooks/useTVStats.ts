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

export interface PlanoStat {
  nome: string
  qtd: number
  total: number
  ticketMedio: number
}

export interface ChurnStats {
  canceladosMes: number
  canceladosMesAnterior: number
  bloqueadosMes: number
  bloqueadosMesAnterior: number
}

export interface VelocidadeVendedor {
  id: string
  nome: string
  mediaDias: number
  melhorCaso: number
  piorCaso: number
  totalContratos: number
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
  mrrPotencial12Meses: { mes: string; valor: number }[]
  planosMes: PlanoStat[]
  churn: ChurnStats
  velocidadeVendedores: VelocidadeVendedor[]
  mediaVelocidadeTime: number
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
  mrrPotencial12Meses: [],
  planosMes: [],
  churn: { canceladosMes: 0, canceladosMesAnterior: 0, bloqueadosMes: 0, bloqueadosMesAnterior: 0 },
  velocidadeVendedores: [],
  mediaVelocidadeTime: 0,
  loading: true,
}

export function useTVStats() {
  const [stats, setStats] = useState<TVStats>(EMPTY)

  const fetch = useCallback(async () => {
    setStats((s) => ({ ...s, loading: true }))

    const now = new Date()
    const anoAtual = now.getFullYear()
    const mesAtual = now.getMonth() + 1
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1
    const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual

    const dayOfWeek = now.getDay()
    const inicioSemana = new Date(now)
    inicioSemana.setDate(now.getDate() - dayOfWeek)
    const inicioSemanaStr = inicioSemana.toISOString().slice(0, 10)

    // 12 meses para a linha de MRR no gráfico
    const inicio12Meses = new Date(now)
    inicio12Meses.setFullYear(inicio12Meses.getFullYear() - 1)
    inicio12Meses.setDate(1)
    const inicio12MesesStr = inicio12Meses.toISOString().slice(0, 10)

    const [mesRes, semanaRes, mrr12Res, mrrPotencial12Res, churnMesRes, churnAnteriorRes, aguardandoRes] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, status_ixc, mrr, valor_total, valor_unitario, dias_em_aa, cliente_nome, data_venda, codigo_contrato_ixc, created_at, status_atualizado_em, vendedor:vendedores(id, nome), segmento:segmentos(id, nome)')
        .eq('mes_referencia', mesAtual)
        .eq('ano_referencia', anoAtual),
      supabase
        .from('vendas')
        .select('data_venda')
        .gte('data_venda', inicioSemanaStr),
      supabase
        .from('vendas')
        .select('mes_referencia, ano_referencia, valor_total')
        .eq('mrr', true)
        .eq('status_ixc', 'A')
        .gte('data_venda', inicio12MesesStr),
      // MRR potencial: contratos MRR ainda aguardando ativação (AA/P) por mês
      supabase
        .from('vendas')
        .select('mes_referencia, ano_referencia, valor_total')
        .eq('mrr', true)
        .in('status_ixc', ['AA', 'P'])
        .gte('data_venda', inicio12MesesStr),
      // Churn mês corrente: cancelados/bloqueados do mês de referência atual
      supabase
        .from('vendas')
        .select('id, status_ixc')
        .in('status_ixc', ['B', 'C', 'CN', 'CA'])
        .eq('mes_referencia', mesAtual)
        .eq('ano_referencia', anoAtual),
      // Churn mês anterior: cancelados/bloqueados do mês de referência anterior
      supabase
        .from('vendas')
        .select('id, status_ixc')
        .in('status_ixc', ['B', 'C', 'CN', 'CA'])
        .eq('mes_referencia', mesAnterior)
        .eq('ano_referencia', anoMesAnterior),
      // Todos os contratos aguardando/proposta — sem filtro de mês porque AA pode
      // ter sido cadastrado em qualquer mês e ainda não ter ativado
      supabase
        .from('vendas')
        .select('id, status_ixc, mrr, valor_total, dias_em_aa, cliente_nome, codigo_contrato_ixc, vendedor:vendedores(id, nome)')
        .in('status_ixc', ['AA', 'P']),
    ])

    const vendasMes = mesRes.data ?? []
    const vendasSemana = semanaRes.data ?? []
    const vendasMrr12 = mrr12Res.data ?? []
    const vendasMrrPotencial12 = mrrPotencial12Res.data ?? []
    const churnMes = churnMesRes.data ?? []
    const churnAnterior = churnAnteriorRes.data ?? []
    const vendasAguardando = aguardandoRes.data ?? []

    const faturamentoReal = vendasMes
      .filter((v) => v.status_ixc === 'A')
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    // Todos os AA/P ativos (de qualquer mês) — não apenas os do mês corrente
    const faturamentoPrometido = vendasAguardando
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    const mrrReal = vendasMes
      .filter((v) => v.mrr && v.status_ixc === 'A')
      .reduce((s, v) => s + (v.valor_unitario ?? 0), 0)

    const mrrProjetado = vendasMes
      .filter((v) => v.mrr)
      .reduce((s, v) => s + (v.valor_total ?? 0), 0)

    const funilCounts: FunilCounts = { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 }
    for (const v of vendasMes) {
      const code = (v.status_ixc ?? '') as keyof FunilCounts
      // AA é contado separadamente abaixo (via vendasAguardando) para incluir todos os meses
      if (code in funilCounts && code !== 'AA') funilCounts[code]++
    }
    // AA vem de todos os meses — contratos ainda aguardando não são do mês corrente necessariamente
    funilCounts.AA = vendasAguardando.filter((v) => v.status_ixc === 'AA').length

    // Taxa de conversão usa só o mês corrente no denominador (não distorce com AA antigos)
    const aguardandoDoMes = vendasMes.filter((v) => v.status_ixc === 'AA' || v.status_ixc === 'P').length
    const denom = funilCounts.A + aguardandoDoMes
    const taxaConversao = denom > 0 ? (funilCounts.A / denom) * 100 : 0

    const alertasAA = (vendasAguardando
      .filter((v) => v.status_ixc === 'AA') as unknown as AlertaAATv[])
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

    // Planos mais vendidos do mês (contratos A, agrupados por segmento)
    const planosMap = new Map<string, { qtd: number; total: number }>()
    for (const v of vendasMes) {
      if (v.status_ixc !== 'A') continue
      const seg = v.segmento as { id: string; nome: string } | null
      const nome = seg?.nome ?? 'Sem segmento'
      const entry = planosMap.get(nome) ?? { qtd: 0, total: 0 }
      entry.qtd++
      entry.total += v.valor_total ?? 0
      planosMap.set(nome, entry)
    }
    const planosMes: PlanoStat[] = Array.from(planosMap.entries())
      .map(([nome, e]) => ({ nome, qtd: e.qtd, total: e.total, ticketMedio: e.qtd > 0 ? e.total / e.qtd : 0 }))
      .sort((a, b) => b.qtd - a.qtd)

    // Churn: cancelados e bloqueados vs. mês anterior
    const churn: ChurnStats = {
      canceladosMes: churnMes.filter((v) => v.status_ixc === 'C' || v.status_ixc === 'CN' || v.status_ixc === 'CA').length,
      bloqueadosMes: churnMes.filter((v) => v.status_ixc === 'B').length,
      canceladosMesAnterior: churnAnterior.filter((v) => v.status_ixc === 'C' || v.status_ixc === 'CN' || v.status_ixc === 'CA').length,
      bloqueadosMesAnterior: churnAnterior.filter((v) => v.status_ixc === 'B').length,
    }

    // Velocidade de ativação: dias entre created_at e status_atualizado_em para contratos A
    // NOTA: status_atualizado_em é o timestamp da última atualização de status.
    // Quando status_ixc = 'A', é uma aproximação da data de ativação no IXC.
    // Apenas registros com status_ixc='A', status_atualizado_em não nulo e daysDiff >= 0.
    const velMap = new Map<string, { nome: string; dias: number[]; id: string }>()
    let todasDiasVelocidade: number[] = []
    for (const v of vendasMes) {
      if (v.status_ixc !== 'A' || !v.status_atualizado_em || !v.created_at) continue
      const daysDiff = Math.round(
        (new Date(v.status_atualizado_em).getTime() - new Date(v.created_at).getTime()) / 86400000
      )
      if (daysDiff < 0) continue // sanity check — rejeita dados inconsistentes
      const vend = v.vendedor as { id: string; nome: string } | null
      if (!vend) continue
      const entry = velMap.get(vend.id) ?? { nome: vend.nome, dias: [], id: vend.id }
      entry.dias.push(daysDiff)
      velMap.set(vend.id, entry)
      todasDiasVelocidade.push(daysDiff)
    }
    const velocidadeVendedores: VelocidadeVendedor[] = Array.from(velMap.values())
      .filter((e) => e.dias.length > 0)
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        mediaDias: e.dias.reduce((s, d) => s + d, 0) / e.dias.length,
        melhorCaso: Math.min(...e.dias),
        piorCaso: Math.max(...e.dias),
        totalContratos: e.dias.length,
      }))
      .sort((a, b) => a.mediaDias - b.mediaDias)

    const mediaVelocidadeTime = todasDiasVelocidade.length > 0
      ? todasDiasVelocidade.reduce((s, d) => s + d, 0) / todasDiasVelocidade.length
      : 0

    // Agrupar MRR dos últimos 12 meses por mês
    const mrrMap = new Map<string, number>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mrrMap.set(key, 0)
    }
    for (const v of vendasMrr12) {
      if (!v.mes_referencia || !v.ano_referencia) continue
      const key = `${v.ano_referencia}-${String(v.mes_referencia).padStart(2, '0')}`
      if (mrrMap.has(key)) mrrMap.set(key, (mrrMap.get(key) ?? 0) + (v.valor_total ?? 0))
    }
    const mrr12Meses = Array.from(mrrMap.entries()).map(([key, valor]) => {
      const [ano, mes] = key.split('-')
      const label = new Date(Number(ano), Number(mes) - 1, 1).toLocaleString('pt-BR', { month: 'short' })
      return { mes: label, valor }
    })

    // Agrupar MRR potencial (AA/P) dos últimos 12 meses por mês
    const mrrPotencialMap = new Map<string, number>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mrrPotencialMap.set(key, 0)
    }
    for (const v of vendasMrrPotencial12) {
      if (!v.mes_referencia || !v.ano_referencia) continue
      const key = `${v.ano_referencia}-${String(v.mes_referencia).padStart(2, '0')}`
      if (mrrPotencialMap.has(key)) mrrPotencialMap.set(key, (mrrPotencialMap.get(key) ?? 0) + (v.valor_total ?? 0))
    }
    const mrrPotencial12Meses = Array.from(mrrPotencialMap.entries()).map(([key, valor]) => {
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
      mrrPotencial12Meses,
      planosMes,
      churn,
      velocidadeVendedores,
      mediaVelocidadeTime,
      loading: false,
    })
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...stats, refetch: fetch }
}
