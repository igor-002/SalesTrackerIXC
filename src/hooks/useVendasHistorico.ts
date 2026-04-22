/**
 * Hook de dados históricos de vendedores — Fase 7.
 * Lê dados da tabela `vendas_historico` e combina com dados atuais
 * para gerar evolução de 6 meses (3 passados + atual + 2 projeção).
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useRelatoriosMes, calcKpis } from '@/hooks/useRelatoriosIxc'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface VendaHistorico {
  id: string
  vendedor_id: string
  ixc_vendedor_id: string | null
  cliente_nome: string
  plano: string | null
  valor_unitario: number
  mes_referencia: number
  ano_referencia: number
  data_ativacao: string | null
  vendedor: { id: string; nome: string } | null
}

export interface HistoricoMesVendedor {
  mes: number
  ano: number
  mesLabel: string
  vendedor_id: string
  vendedor_nome: string
  total_contratos: number
  valor_total: number
}

export interface Evolucao6MesesRow {
  mesLabel: string
  mes: number
  ano: number
  tipo: 'real' | 'atual' | 'projecao'
  total_contratos: number
  valor_total: number
}

export interface Evolucao6MesesVendedor {
  vendedor_id: string
  vendedor_nome: string
  meses: Evolucao6MesesRow[]
}

export interface Evolucao6MesesResult {
  porVendedor: Evolucao6MesesVendedor[]
  totalTime: Evolucao6MesesRow[]
  loading: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MESES_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function mesLabel(mes: number, ano: number): string {
  return `${MESES_LABELS[mes - 1]}/${String(ano).slice(2)}`
}

function getMesesAnteriores(n: number): { mes: number; ano: number }[] {
  const now = new Date()
  const result: { mes: number; ano: number }[] = []
  for (let i = n; i >= 1; i--) {
    let m = now.getMonth() + 1 - i
    let a = now.getFullYear()
    while (m <= 0) { m += 12; a-- }
    result.push({ mes: m, ano: a })
  }
  return result
}

function getMesesFuturos(n: number): { mes: number; ano: number }[] {
  const now = new Date()
  const result: { mes: number; ano: number }[] = []
  for (let i = 1; i <= n; i++) {
    let m = now.getMonth() + 1 + i
    let a = now.getFullYear()
    while (m > 12) { m -= 12; a++ }
    result.push({ mes: m, ano: a })
  }
  return result
}

// ── Hook principal — dados históricos ────────────────────────────────────────

export function useVendasHistorico() {
  return useQuery({
    queryKey: ['vendas-historico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas_historico')
        .select('id, vendedor_id, ixc_vendedor_id, cliente_nome, plano, valor_unitario, mes_referencia, ano_referencia, data_ativacao, vendedor:vendedores(id, nome)')
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })

      if (error) throw error
      return (data ?? []) as VendaHistorico[]
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 35 * 60 * 1000,
  })
}

// ── Hook de agrupamento por mês/vendedor ─────────────────────────────────────

export function useHistoricoAgrupado() {
  const { data: historico = [], isLoading } = useVendasHistorico()

  const agrupado = useMemo(() => {
    const map = new Map<string, HistoricoMesVendedor>()

    for (const h of historico) {
      const key = `${h.vendedor_id}-${h.mes_referencia}-${h.ano_referencia}`
      const existing = map.get(key)

      if (existing) {
        existing.total_contratos++
        existing.valor_total += h.valor_unitario ?? 0
      } else {
        map.set(key, {
          mes: h.mes_referencia,
          ano: h.ano_referencia,
          mesLabel: mesLabel(h.mes_referencia, h.ano_referencia),
          vendedor_id: h.vendedor_id,
          vendedor_nome: h.vendedor?.nome ?? 'Vendedor',
          total_contratos: 1,
          valor_total: h.valor_unitario ?? 0,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.ano !== b.ano) return b.ano - a.ano
      return b.mes - a.mes
    })
  }, [historico])

  return { agrupado, loading: isLoading }
}

// ── Hook de evolução 6 meses ─────────────────────────────────────────────────

export function useEvolucao6Meses(vendedorIdFiltro?: string | null): Evolucao6MesesResult {
  const { data: historico = [], isLoading: loadingHistorico } = useVendasHistorico()

  const now = new Date()
  const mesAtual = now.getMonth() + 1
  const anoAtual = now.getFullYear()

  const { data: vendasMesAtual = [], isLoading: loadingAtual } = useRelatoriosMes(mesAtual, anoAtual, vendedorIdFiltro ?? null)

  const result = useMemo(() => {
    const meses3anteriores = getMesesAnteriores(3)
    const meses2futuros = getMesesFuturos(2)

    // Agrupar histórico por vendedor+mês
    const historicoMap = new Map<string, { total: number; valor: number; nome: string }>()
    for (const h of historico) {
      if (vendedorIdFiltro && h.vendedor_id !== vendedorIdFiltro) continue
      const key = `${h.vendedor_id}-${h.mes_referencia}-${h.ano_referencia}`
      const existing = historicoMap.get(key)
      if (existing) {
        existing.total++
        existing.valor += h.valor_unitario ?? 0
      } else {
        historicoMap.set(key, {
          total: 1,
          valor: h.valor_unitario ?? 0,
          nome: h.vendedor?.nome ?? 'Vendedor',
        })
      }
    }

    // Dados do mês atual
    const kpisAtual = calcKpis(vendasMesAtual)
    const valorAtual = vendasMesAtual
      .filter(c => c.status_ixc === 'A')
      .reduce((s, c) => s + (c.valor_total ?? 0), 0)

    // Calcular médias para projeção
    let somaContratos = 0
    let somaValor = 0
    let countMeses = 0

    for (const mesRef of meses3anteriores) {
      for (const [key, data] of historicoMap.entries()) {
        if (key.endsWith(`-${mesRef.mes}-${mesRef.ano}`)) {
          somaContratos += data.total
          somaValor += data.valor
        }
      }
      countMeses++
    }

    const mediaContratos = countMeses > 0 ? Math.round(somaContratos / countMeses) : 0
    const mediaValor = countMeses > 0 ? somaValor / countMeses : 0

    // Montar array de 6 meses para o total do time
    const totalTime: Evolucao6MesesRow[] = []

    // Meses anteriores (real)
    for (const mesRef of meses3anteriores) {
      let totalContratos = 0
      let valorTotal = 0
      for (const [key, data] of historicoMap.entries()) {
        if (key.endsWith(`-${mesRef.mes}-${mesRef.ano}`)) {
          totalContratos += data.total
          valorTotal += data.valor
        }
      }
      totalTime.push({
        mesLabel: mesLabel(mesRef.mes, mesRef.ano),
        mes: mesRef.mes,
        ano: mesRef.ano,
        tipo: 'real',
        total_contratos: totalContratos,
        valor_total: valorTotal,
      })
    }

    // Mês atual
    totalTime.push({
      mesLabel: mesLabel(mesAtual, anoAtual),
      mes: mesAtual,
      ano: anoAtual,
      tipo: 'atual',
      total_contratos: kpisAtual.ativos,
      valor_total: valorAtual,
    })

    // Meses futuros (projeção)
    for (const mesRef of meses2futuros) {
      totalTime.push({
        mesLabel: mesLabel(mesRef.mes, mesRef.ano),
        mes: mesRef.mes,
        ano: mesRef.ano,
        tipo: 'projecao',
        total_contratos: mediaContratos,
        valor_total: mediaValor,
      })
    }

    // Agrupar por vendedor (para tabela detalhada)
    const vendedoresSet = new Set<string>()
    for (const h of historico) {
      if (!vendedorIdFiltro || h.vendedor_id === vendedorIdFiltro) {
        vendedoresSet.add(h.vendedor_id)
      }
    }

    const porVendedor: Evolucao6MesesVendedor[] = []
    for (const vendedorId of vendedoresSet) {
      const vendedorNome = historico.find(h => h.vendedor_id === vendedorId)?.vendedor?.nome ?? 'Vendedor'
      const meses: Evolucao6MesesRow[] = []

      // Meses anteriores
      for (const mesRef of meses3anteriores) {
        const key = `${vendedorId}-${mesRef.mes}-${mesRef.ano}`
        const data = historicoMap.get(key)
        meses.push({
          mesLabel: mesLabel(mesRef.mes, mesRef.ano),
          mes: mesRef.mes,
          ano: mesRef.ano,
          tipo: 'real',
          total_contratos: data?.total ?? 0,
          valor_total: data?.valor ?? 0,
        })
      }

      // Mês atual (do vendedor)
      const contratosVendedorAtual = vendasMesAtual.filter(c => c.vendedor?.id === vendedorId && c.status_ixc === 'A')
      const valorVendedorAtual = contratosVendedorAtual.reduce((s, c) => s + (c.valor_total ?? 0), 0)
      meses.push({
        mesLabel: mesLabel(mesAtual, anoAtual),
        mes: mesAtual,
        ano: anoAtual,
        tipo: 'atual',
        total_contratos: contratosVendedorAtual.length,
        valor_total: valorVendedorAtual,
      })

      // Projeção do vendedor (média dos 3 meses anteriores dele)
      const mesesVendedor = meses.filter(m => m.tipo === 'real')
      const mediaVendedorContratos = mesesVendedor.length > 0
        ? Math.round(mesesVendedor.reduce((s, m) => s + m.total_contratos, 0) / mesesVendedor.length)
        : 0
      const mediaVendedorValor = mesesVendedor.length > 0
        ? mesesVendedor.reduce((s, m) => s + m.valor_total, 0) / mesesVendedor.length
        : 0

      for (const mesRef of meses2futuros) {
        meses.push({
          mesLabel: mesLabel(mesRef.mes, mesRef.ano),
          mes: mesRef.mes,
          ano: mesRef.ano,
          tipo: 'projecao',
          total_contratos: mediaVendedorContratos,
          valor_total: mediaVendedorValor,
        })
      }

      porVendedor.push({ vendedor_id: vendedorId, vendedor_nome: vendedorNome, meses })
    }

    return { porVendedor, totalTime }
  }, [historico, vendasMesAtual, vendedorIdFiltro, mesAtual, anoAtual])

  return {
    ...result,
    loading: loadingHistorico || loadingAtual,
  }
}
