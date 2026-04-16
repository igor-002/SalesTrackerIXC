/**
 * Hook de relatórios gerenciais — Fase 4.
 * Lê dados da tabela `vendas` (sincronizada com o IXC via proxy),
 * usa React Query com staleTime de 30 minutos (mesmo padrão do useIxcSync).
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Tipos exportados ────────────────────────────────────────────────────────

export interface ContratoRelatorio {
  id: string
  cliente_nome: string
  valor_total: number | null
  status_ixc: string | null
  mrr: boolean | null
  data_venda: string
  dias_em_aa: number | null
  vendedor: { id: string; nome: string } | null
}

export interface KpisRelatorio {
  total: number
  ativos: number
  aguardando: number
  ticketMedio: number
  taxaConversao: number
}

export interface VendedorRankRow {
  id: string
  nome: string
  ativos: number
  aguardando: number
  metaContratos: number
  pctMeta: number
}

export interface MesChartRow {
  mesLabel: string   // ex: "Jan/26"
  mes: number
  ano: number
  total: number
  ativos: number
  aguardando: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mesLabel(mes: number, ano: number): string {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${MESES[mes - 1]}/${String(ano).slice(2)}`
}

function firstDay(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

function lastDay(mes: number, ano: number): string {
  const d = new Date(ano, mes, 0)
  return d.toISOString().slice(0, 10)
}

/** Retorna os últimos N meses inclusive o atual, em ordem cronológica */
export function ultimosMeses(n: number, refMes?: number, refAno?: number): { mes: number; ano: number }[] {
  const now = new Date()
  const baseMes = refMes ?? now.getMonth() + 1
  const baseAno = refAno ?? now.getFullYear()
  const result: { mes: number; ano: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    let m = baseMes - i
    let a = baseAno
    while (m <= 0) { m += 12; a -= 1 }
    result.push({ mes: m, ano: a })
  }
  return result
}

// ── Função de busca ──────────────────────────────────────────────────────────

async function fetchContratos(
  mes: number,
  ano: number,
  vendedorId: string | null,
): Promise<ContratoRelatorio[]> {
  let query = supabase
    .from('vendas')
    .select('id, cliente_nome, valor_total, status_ixc, mrr, data_venda, dias_em_aa, vendedor:vendedores(id, nome)')
    .gte('data_venda', firstDay(mes, ano))
    .lte('data_venda', lastDay(mes, ano))
    .order('data_venda', { ascending: false })

  if (vendedorId) query = query.eq('vendedor_id', vendedorId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ContratoRelatorio[]
}

/** Busca um intervalo amplo para os gráficos de evolução (sem filtro de vendedor) */
async function fetchContratosRange(
  inicio: string,
  fim: string,
  vendedorId: string | null,
): Promise<ContratoRelatorio[]> {
  let query = supabase
    .from('vendas')
    .select('id, cliente_nome, valor_total, status_ixc, mrr, data_venda, dias_em_aa, vendedor:vendedores(id, nome)')
    .gte('data_venda', inicio)
    .lte('data_venda', fim)
    .order('data_venda', { ascending: false })

  if (vendedorId) query = query.eq('vendedor_id', vendedorId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ContratoRelatorio[]
}

// ── Cálculos ──────────────────────────────────────────────────────────────

export function calcKpis(contratos: ContratoRelatorio[]): KpisRelatorio {
  const ativos     = contratos.filter(c => c.status_ixc === 'A')
  const aguardando = contratos.filter(c => c.status_ixc === 'AA')
  const total      = contratos.length
  const somaAtivos = ativos.reduce((s, c) => s + (c.valor_total ?? 0), 0)
  const ticketMedio   = ativos.length > 0 ? somaAtivos / ativos.length : 0
  const taxaConversao = total > 0 ? (ativos.length / total) * 100 : 0
  return { total, ativos: ativos.length, aguardando: aguardando.length, ticketMedio, taxaConversao }
}

export function agruparPorMes(
  contratos: ContratoRelatorio[],
  meses: { mes: number; ano: number }[],
): MesChartRow[] {
  return meses.map(({ mes, ano }) => {
    const inicio = firstDay(mes, ano)
    const fim    = lastDay(mes, ano)
    const grupo  = contratos.filter(c => c.data_venda >= inicio && c.data_venda <= fim)
    return {
      mesLabel: mesLabel(mes, ano),
      mes,
      ano,
      total:     grupo.length,
      ativos:    grupo.filter(c => c.status_ixc === 'A').length,
      aguardando: grupo.filter(c => c.status_ixc === 'AA').length,
    }
  })
}

// ── Hook principal — mês corrente ───────────────────────────────────────────

export function useRelatoriosMes(mes: number, ano: number, vendedorId: string | null) {
  return useQuery({
    queryKey: ['relatorios-mes', mes, ano, vendedorId],
    queryFn: () => fetchContratos(mes, ano, vendedorId),
    staleTime: 30 * 60 * 1000,
    gcTime: 35 * 60 * 1000,
  })
}

// ── Hook para gráfico de evolução (range de N meses) ────────────────────────

export function useRelatoriosRange(
  meses: { mes: number; ano: number }[],
  vendedorId: string | null,
) {
  const inicio = meses.length > 0 ? firstDay(meses[0].mes, meses[0].ano) : ''
  const fim    = meses.length > 0 ? lastDay(meses[meses.length - 1].mes, meses[meses.length - 1].ano) : ''

  return useQuery({
    queryKey: ['relatorios-range', inicio, fim, vendedorId],
    queryFn: () => fetchContratosRange(inicio, fim, vendedorId),
    staleTime: 30 * 60 * 1000,
    gcTime: 35 * 60 * 1000,
    enabled: Boolean(inicio && fim),
  })
}
