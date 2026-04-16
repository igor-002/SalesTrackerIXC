import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type PeriodoKey = 'semana' | 'mes' | 'trimestre' | 'ano' | 'custom'

export const STATUS_LABELS: Record<string, string> = {
  A:  'Ativo',
  AA: 'Aguardando Assinatura',
  CM: 'Bloqueado Manual',
  FA: 'Financeiro em Atraso',
  CN: 'Cancelado',
  N:  'Novo',
}

export const STATUS_COLORS: Record<string, string> = {
  A:  '#00d68f',
  AA: '#06b6d4',
  CM: '#f59e0b',
  FA: '#f97316',
  CN: '#ef4444',
  N:  '#6b7280',
}

export function getPeriodDates(
  periodo: PeriodoKey,
  customInicio?: string,
  customFim?: string,
): { inicio: string; fim: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  switch (periodo) {
    case 'semana': {
      const dow = now.getDay()
      const start = new Date(now)
      start.setDate(now.getDate() - dow)
      return { inicio: start.toISOString().slice(0, 10), fim: today }
    }
    case 'mes':
      return {
        inicio: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        fim: today,
      }
    case 'trimestre': {
      const start = new Date(now)
      start.setMonth(now.getMonth() - 2)
      start.setDate(1)
      return { inicio: start.toISOString().slice(0, 10), fim: today }
    }
    case 'ano':
      return { inicio: `${now.getFullYear()}-01-01`, fim: today }
    case 'custom':
      return { inicio: customInicio ?? today, fim: customFim ?? today }
  }
}

export interface VendedorStat {
  id: string
  nome: string
  cadastrados: number
  ativos: number
  cancelados: number
  aguardando: number
  taxaConversao: number
  ticketMedio: number
  tempoMedioAtivacao: number
  faturamentoReal: number
}

export interface VendaRelatorio {
  id: string
  cliente_nome: string
  vendedor: { id: string; nome: string } | null
  valor_total: number | null
  status_ixc: string | null
  mrr: boolean | null
  dias_em_aa: number | null
  data_venda: string
  status_atualizado_em: string | null
  codigo_contrato_ixc: string | null
}

export interface RelatorioData {
  faturamentoReal: number
  faturamentoPrometido: number
  mrrReal: number
  taxaConversao: number
  ticketMedio: number
  tempoMedioAtivacao: number
  countPorStatus: Record<string, number>
  byVendedor: VendedorStat[]
  evolucaoFaturamento: { data: string; valor: number }[]
  vendasRaw: VendaRelatorio[]
}

const EMPTY: RelatorioData = {
  faturamentoReal: 0,
  faturamentoPrometido: 0,
  mrrReal: 0,
  taxaConversao: 0,
  ticketMedio: 0,
  tempoMedioAtivacao: 0,
  countPorStatus: { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 },
  byVendedor: [],
  evolucaoFaturamento: [],
  vendasRaw: [],
}

export function useRelatorios(inicio: string, fim: string, vendedorId: string | null) {
  const [data, setData] = useState<RelatorioData>(EMPTY)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('vendas')
      .select(
        'id, cliente_nome, valor_total, status_ixc, mrr, dias_em_aa, data_venda, status_atualizado_em, codigo_contrato_ixc, vendedor:vendedores(id, nome)',
      )
      .gte('data_venda', inicio)
      .lte('data_venda', fim)
      .order('data_venda', { ascending: true })

    if (vendedorId) query = query.eq('vendedor_id', vendedorId)

    const { data: rows } = await query
    const vendas = (rows ?? []) as VendaRelatorio[]

    // ── KPIs globais ────────────────────────────────────────────────────────
    const ativos      = vendas.filter(v => v.status_ixc === 'A')
    const aguardando  = vendas.filter(v => v.status_ixc === 'AA')

    const faturamentoReal      = ativos.reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const faturamentoPrometido = aguardando.reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const mrrReal              = ativos.filter(v => v.mrr).reduce((s, v) => s + (v.valor_total ?? 0), 0)
    const taxaConversao        = ativos.length + aguardando.length > 0
      ? (ativos.length / (ativos.length + aguardando.length)) * 100
      : 0
    const ticketMedio = ativos.length > 0 ? faturamentoReal / ativos.length : 0

    // Tempo médio de ativação: para contratos Ativos, dias de data_venda → status_atualizado_em
    const activationDays = ativos
      .filter(v => v.status_atualizado_em)
      .map(v =>
        Math.max(0, Math.floor((new Date(v.status_atualizado_em!).getTime() - new Date(v.data_venda).getTime()) / 86_400_000)),
      )
    const tempoMedioAtivacao = activationDays.length > 0
      ? activationDays.reduce((s, d) => s + d, 0) / activationDays.length
      : 0

    // ── Contagem por status ─────────────────────────────────────────────────
    const countPorStatus: Record<string, number> = { A: 0, AA: 0, CM: 0, FA: 0, CN: 0, N: 0 }
    for (const v of vendas) {
      const s = v.status_ixc ?? 'N'
      countPorStatus[s] = (countPorStatus[s] ?? 0) + 1
    }

    // ── Tabela por vendedor ─────────────────────────────────────────────────
    const vMap = new Map<string, { nome: string; vv: VendaRelatorio[] }>()
    for (const v of vendas) {
      const vid   = v.vendedor?.id ?? '__none__'
      const vnome = v.vendedor?.nome ?? 'Sem vendedor'
      if (!vMap.has(vid)) vMap.set(vid, { nome: vnome, vv: [] })
      vMap.get(vid)!.vv.push(v)
    }

    const byVendedor: VendedorStat[] = Array.from(vMap.entries()).map(([id, { nome, vv }]) => {
      const vA  = vv.filter(v => v.status_ixc === 'A')
      const vAA = vv.filter(v => v.status_ixc === 'AA')
      const vCN = vv.filter(v => v.status_ixc === 'CN')
      const fat = vA.reduce((s, v) => s + (v.valor_total ?? 0), 0)
      const taxa = vA.length + vAA.length > 0 ? (vA.length / (vA.length + vAA.length)) * 100 : 0
      const ticket = vA.length > 0 ? fat / vA.length : 0
      const actDays = vA
        .filter(v => v.status_atualizado_em)
        .map(v => Math.max(0, Math.floor((new Date(v.status_atualizado_em!).getTime() - new Date(v.data_venda).getTime()) / 86_400_000)))
      const tempo = actDays.length > 0 ? actDays.reduce((s, d) => s + d, 0) / actDays.length : 0
      return {
        id, nome,
        cadastrados: vv.length,
        ativos: vA.length,
        cancelados: vCN.length,
        aguardando: vAA.length,
        taxaConversao: taxa,
        ticketMedio: ticket,
        tempoMedioAtivacao: tempo,
        faturamentoReal: fat,
      }
    }).sort((a, b) => b.faturamentoReal - a.faturamentoReal)

    // ── Evolução do faturamento real (diária/semanal) ───────────────────────
    const diffDays = Math.ceil((new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000)
    let evolucaoFaturamento: { data: string; valor: number }[]

    if (diffDays > 90) {
      // Agrupar por semana ISO (YYYY-Www)
      const weekMap = new Map<string, number>()
      for (const v of ativos) {
        const d = new Date(v.data_venda + 'T12:00:00')
        const wk = getISOWeekLabel(d)
        weekMap.set(wk, (weekMap.get(wk) ?? 0) + (v.valor_total ?? 0))
      }
      evolucaoFaturamento = Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([data, valor]) => ({ data, valor }))
    } else {
      // Diário
      const dayMap = new Map<string, number>()
      const cursor = new Date(inicio + 'T12:00:00')
      const endDate = new Date(fim + 'T12:00:00')
      while (cursor <= endDate) {
        dayMap.set(cursor.toISOString().slice(0, 10), 0)
        cursor.setDate(cursor.getDate() + 1)
      }
      for (const v of ativos) {
        const d = v.data_venda
        if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) ?? 0) + (v.valor_total ?? 0))
      }
      evolucaoFaturamento = Array.from(dayMap.entries()).map(([data, valor]) => ({ data, valor }))
    }

    setData({
      faturamentoReal,
      faturamentoPrometido,
      mrrReal,
      taxaConversao,
      ticketMedio,
      tempoMedioAtivacao,
      countPorStatus,
      byVendedor,
      evolucaoFaturamento,
      vendasRaw: vendas,
    })
    setLoading(false)
  }, [inicio, fim, vendedorId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

function getISOWeekLabel(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-S${String(week).padStart(2, '0')}`
}
