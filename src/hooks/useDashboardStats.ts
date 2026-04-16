import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DIAS_SEMANA } from '@/constants'

export interface DashboardStats {
  // Hoje
  faturamentoHoje: number
  vendasHoje: number

  // Semana
  faturamentoSemana: number
  vendasSemana: number

  // Mês atual
  faturamentoMes: number
  faturamentoSemRecorrencia: number
  vendasMes: number
  vendasUnicasMes: number
  mrrTotal: number
  comissoesMes: number
  ticketMedio: number
  cancelamentosMes: number
  turnOverPct: number

  // Histórico
  faturamento12Meses: { mes: string; valor: number }[]
  vendasPorDiaSemana: { dia: string; qtd: number }[]
  faturamentoPorDiaMes: { dia: string; valor: number }[]
  mrrPorDiaMes: { dia: string; valor: number }[]

  // Status IXC
  countPorStatus: { A: number; AA: number; CM: number; FA: number; CN: number; N: number }
  faturamentoAtivos: number
  faturamentoAguardando: number
  alertasAA: AlertaAA[]

  // Últimas vendas
  ultimasVendas: UltimaVenda[]
}

export interface AlertaAA {
  id: string
  cliente_nome: string
  dias_em_aa: number | null
  vendedor: { nome: string } | null
  codigo_contrato_ixc: string | null
}

export interface UltimaVenda {
  id: string
  cliente_nome: string
  cliente_uf: string | null
  valor_total: number | null
  data_venda: string
  status: { nome: string } | null
  vendedor: { nome: string } | null
}

const EMPTY_STATS: DashboardStats = {
  faturamentoHoje: 0,
  vendasHoje: 0,
  faturamentoSemana: 0,
  vendasSemana: 0,
  faturamentoMes: 0,
  faturamentoSemRecorrencia: 0,
  vendasMes: 0,
  vendasUnicasMes: 0,
  mrrTotal: 0,
  comissoesMes: 0,
  ticketMedio: 0,
  cancelamentosMes: 0,
  turnOverPct: 0,
  faturamento12Meses: [],
  vendasPorDiaSemana: [],
  faturamentoPorDiaMes: [],
  mrrPorDiaMes: [],
  countPorStatus: { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 },
  faturamentoAtivos: 0,
  faturamentoAguardando: 0,
  alertasAA: [],
  ultimasVendas: [],
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)

    const now = new Date()
    const anoAtual = now.getFullYear()
    const mesAtual = now.getMonth() + 1
    const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
    const hoje = now.toISOString().slice(0, 10)

    // Início da semana (domingo)
    const dayOfWeek = now.getDay()
    const inicioSemana = new Date(now)
    inicioSemana.setDate(now.getDate() - dayOfWeek)
    const inicioSemanaStr = inicioSemana.toISOString().slice(0, 10)

    const [vendasMesRes, vendasSemanaRes, cancelamentosRes, ultimasRes, vendasHistoricoRes] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, cliente_nome, valor_total, comissao_valor, mrr, data_venda, status_ixc, dias_em_aa, codigo_contrato_ixc, vendedor:vendedores(nome)')
        .gte('data_venda', inicioMes),
      supabase
        .from('vendas')
        .select('id, valor_total, data_venda')
        .gte('data_venda', inicioSemanaStr),
      supabase
        .from('cancelamentos')
        .select('id')
        .gte('data_cancel', inicioMes),
      supabase
        .from('vendas')
        .select('id, cliente_nome, cliente_uf, valor_total, data_venda, status:status_venda(nome), vendedor:vendedores(nome)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('vendas')
        .select('data_venda, valor_total'),
    ])

    const vendasMes = vendasMesRes.data ?? []
    const vendasSemanaData = vendasSemanaRes.data ?? []
    const cancelamentosMes = cancelamentosRes.data?.length ?? 0

    // Hoje
    const vendasHojeArr = vendasSemanaData.filter((v) => v.data_venda === hoje)
    const faturamentoHoje = vendasHojeArr.reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const vendasHoje = vendasHojeArr.length

    // Semana
    const faturamentoSemana = vendasSemanaData.reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const vendasSemana = vendasSemanaData.length

    // Mês
    const faturamentoMes = vendasMes.reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const comissoesMes = vendasMes.reduce((s, v) => s + (v.comissao_valor ?? 0), 0)
    const vendasUnicasMes = vendasMes.filter((v) => !v.mrr).length
    const vendasMrrMes = vendasMes.filter((v) => v.mrr).reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const faturamentoSemRecorrencia = faturamentoMes - vendasMrrMes

    // MRR: soma das vendas recorrentes do mês atual
    const mrrTotal = vendasMrrMes
    const ticketMedio = vendasMes.length > 0 ? faturamentoMes / vendasMes.length : 0
    const turnOverPct = vendasMes.length > 0 ? (cancelamentosMes / vendasMes.length) * 100 : 0

    // Status IXC
    const countPorStatus = { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 }
    let faturamentoAtivos = 0
    let faturamentoAguardando = 0
    for (const v of vendasMes) {
      const code = ((v as { status_ixc?: string | null }).status_ixc ?? '') as keyof typeof countPorStatus
      if (code in countPorStatus) countPorStatus[code]++
      if (code === 'A') faturamentoAtivos += v.valor_total ?? 0
      if (code === 'AA') faturamentoAguardando += v.valor_total ?? 0
    }
    const alertasAA = (vendasMes as AlertaAA[])
      .filter((v) => (v as { status_ixc?: string | null }).status_ixc === 'AA' && ((v as { dias_em_aa?: number | null }).dias_em_aa ?? 0) > 7)
      .sort((a, b) => (b.dias_em_aa ?? 0) - (a.dias_em_aa ?? 0))
      .slice(0, 5)

    const vendasHistorico = vendasHistoricoRes.data ?? []

    const faturamento12Meses = buildMonthsArray(vendasHistorico)
    const vendasPorDiaSemana = buildWeekArray(vendasSemanaData)
    const faturamentoPorDiaMes = buildDailyArray(vendasMes, anoAtual, mesAtual)
    const mrrPorDiaMes = buildDailyArray(vendasMes.filter((v) => v.mrr), anoAtual, mesAtual)

    setStats({
      faturamentoHoje,
      vendasHoje,
      faturamentoSemana,
      vendasSemana,
      faturamentoMes,
      faturamentoSemRecorrencia,
      vendasMes: vendasMes.length,
      vendasUnicasMes,
      mrrTotal,
      comissoesMes,
      ticketMedio,
      cancelamentosMes,
      turnOverPct,
      faturamento12Meses,
      vendasPorDiaSemana,
      faturamentoPorDiaMes,
      mrrPorDiaMes,
      countPorStatus,
      faturamentoAtivos,
      faturamentoAguardando,
      alertasAA,
      ultimasVendas: (ultimasRes.data ?? []) as UltimaVenda[],
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, refetch: fetch }
}

function buildMonthsArray(vendas: { data_venda: string; valor_total: number | null }[]) {
  if (vendas.length === 0) return []

  const now = new Date()

  // Encontra o mês mais antigo com dado
  const earliest = vendas.map((v) => v.data_venda.slice(0, 7)).sort()[0]

  const map = new Map<string, number>()
  const [sy, sm] = earliest.split('-').map(Number)
  const cursor = new Date(sy, sm - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    map.set(key, 0)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  for (const v of vendas) {
    const key = v.data_venda.slice(0, 7)
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + (v.valor_total ?? 0))
  }

  return Array.from(map.entries()).map(([mes, valor]) => {
    const [y, m] = mes.split('-')
    return { mes: `${m}/${y.slice(2)}`, valor }
  })
}

function buildWeekArray(vendas: { data_venda: string }[]) {
  const counts = new Array(7).fill(0)
  for (const v of vendas) {
    const day = new Date(v.data_venda + 'T12:00:00').getDay()
    counts[day]++
  }
  return DIAS_SEMANA.map((dia, i) => ({ dia, qtd: counts[i] }))
}

function buildDailyArray(
  vendas: { data_venda: string; valor_total: number | null }[],
  ano: number,
  mes: number,
) {
  const today = new Date()
  const todayDay = today.getDate()
  const daysInMonth = new Date(ano, mes, 0).getDate()
  const limit = Math.min(daysInMonth, todayDay)

  const map = new Map<number, number>()
  for (let d = 1; d <= limit; d++) map.set(d, 0)

  for (const v of vendas) {
    const day = parseInt(v.data_venda.slice(8, 10))
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + (v.valor_total ?? 0))
  }

  return Array.from(map.entries()).map(([dia, valor]) => ({ dia: String(dia), valor }))
}
