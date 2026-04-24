/**
 * Hook para o redesign da página de Relatórios — gráficos evolutivos e funil.
 * Busca dados dos últimos 3 meses disponíveis para análise evolutiva.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ContratoRedesign {
  id: string
  cliente_nome: string
  valor_unitario: number
  valor_total: number | null
  status_ixc: string | null
  vendedor_id: string | null
  vendedor: { id: string; nome: string } | null
  mes_referencia: number | null
  ano_referencia: number | null
  dias_aguardando: number | null
  created_at: string | null
  status_atualizado_em: string | null
}

export interface EvolucaoMes {
  mesLabel: string
  mes: number
  ano: number
  cadastrados: number
  ativos: number
  aguardando: number
  mrr: number
}

export interface FunilVendas {
  cadastrados: number
  ativos: number
  aguardando: number
  cancelados: number
  taxaConversao: number
  taxaPerda: number
  tempoMedioAtivacao: number | null
}

export interface VendedorDistribuicao {
  vendedor_id: string
  nome: string
  ativos: number
  mrr: number
}

export interface MrrTendencia {
  mesLabel: string
  mes: number
  ano: number
  mrrTotal: number
  porVendedor: { vendedor_id: string; nome: string; mrr: number }[]
}

export interface PerformanceVendedor {
  vendedor_id: string
  nome: string
  cadastrados: number
  ativos: number
  aguardando: number
  cancelados: number
  mrrTotal: number
  ticketMedio: number
  taxaConversao: number
  tempoMedioAtivacao: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MESES_LABELS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function mesLabel(mes: number, ano: number): string {
  return `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`
}

function mesLabelCompleto(mes: number): string {
  return MESES_LABELS[mes - 1]
}

function getUltimos3Meses(): { mes: number; ano: number }[] {
  const now = new Date()
  const result: { mes: number; ano: number }[] = []
  for (let i = 2; i >= 0; i--) {
    let m = now.getMonth() + 1 - i
    let a = now.getFullYear()
    while (m <= 0) { m += 12; a-- }
    result.push({ mes: m, ano: a })
  }
  return result
}

// ── Hook principal ───────────────────────────────────────────────────────────

export function useRelatoriosRedesign(vendedorIdFiltro: string | null) {
  const meses3 = useMemo(() => getUltimos3Meses(), [])

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ['relatorios-redesign', meses3, vendedorIdFiltro],
    queryFn: async () => {
      const primeiroMes = meses3[0]
      const ultimoMes = meses3[meses3.length - 1]

      let query = supabase
        .from('vendas')
        .select('id, cliente_nome, valor_unitario, valor_total, status_ixc, vendedor_id, mes_referencia, ano_referencia, dias_aguardando, created_at, status_atualizado_em, vendedor:vendedores(id, nome)')
        .or(`and(mes_referencia.eq.${primeiroMes.mes},ano_referencia.eq.${primeiroMes.ano}),and(mes_referencia.eq.${meses3[1].mes},ano_referencia.eq.${meses3[1].ano}),and(mes_referencia.eq.${ultimoMes.mes},ano_referencia.eq.${ultimoMes.ano})`)
        .order('mes_referencia', { ascending: true })
        .order('ano_referencia', { ascending: true })

      if (vendedorIdFiltro) {
        query = query.eq('vendedor_id', vendedorIdFiltro)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as ContratoRedesign[]
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 35 * 60 * 1000,
  })

  // ── Evolução 3 meses ─────────────────────────────────────────────────────────
  const evolucao3Meses = useMemo((): EvolucaoMes[] => {
    return meses3.map(({ mes, ano }) => {
      const doMes = contratos.filter(c => c.mes_referencia === mes && c.ano_referencia === ano)
      const ativos = doMes.filter(c => c.status_ixc === 'A')
      const aguardando = doMes.filter(c => c.status_ixc === 'AA' || c.status_ixc === 'P')
      const mrr = ativos.reduce((s, c) => s + (c.valor_unitario ?? 0), 0)

      return {
        mesLabel: mesLabel(mes, ano),
        mes,
        ano,
        cadastrados: doMes.length,
        ativos: ativos.length,
        aguardando: aguardando.length,
        mrr,
      }
    })
  }, [contratos, meses3])

  // ── Funil de vendas (período filtrado ou todos) ──────────────────────────────
  const funil = useMemo((): FunilVendas => {
    const cadastrados = contratos.length
    const ativos = contratos.filter(c => c.status_ixc === 'A')
    const aguardando = contratos.filter(c => c.status_ixc === 'AA' || c.status_ixc === 'P')
    const cancelados = contratos.filter(c => c.status_ixc === 'C' || c.status_ixc === 'CN')

    const taxaConversao = cadastrados > 0 ? (ativos.length / cadastrados) * 100 : 0
    const taxaPerda = cadastrados > 0 ? (cancelados.length / cadastrados) * 100 : 0

    const temposAtivacao = ativos
      .filter(c => c.status_atualizado_em && c.created_at)
      .map(c => Math.round(
        (new Date(c.status_atualizado_em!).getTime() - new Date(c.created_at!).getTime()) / 86400000
      ))
      .filter(d => d >= 0)

    const tempoMedioAtivacao = temposAtivacao.length > 0
      ? temposAtivacao.reduce((s, d) => s + d, 0) / temposAtivacao.length
      : null

    return {
      cadastrados,
      ativos: ativos.length,
      aguardando: aguardando.length,
      cancelados: cancelados.length,
      taxaConversao,
      taxaPerda,
      tempoMedioAtivacao,
    }
  }, [contratos])

  // ── Distribuição por vendedor ────────────────────────────────────────────────
  const distribuicaoVendedor = useMemo((): VendedorDistribuicao[] => {
    const map = new Map<string, { nome: string; ativos: number; mrr: number }>()

    for (const c of contratos) {
      if (c.status_ixc !== 'A') continue
      const vid = c.vendedor_id ?? '__sem_vendedor__'
      const nome = c.vendedor?.nome ?? 'Sem vendedor'
      const existing = map.get(vid) ?? { nome, ativos: 0, mrr: 0 }
      existing.ativos++
      existing.mrr += c.valor_unitario ?? 0
      map.set(vid, existing)
    }

    return Array.from(map.entries())
      .map(([vendedor_id, data]) => ({ vendedor_id, ...data }))
      .sort((a, b) => b.ativos - a.ativos)
  }, [contratos])

  // ── MRR Tendência por mês ────────────────────────────────────────────────────
  const mrrTendencia = useMemo((): MrrTendencia[] => {
    return meses3.map(({ mes, ano }) => {
      const doMes = contratos.filter(c => c.mes_referencia === mes && c.ano_referencia === ano && c.status_ixc === 'A')
      const mrrTotal = doMes.reduce((s, c) => s + (c.valor_unitario ?? 0), 0)

      const porVendedorMap = new Map<string, { nome: string; mrr: number }>()
      for (const c of doMes) {
        const vid = c.vendedor_id ?? '__sem_vendedor__'
        const nome = c.vendedor?.nome ?? 'Sem vendedor'
        const existing = porVendedorMap.get(vid) ?? { nome, mrr: 0 }
        existing.mrr += c.valor_unitario ?? 0
        porVendedorMap.set(vid, existing)
      }

      const porVendedor = Array.from(porVendedorMap.entries())
        .map(([vendedor_id, data]) => ({ vendedor_id, ...data }))
        .sort((a, b) => b.mrr - a.mrr)

      return { mesLabel: mesLabel(mes, ano), mes, ano, mrrTotal, porVendedor }
    })
  }, [contratos, meses3])

  // ── Performance por vendedor ─────────────────────────────────────────────────
  const performanceVendedor = useMemo((): PerformanceVendedor[] => {
    const map = new Map<string, {
      nome: string
      cadastrados: number
      ativos: number
      aguardando: number
      cancelados: number
      mrrTotal: number
      temposAtivacao: number[]
    }>()

    for (const c of contratos) {
      const vid = c.vendedor_id ?? '__sem_vendedor__'
      const nome = c.vendedor?.nome ?? 'Sem vendedor'
      const existing = map.get(vid) ?? {
        nome,
        cadastrados: 0,
        ativos: 0,
        aguardando: 0,
        cancelados: 0,
        mrrTotal: 0,
        temposAtivacao: [],
      }

      existing.cadastrados++
      if (c.status_ixc === 'A') {
        existing.ativos++
        existing.mrrTotal += c.valor_unitario ?? 0
        if (c.status_atualizado_em && c.created_at) {
          const dias = Math.round(
            (new Date(c.status_atualizado_em).getTime() - new Date(c.created_at).getTime()) / 86400000
          )
          if (dias >= 0) existing.temposAtivacao.push(dias)
        }
      }
      if (c.status_ixc === 'AA' || c.status_ixc === 'P') existing.aguardando++
      if (c.status_ixc === 'C' || c.status_ixc === 'CN') existing.cancelados++

      map.set(vid, existing)
    }

    return Array.from(map.entries())
      .map(([vendedor_id, data]) => ({
        vendedor_id,
        nome: data.nome,
        cadastrados: data.cadastrados,
        ativos: data.ativos,
        aguardando: data.aguardando,
        cancelados: data.cancelados,
        mrrTotal: data.mrrTotal,
        ticketMedio: data.ativos > 0 ? data.mrrTotal / data.ativos : 0,
        taxaConversao: data.cadastrados > 0 ? (data.ativos / data.cadastrados) * 100 : 0,
        tempoMedioAtivacao: data.temposAtivacao.length > 0
          ? data.temposAtivacao.reduce((s, d) => s + d, 0) / data.temposAtivacao.length
          : null,
      }))
      .sort((a, b) => b.ativos - a.ativos)
  }, [contratos])

  // ── KPIs gerais ──────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const ativos = contratos.filter(c => c.status_ixc === 'A')
    const aguardando = contratos.filter(c => c.status_ixc === 'AA' || c.status_ixc === 'P')
    const somaAtivos = ativos.reduce((s, c) => s + (c.valor_unitario ?? 0), 0)
    const ticketMedio = ativos.length > 0 ? somaAtivos / ativos.length : 0
    const taxaConversao = contratos.length > 0 ? (ativos.length / contratos.length) * 100 : 0

    return {
      total: contratos.length,
      ativos: ativos.length,
      aguardando: aguardando.length,
      ticketMedio,
      taxaConversao,
    }
  }, [contratos])

  // ── Totais para tabela ───────────────────────────────────────────────────────
  const totaisTime = useMemo(() => {
    const perf = performanceVendedor
    return {
      cadastrados: perf.reduce((s, p) => s + p.cadastrados, 0),
      ativos: perf.reduce((s, p) => s + p.ativos, 0),
      aguardando: perf.reduce((s, p) => s + p.aguardando, 0),
      cancelados: perf.reduce((s, p) => s + p.cancelados, 0),
      mrrTotal: perf.reduce((s, p) => s + p.mrrTotal, 0),
      ticketMedio: kpis.ticketMedio,
      taxaConversao: kpis.taxaConversao,
    }
  }, [performanceVendedor, kpis])

  return {
    loading: isLoading,
    meses3,
    contratos,
    evolucao3Meses,
    funil,
    distribuicaoVendedor,
    mrrTendencia,
    performanceVendedor,
    totaisTime,
    kpis,
    mesLabelCompleto,
  }
}
