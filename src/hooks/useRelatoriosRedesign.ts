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

export interface ProjecaoMes {
  mesLabel: string
  mes: number
  ano: number
  tipo: 'real' | 'projecao'
  cadastrados: number
  ativos: number
  aguardando: number
  mrr: number
  mrrMin?: number
  mrrMax?: number
  ativosMin?: number
  ativosMax?: number
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

function getProximos3Meses(): { mes: number; ano: number }[] {
  const now = new Date()
  const result: { mes: number; ano: number }[] = []
  for (let i = 1; i <= 3; i++) {
    let m = now.getMonth() + 1 + i
    let a = now.getFullYear()
    while (m > 12) { m -= 12; a++ }
    result.push({ mes: m, ano: a })
  }
  return result
}

function calcMediaPonderada(valores: number[], pesos: number[]): number {
  if (valores.length === 0) return 0
  let soma = 0
  let somaPesos = 0
  for (let i = 0; i < valores.length; i++) {
    soma += valores[i] * (pesos[i] ?? 1)
    somaPesos += pesos[i] ?? 1
  }
  return somaPesos > 0 ? soma / somaPesos : 0
}

function calcFatorTendencia(valores: number[]): number {
  if (valores.length < 2) return 0
  const primeiro = valores[0]
  const ultimo = valores[valores.length - 1]
  if (primeiro === 0) return ultimo > 0 ? 0.5 : 0
  return (ultimo - primeiro) / primeiro
}

// ── Hook principal ───────────────────────────────────────────────────────────

export function useRelatoriosRedesign(
  vendedorIdFiltro: string | null,
  periodoCustom?: { mes: number; ano: number } | null
) {
  const meses3 = useMemo(() => getUltimos3Meses(), [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mesesEfetivos = useMemo(() => {
    if (periodoCustom) return [periodoCustom]
    return meses3
  }, [periodoCustom?.mes, periodoCustom?.ano, meses3])

  const isCustom = Boolean(periodoCustom)

  // Stable string key to avoid object-reference issues in queryKey
  const queryKeyPeriodo = mesesEfetivos.map(m => `${m.mes}-${m.ano}`).join(',')

  const { data: resultado = { contratos: [] as ContratoRedesign[], isHistorico: false }, isLoading } = useQuery({
    queryKey: ['relatorios-redesign', queryKeyPeriodo, vendedorIdFiltro],
    queryFn: async () => {
      const orParts = mesesEfetivos
        .map(m => `and(mes_referencia.eq.${m.mes},ano_referencia.eq.${m.ano})`)
        .join(',')

      let q = supabase
        .from('vendas')
        .select('id, cliente_nome, valor_unitario, valor_total, status_ixc, vendedor_id, mes_referencia, ano_referencia, dias_aguardando, created_at, status_atualizado_em, vendedor:vendedores(id, nome)')
        .or(orParts)
        .order('mes_referencia', { ascending: true })
        .order('ano_referencia', { ascending: true })

      if (vendedorIdFiltro) q = q.eq('vendedor_id', vendedorIdFiltro)

      const { data, error } = await q
      if (error) throw error

      let contratos = (data ?? []) as ContratoRedesign[]
      let isHistorico = false

      // Fallback para vendas_historico se mês customizado não tiver dados em vendas
      if (isCustom && contratos.length === 0 && periodoCustom) {
        const { mes, ano } = periodoCustom
        let histQ = supabase
          .from('vendas_historico')
          .select('id, cliente_nome, valor_unitario, status_ixc, vendedor_id, mes_referencia, ano_referencia, vendedor:vendedores(id, nome)')
          .eq('mes_referencia', mes)
          .eq('ano_referencia', ano)

        if (vendedorIdFiltro) histQ = histQ.eq('vendedor_id', vendedorIdFiltro)

        const { data: histData } = await histQ

        if ((histData ?? []).length > 0) {
          isHistorico = true
          contratos = (histData ?? []).map(h => ({
            id: String(h.id),
            cliente_nome: String(h.cliente_nome),
            valor_unitario: Number(h.valor_unitario ?? 0),
            valor_total: Number(h.valor_unitario ?? 0),
            status_ixc: (h.status_ixc as string | null) ?? 'A',
            vendedor_id: h.vendedor_id as string | null,
            vendedor: h.vendedor as { id: string; nome: string } | null,
            mes_referencia: Number(h.mes_referencia),
            ano_referencia: Number(h.ano_referencia),
            dias_aguardando: null,
            created_at: null,
            status_atualizado_em: null,
          }))
        }
      }

      return { contratos, isHistorico }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 35 * 60 * 1000,
  })

  const contratos = resultado.contratos
  const isHistorico = resultado.isHistorico

  // ── Evolução mensal ───────────────────────────────────────────────────────────
  const evolucao3Meses = useMemo((): EvolucaoMes[] => {
    return mesesEfetivos.map(({ mes, ano }) => {
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
  }, [contratos, mesesEfetivos])

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
    return mesesEfetivos.map(({ mes, ano }) => {
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
  }, [contratos, mesesEfetivos])

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

  // ── Projeção 3 meses com média ponderada e tendência ──────────────────────────
  // Em modo custom (mês único) não projeta — apenas 1 ponto não gera tendência útil
  const projecao6Meses = useMemo((): ProjecaoMes[] => {
    if (isCustom) {
      return evolucao3Meses.map(e => ({
        mesLabel: e.mesLabel, mes: e.mes, ano: e.ano,
        tipo: 'real' as const,
        cadastrados: e.cadastrados, ativos: e.ativos,
        aguardando: e.aguardando, mrr: e.mrr,
      }))
    }

    const mesesFuturos = getProximos3Meses()
    const PESOS = [1, 2, 3] // peso 1 para mais antigo, 3 para mais recente

    // Extrair valores dos 3 meses reais
    const cadastradosArr = evolucao3Meses.map(e => e.cadastrados)
    const ativosArr = evolucao3Meses.map(e => e.ativos)
    const aguardandoArr = evolucao3Meses.map(e => e.aguardando)
    const mrrArr = evolucao3Meses.map(e => e.mrr)

    // Médias ponderadas
    const mediaCadastrados = calcMediaPonderada(cadastradosArr, PESOS)
    const mediaAtivos = calcMediaPonderada(ativosArr, PESOS)
    const mediaAguardando = calcMediaPonderada(aguardandoArr, PESOS)
    const mediaMrr = calcMediaPonderada(mrrArr, PESOS)

    // Fatores de tendência
    const tendenciaAtivos = calcFatorTendencia(ativosArr)
    const tendenciaMrr = calcFatorTendencia(mrrArr)

    // Aplicação da tendência: 50% se crescimento, 70% se queda
    const aplicacaoAtivos = tendenciaAtivos >= 0 ? 0.5 : 0.7
    const aplicacaoMrr = tendenciaMrr >= 0 ? 0.5 : 0.7

    // Decaimento da tendência ao longo dos meses projetados
    const decaimento = [0.5, 0.3, 0.15]

    // Meses reais
    const resultado: ProjecaoMes[] = evolucao3Meses.map(e => ({
      mesLabel: e.mesLabel,
      mes: e.mes,
      ano: e.ano,
      tipo: 'real' as const,
      cadastrados: e.cadastrados,
      ativos: e.ativos,
      aguardando: e.aguardando,
      mrr: e.mrr,
    }))

    // Meses projetados
    for (let i = 0; i < mesesFuturos.length; i++) {
      const { mes, ano } = mesesFuturos[i]
      const d = decaimento[i]

      // Projeção com tendência decrescente
      const fatorAtivos = 1 + (tendenciaAtivos * aplicacaoAtivos * d)
      const fatorMrr = 1 + (tendenciaMrr * aplicacaoMrr * d)

      const ativosProj = Math.round(mediaAtivos * fatorAtivos)
      const mrrProj = mediaMrr * fatorMrr

      // Intervalo de confiança ±15%
      const ativosMin = Math.round(ativosProj * 0.85)
      const ativosMax = Math.round(ativosProj * 1.15)
      const mrrMin = mrrProj * 0.85
      const mrrMax = mrrProj * 1.15

      resultado.push({
        mesLabel: mesLabel(mes, ano),
        mes,
        ano,
        tipo: 'projecao',
        cadastrados: Math.round(mediaCadastrados),
        ativos: ativosProj,
        aguardando: Math.round(mediaAguardando),
        mrr: mrrProj,
        ativosMin,
        ativosMax,
        mrrMin,
        mrrMax,
      })
    }

    return resultado
  }, [evolucao3Meses, isCustom])

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
    mesesEfetivos,
    isCustom,
    isHistorico,
    contratos,
    evolucao3Meses,
    projecao6Meses,
    funil,
    distribuicaoVendedor,
    mrrTendencia,
    performanceVendedor,
    totaisTime,
    kpis,
    mesLabelCompleto,
  }
}
