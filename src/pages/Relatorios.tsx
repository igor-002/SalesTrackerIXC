/**
 * Página de Relatórios — Redesign completo com gráficos evolutivos e funil.
 * 4 abas: Visão Geral · Ranking de Vendedores · Por Vendedor · Projetos & Serviços
 */
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, ComposedChart,
} from 'recharts'
import {
  FileText, Users, TrendingUp, DollarSign, Percent,
  Target, ChevronDown, ChevronUp, Check, Edit2, X, Clock, FolderKanban,
  CheckCircle2, AlertCircle, Award, RotateCcw,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import { useVendedores } from '@/hooks/useVendedores'
import { useMetas } from '@/hooks/useMetas'
import { useMetasVendedor } from '@/hooks/useMetasVendedor'
import { useRelatoriosRedesign } from '@/hooks/useRelatoriosRedesign'
import {
  useRelatoriosMes,
  useRelatoriosRange,
  calcKpis,
  calcTempoAtivacao,
  agruparPorMes,
  ultimosMeses,
} from '@/hooks/useRelatoriosIxc'
import { formatBRL, formatPercent } from '@/lib/formatters'
import { useVendasUnicas } from '@/hooks/useVendasUnicas'
import { TabComissoesPagamento } from '@/components/TabComissoesPagamento'

// ── Constantes ───────────────────────────────────────────────────────────────

const MESES_LABELS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const CORES_VENDEDORES = [
  '#00d68f', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

type Aba = 'visao_geral' | 'ranking' | 'por_vendedor' | 'projetos' | 'comissoes'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, accentHex, sub, subColor }: {
  label: string; value: string; icon: React.ReactNode; accentHex: string; sub?: string; subColor?: string
}) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderTop: `2px solid ${accentHex}`,
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accentHex}18`, color: accentHex }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs font-medium text-white/50 mt-0.5">{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: subColor ?? 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
    </div>
  )
}

// ── Tooltip escuro Recharts ───────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string; dataKey?: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl" style={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)' }}>
      {label && <p className="text-white/50 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.dataKey?.includes('mrr') ? formatBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function MrrTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl max-w-xs" style={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)' }}>
      {label && <p className="text-white/50 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

function EvolucaoTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string; dataKey?: string; payload?: Record<string, unknown> }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const ativos = payload.find(p => p.dataKey === 'ativos')
  const aguardando = payload.find(p => p.dataKey === 'aguardando')
  const mrr = payload.find(p => p.dataKey === 'mrr')
  const dataPoint = payload[0]?.payload
  const mrrPendente = typeof dataPoint?.mrrPendente === 'number' ? dataPoint.mrrPendente : 0
  return (
    <div className="rounded-xl px-3.5 py-3 text-xs shadow-xl" style={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)', minWidth: 220 }}>
      {label && <p className="text-white/50 mb-2 font-semibold">{label}</p>}
      {ativos !== undefined && (
        <p className="font-semibold mb-1" style={{ color: '#00d68f' }}>
          {ativos.value} contratos ativos
        </p>
      )}
      {aguardando !== undefined && (
        <p className="font-semibold mb-1" style={{ color: '#f59e0b' }}>
          {aguardando.value} aguardando assinatura
        </p>
      )}
      {mrr !== undefined && (
        <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-semibold" style={{ color: '#00d68f' }}>
            MRR confirmado: {formatBRL(mrr.value)}
          </p>
          {mrrPendente > 0 && (
            <p className="font-semibold mt-0.5" style={{ color: '#f59e0b' }}>
              MRR potencial: {formatBRL(mrrPendente)}
            </p>
          )}
          {mrrPendente > 0 && (
            <p
              className="font-semibold mt-1.5 pt-1.5"
              style={{ color: 'rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              MRR possível: {formatBRL(mrr.value + mrrPendente)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Seletor Mês/Ano ───────────────────────────────────────────────────────────

function MesAnoSelect({ mes, ano, onChangeMes, onChangeAno }: {
  mes: number; ano: number; onChangeMes: (m: number) => void; onChangeAno: (a: number) => void
}) {
  const anos = [ano - 1, ano, ano + 1].filter(a => a >= 2024)
  const selectStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    colorScheme: 'dark' as const,
  }
  const optStyle = { background: '#0f2419', color: '#fff' }
  return (
    <div className="flex items-center gap-2">
      <select
        value={mes}
        onChange={e => onChangeMes(Number(e.target.value))}
        className="px-3 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
        style={selectStyle}
      >
        {MESES_LABELS.map((l, i) => <option key={i + 1} value={i + 1} style={optStyle}>{l}</option>)}
      </select>
      <select
        value={ano}
        onChange={e => onChangeAno(Number(e.target.value))}
        className="px-3 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
        style={selectStyle}
      >
        {anos.map(a => <option key={a} value={a} style={optStyle}>{a}</option>)}
      </select>
    </div>
  )
}

// ── Aba 1: Visão Geral (Redesign) ─────────────────────────────────────────────

function TabVisaoGeral({ vendedorIdFiltro, isGestor, vendedores }: {
  vendedorIdFiltro: string | null
  isGestor: boolean
  vendedores: { id: string; nome: string; ativo: boolean | null; meta_mensal?: number | null }[]
}) {
  const now = new Date()
  const [vendedorLocal, setVendedorLocal] = useState<string | null>(null)
  const vendedorEfetivo = isGestor ? vendedorLocal : vendedorIdFiltro

  // Período — modo e valores pendentes (antes do Aplicar) e aplicados
  const [periodoMode, setPeriodoMode] = useState<'ultimos3' | 'custom'>('ultimos3')
  const [pendingMes, setPendingMes] = useState(now.getMonth() + 1)
  const [pendingAno, setPendingAno] = useState(now.getFullYear())
  const [aplicado, setAplicado] = useState<{ mes: number; ano: number } | null>(null)

  const periodoCustom = periodoMode === 'custom' ? aplicado : null

  const handleAplicar = () => {
    setAplicado({ mes: pendingMes, ano: pendingAno })
    setPeriodoMode('custom')
  }

  const handleUltimos3 = () => {
    setPeriodoMode('ultimos3')
    setAplicado(null)
  }

  const {
    loading,
    meses3,
    mesesEfetivos,
    isCustom,
    isHistorico,
    contratos,
    projecao6Meses,
    funil,
    distribuicaoVendedor,
    mrrTendencia,
    performanceVendedor,
    totaisTime,
    kpis,
    aguardandoAntigos,
  } = useRelatoriosRedesign(vendedorEfetivo, periodoCustom)

  const { getMetaAtual } = useMetas()
  const metaAtual = getMetaAtual()
  const metaTime = metaAtual?.meta_mensal ?? 0

  const { getMetaVendedor, metas: metasVendedor } = useMetasVendedor(now.getMonth() + 1, now.getFullYear())
  const metaTimeContratos = metasVendedor.reduce((s, m) => s + (m.meta_contratos ?? 0), 0)
  const pctMetaTime = metaTimeContratos > 0 ? Math.min(100, (totaisTime.ativos / metaTimeContratos) * 100) : 0

  const cancelMes = now.getMonth() + 1
  const cancelAno = now.getFullYear()
  const inicioMes = `${cancelAno}-${String(cancelMes).padStart(2, '0')}-01`
  const inicioProximo = cancelMes === 12
    ? `${cancelAno + 1}-01-01`
    : `${cancelAno}-${String(cancelMes + 1).padStart(2, '0')}-01`
  const { data: cancelData } = useQuery({
    queryKey: ['cancelamentos-count', cancelAno, cancelMes],
    queryFn: async () => {
      const { count } = await supabase
        .from('cancelamentos')
        .select('id', { count: 'exact', head: true })
        .gte('data_cancel', inicioMes)
        .lt('data_cancel', inicioProximo)
      return count ?? 0
    },
    staleTime: 2 * 60 * 1000,
  })
  const cancelCount = cancelData ?? 0
  const churnDenom = kpis.ativos + cancelCount
  const churnPct = churnDenom > 0 ? (cancelCount / churnDenom) * 100 : 0
  const churnHex = churnPct < 2 ? '#00d68f' : churnPct < 5 ? '#f59e0b' : '#ef4444'

  const navigate = useNavigate()

  const diasMed = kpis.mediaDiasAguardando
  console.log('[VisaoGeral] mediaDiasAguardando:', diasMed, '| aguardando:', kpis.aguardando)
  const diasSubColor = diasMed === null ? undefined
    : diasMed <= 7 ? '#00d68f'
    : diasMed <= 15 ? '#f59e0b'
    : '#ef4444'
  const diasSub = diasMed !== null ? `média de ${diasMed} dias aguardando` : undefined

  const userId = useAuthStore(s => s.user?.id)
  const queryClient = useQueryClient()

  const { data: empresaId } = useQuery({
    queryKey: ['empresa-id'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('id').limit(1).single()
      return data?.id ?? null
    },
    staleTime: Infinity,
  })

  const [cancelModal, setCancelModal] = useState<{ id: string; cliente_nome: string; dias_aguardando: number } | null>(null)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null)
  const [aguardandoOcultados, setAguardandoOcultados] = useState<Set<string>>(new Set())
  const [canceladosExpanded, setCanceladosExpanded] = useState(false)
  const [reativarModal, setReativarModal] = useState<{ id: string; cliente_nome: string } | null>(null)
  const [reativarLoading, setReativarLoading] = useState(false)
  const [canceladosOcultados, setCanceladosOcultados] = useState<Set<string>>(new Set())

  const canceladosQueryKey = useMemo(
    () => ['cancelados-periodo', mesesEfetivos.map(m => `${m.mes}-${m.ano}`).join(','), vendedorEfetivo],
    [mesesEfetivos, vendedorEfetivo],
  )
  const { data: canceladosData = [] } = useQuery({
    queryKey: canceladosQueryKey,
    queryFn: async () => {
      const orParts = mesesEfetivos
        .map(m => `and(mes_referencia.eq.${m.mes},ano_referencia.eq.${m.ano})`)
        .join(',')
      let q = supabase
        .from('vendas')
        .select('id, cliente_nome, dias_aguardando, cancelamentos(motivo, data_cancel), vendedor:vendedores(nome)')
        .eq('status_ixc', 'CA')
        .or(orParts)
        .order('created_at', { ascending: false })
      if (vendedorEfetivo) q = q.eq('vendedor_id', vendedorEfetivo)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(r => {
        const v = r as unknown as {
          id: string; cliente_nome: string; dias_aguardando: number | null
          cancelamentos: { motivo: string | null; data_cancel: string | null }[]
          vendedor: { nome: string } | null
        }
        const cancel = v.cancelamentos?.[0]
        return {
          id: v.id,
          cliente_nome: v.cliente_nome,
          dias_aguardando: v.dias_aguardando ?? 0,
          vendedor_nome: v.vendedor?.nome ?? 'Sem vendedor',
          motivo: cancel?.motivo ?? null,
          data_cancel: cancel?.data_cancel ?? null,
        }
      })
    },
  })

  async function handleCancelar() {
    if (!cancelModal || cancelMotivo.trim().length < 10 || !empresaId) return
    setCancelLoading(true)
    try {
      await supabase.from('cancelamentos').insert({
        venda_id: cancelModal.id,
        motivo: cancelMotivo.trim(),
        data_cancel: new Date().toISOString().split('T')[0],
        empresa_id: empresaId,
        created_by: userId ?? null,
      } as never)
      await supabase.from('vendas').update({ status_ixc: 'CA' } as never).eq('id', cancelModal.id)
      setAguardandoOcultados(prev => new Set([...prev, cancelModal.id]))
      const nome = cancelModal.cliente_nome
      setCancelModal(null)
      setCancelMotivo('')
      setCancelSuccessMsg(`Contrato de ${nome} cancelado com sucesso`)
      setTimeout(() => setCancelSuccessMsg(null), 3000)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['relatorios-redesign'] }),
        queryClient.invalidateQueries({ queryKey: ['cancelamentos-count'] }),
        queryClient.invalidateQueries({ queryKey: ['cancelados-periodo'] }),
      ])
    } catch (e) {
      console.error('Erro ao cancelar contrato:', e)
    } finally {
      setCancelLoading(false)
    }
  }

  async function handleReativar() {
    if (!reativarModal) return
    setReativarLoading(true)
    try {
      await supabase.from('cancelamentos').delete().eq('venda_id', reativarModal.id)
      await supabase.from('vendas').update({ status_ixc: 'AA' } as never).eq('id', reativarModal.id)
      setCanceladosOcultados(prev => new Set([...prev, reativarModal.id]))
      const nome = reativarModal.cliente_nome
      setReativarModal(null)
      setCancelSuccessMsg(`Contrato de ${nome} reativado com sucesso`)
      setTimeout(() => setCancelSuccessMsg(null), 3000)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['relatorios-redesign'] }),
        queryClient.invalidateQueries({ queryKey: ['cancelamentos-count'] }),
        queryClient.invalidateQueries({ queryKey: ['cancelados-periodo'] }),
      ])
    } catch (e) {
      console.error('Erro ao reativar contrato:', e)
    } finally {
      setReativarLoading(false)
    }
  }

  const [sortCol, setSortCol] = useState<string>('ativos')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [aguardandoExpanded, setAguardandoExpanded] = useState(false)
  const [aguardandoVerTodos, setAguardandoVerTodos] = useState(false)

  const performanceSorted = useMemo(() => {
    const arr = [...performanceVendedor]
    arr.sort((a, b) => {
      const va = (a as unknown as Record<string, number>)[sortCol] ?? 0
      const vb = (b as unknown as Record<string, number>)[sortCol] ?? 0
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [performanceVendedor, sortCol, sortDir])

  const melhorPorColuna = useMemo(() => {
    const cols = ['cadastrados', 'ativos', 'mrrTotal', 'ticketMedio', 'taxaConversao'] as const
    const result: Record<string, string> = {}
    for (const col of cols) {
      let best = performanceVendedor[0]
      for (const p of performanceVendedor) {
        if (p[col] > best[col]) best = p
      }
      if (best) result[col] = best.vendedor_id
    }
    return result
  }, [performanceVendedor])

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const dadosFunil = useMemo(() => [
    { nome: 'Cadastrados', valor: funil.cadastrados, cor: '#6b7280' },
    { nome: 'Ativos', valor: funil.ativos, cor: '#00d68f' },
    { nome: 'Aguardando', valor: funil.aguardando, cor: '#06b6d4' },
    { nome: 'Cancelados', valor: funil.cancelados, cor: '#ef4444' },
  ], [funil])

  const dadosMrrLinha = useMemo(() => {
    const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const base6 = ultimosMeses(6)

    const vendedoresUnicos = new Set<string>()
    for (const m of mrrTendencia) {
      for (const v of m.porVendedor) {
        vendedoresUnicos.add(v.vendedor_id)
      }
    }

    const rows = base6.map(({ mes, ano }) => {
      const label = `${MESES_SHORT[mes - 1]}/${String(ano).slice(2)}`
      const found = mrrTendencia.find(m => m.mes === mes && m.ano === ano)
      const row: Record<string, number | string> = {
        mesLabel: label,
        mrrTotal: found?.mrrTotal ?? 0,
      }
      for (const vid of vendedoresUnicos) {
        const vdata = found?.porVendedor.find(v => v.vendedor_id === vid)
        row[vid] = vdata?.mrr ?? 0
      }
      return row
    })

    // Remove meses zerados do início da série (não do meio)
    const firstWithData = rows.findIndex(r => (r.mrrTotal as number) > 0)
    return firstWithData >= 0 ? rows.slice(firstWithData) : rows
  }, [mrrTendencia])

  const vendedoresParaLinha = useMemo(() => {
    const set = new Set<string>()
    for (const m of mrrTendencia) {
      for (const v of m.porVendedor) {
        set.add(v.vendedor_id)
      }
    }
    return Array.from(set).map((vid, i) => {
      const nome = mrrTendencia.flatMap(m => m.porVendedor).find(v => v.vendedor_id === vid)?.nome ?? 'Vendedor'
      return { id: vid, nome, cor: CORES_VENDEDORES[i % CORES_VENDEDORES.length] }
    })
  }, [mrrTendencia])

  const distribuicaoAguardando = useMemo(() =>
    performanceVendedor
      .filter(p => p.aguardando > 0)
      .map(p => ({
        vendedor_id: p.vendedor_id,
        nome: p.nome,
        aguardando: p.aguardando,
        mrrPotencial: Math.round(p.ticketMedio * p.aguardando),
      }))
  , [performanceVendedor])

  const tipoPessoaData = useMemo(() => {
    const ativos = contratos.filter(c => c.status_ixc === 'A')
    let pf = 0, pj = 0
    for (const c of ativos) {
      const digits = c.cliente_cpf_cnpj?.replace(/\D/g, '') ?? ''
      if (digits.length === 14) pj++
      else pf++
    }
    return [
      { name: 'Pessoa Física', value: pf },
      { name: 'Pessoa Jurídica', value: pj },
    ]
  }, [contratos])

  const tipoPessoaPorVendedor = useMemo(() => {
    const map = new Map<string, { nome: string; pf: number; pj: number }>()
    for (const c of contratos.filter(c => c.status_ixc === 'A')) {
      const vid = c.vendedor_id ?? 'sem-vendedor'
      const nome = c.vendedor?.nome ?? 'Sem vendedor'
      if (!map.has(vid)) map.set(vid, { nome, pf: 0, pj: 0 })
      const digits = c.cliente_cpf_cnpj?.replace(/\D/g, '') ?? ''
      if (digits.length === 14) map.get(vid)!.pj++
      else map.get(vid)!.pf++
    }
    return Array.from(map.values())
  }, [contratos])

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner style={{ color: '#00d68f' }} /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Seletor de Período */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Período</p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Últimos 3 meses / Específico */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={handleUltimos3}
                  className="px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                  style={periodoMode === 'ultimos3'
                    ? { background: 'rgba(0,214,143,0.2)', color: '#00d68f' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  Últimos 3 meses
                </button>
                <button
                  onClick={() => setPeriodoMode('custom')}
                  className="px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                  style={periodoMode === 'custom'
                    ? { background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  Período específico
                </button>
              </div>

              {/* Dropdowns + Aplicar — só aparece em modo custom */}
              {periodoMode === 'custom' && (
                <div className="flex items-center gap-2">
                  <select
                    value={pendingMes}
                    onChange={e => setPendingMes(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                  >
                    {MESES_LABELS.map((l, i) => (
                      <option key={i + 1} value={i + 1} style={{ background: '#0f2419', color: '#fff' }}>{l}</option>
                    ))}
                  </select>
                  <select
                    value={pendingAno}
                    onChange={e => setPendingAno(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                  >
                    {[2024, 2025, 2026, 2027].map(a => (
                      <option key={a} value={a} style={{ background: '#0f2419', color: '#fff' }}>{a}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAplicar}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                    style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            {/* Indicador do período ativo */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-white/50">
                {isCustom && aplicado
                  ? <>Exibindo: <span className="text-white/80 font-medium">{MESES_LABELS[aplicado.mes - 1]} / {aplicado.ano}</span></>
                  : <>Exibindo: <span className="text-white/80 font-medium">{mesesEfetivos.map(m => MESES_LABELS[m.mes - 1]).join(', ')} / {meses3[0].ano}</span></>
                }
              </p>
              {isHistorico && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                  dados do histórico
                </span>
              )}
            </div>
          </div>

          {isGestor && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Vendedor</p>
              <select
                value={vendedorLocal ?? ''}
                onChange={e => setVendedorLocal(e.target.value || null)}
                className="px-3 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
              >
                <option value="" style={{ background: '#0f2419', color: '#fff' }}>Todos</option>
                {vendedores.filter(v => v.ativo).map(v => (
                  <option key={v.id} value={v.id} style={{ background: '#0f2419', color: '#fff' }}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </GlassCard>

      {/* SEÇÃO 1 — KPI Cards */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Total Cadastrados" value={String(kpis.total)} icon={<FileText size={18} />} accentHex="#6b7280" />
          <KpiCard label="Aguardando Assinatura" value={String(kpis.aguardando)} icon={<ChevronDown size={18} />} accentHex="#06b6d4" sub={diasSub} subColor={diasSubColor} />
          <KpiCard label="Contratos Ativos" value={String(kpis.ativos)} icon={<Check size={18} />} accentHex="#00d68f" />
          <KpiCard label="MRR Confirmado" value={formatBRL(kpis.mrrAtivo)} icon={<DollarSign size={18} />} accentHex="#00d68f" sub={`ticket médio ${formatBRL(kpis.ticketMedio)}`} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Receita Aguardando" value={formatBRL(kpis.mrrPendente)} icon={<TrendingUp size={18} />} accentHex="#f59e0b" sub="se todos AA/P ativarem" />
          <KpiCard label="Taxa de Conversão" value={formatPercent(kpis.taxaConversao)} icon={<Percent size={18} />} accentHex="#8b5cf6" sub="ativos ÷ total" />
          <KpiCard
            label="Cancelamentos no Mês"
            value={cancelCount === 0 ? '0 cancelamentos' : `${cancelCount} (${churnPct.toFixed(1)}%)`}
            icon={<AlertCircle size={18} />}
            accentHex={churnHex}
            sub="cancelados ÷ (ativos + cancelados)"
          />
        </div>
      </div>

      {/* SEÇÃO METAS DO TIME */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Painel de Metas do Time</h3>
        {metaTimeContratos === 0 && metaTime === 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">Nenhuma meta cadastrada para este mês</p>
            <button
              onClick={() => navigate('/metas')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              style={{ background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.3)' }}
            >
              Cadastrar Meta
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {metaTimeContratos > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/50">Time — {totaisTime.ativos} de {metaTimeContratos} contratos</span>
                  <span className="text-xs font-semibold" style={{ color: '#00d68f' }}>{pctMetaTime.toFixed(0)}%</span>
                </div>
                <ProgressBar value={pctMetaTime} color="success" size="md" emptyLabel="Mês iniciando" />
                {metaTimeContratos > totaisTime.ativos && (
                  <p className="text-xs text-white/30 mt-1">Faltam {metaTimeContratos - totaisTime.ativos} contratos para a meta</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-xs text-white/60">Meta do time: <span className="font-semibold text-white/80">{formatBRL(metaTime)}/mês</span></p>
                  <p className="text-xs text-white/30 mt-0.5">Defina metas por vendedor para ver o progresso de contratos</p>
                </div>
                <button
                  onClick={() => navigate('/metas')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all shrink-0 ml-3"
                  style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
                >
                  Definir metas
                </button>
              </div>
            )}
            {performanceSorted.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                {performanceSorted.map(v => {
                  const metaV = getMetaVendedor(v.vendedor_id)
                  const pctV = metaV > 0 ? Math.min(100, (v.ativos / metaV) * 100) : 0
                  return (
                    <div key={v.vendedor_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/60 truncate">{v.nome}</span>
                        <span className="text-xs text-white/40 ml-2 shrink-0">
                          {metaV > 0 ? `${v.ativos}/${metaV}` : `${v.ativos} — sem meta`}
                        </span>
                      </div>
                      {metaV > 0
                        ? <ProgressBar value={pctV} color="primary" size="sm" emptyLabel="Mês iniciando" />
                        : <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* SEÇÃO 2 — Evolução + Projeção */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isCustom && aplicado
                ? `Evolução — ${MESES_LABELS[aplicado.mes - 1]} / ${aplicado.ano}`
                : 'Evolução e Projeção'}
            </h3>
            <p className="text-xs text-white/30 mt-0.5">
              {isCustom
                ? 'Mês selecionado'
                : '3 meses reais + 3 meses projetados (média ponderada + tendência)'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: '#00d68f' }} />
              <span className="text-white/50">Ativos</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
              <span className="text-white/50">Aguardando Ativação</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded opacity-50" style={{ background: '#00d68f', border: '1px dashed #00d68f' }} />
              <span className="text-white/50">Projeção</span>
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={projecao6Meses} barGap={4} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <pattern id="projPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                <path d="M0,6 L6,0" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="mesLabel"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 'auto']}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={35}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 'auto']}
              tick={{ fill: 'rgba(0,214,143,0.6)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={v => formatBRL(v)}
            />
            <Tooltip content={<EvolucaoTooltip />} />
            <Bar
              yAxisId="left"
              dataKey="ativos"
              name="Ativos"
              radius={[4,4,0,0]}
              fill="#00d68f"
              fillOpacity={1}
              maxBarSize={60}
              shape={(props: { x?: number; y?: number; width?: number; height?: number; value?: number | [number, number]; payload?: { tipo?: string; ativos?: number } }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props
                const isProj = payload?.tipo === 'projecao'
                const displayVal = payload?.ativos
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={isProj ? 'rgba(0,214,143,0.35)' : '#00d68f'}
                      rx={4}
                      ry={4}
                      stroke={isProj ? '#00d68f' : 'none'}
                      strokeWidth={isProj ? 1 : 0}
                      strokeDasharray={isProj ? '4 2' : 'none'}
                    />
                    {!isProj && height > 0 && displayVal !== undefined && displayVal > 0 && (
                      <text x={x + width / 2} y={y - 4} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={11} fontWeight="bold">{displayVal}</text>
                    )}
                  </g>
                )
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="aguardando"
              name="Aguardando Ativação"
              radius={[4,4,0,0]}
              fill="#f59e0b"
              maxBarSize={60}
              shape={(props: { x?: number; y?: number; width?: number; height?: number; value?: number | [number, number]; payload?: { tipo?: string; aguardando?: number } }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props
                const isProj = payload?.tipo === 'projecao'
                const displayVal = payload?.aguardando
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={isProj ? 'rgba(245,158,11,0.35)' : '#f59e0b'}
                      rx={4}
                      ry={4}
                      stroke={isProj ? '#f59e0b' : 'none'}
                      strokeWidth={isProj ? 1 : 0}
                      strokeDasharray={isProj ? '4 2' : 'none'}
                    />
                    {!isProj && height > 0 && displayVal !== undefined && displayVal > 0 && (
                      <text x={x + width / 2} y={y - 4} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={11} fontWeight="bold">{displayVal}</text>
                    )}
                  </g>
                )
              }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="mrr"
              name="MRR"
              stroke="#00d68f"
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; payload?: { tipo?: string } }) => {
                const { cx = 0, cy = 0, payload } = props
                const isProj = payload?.tipo === 'projecao'
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isProj ? 5 : 4}
                    fill={isProj ? 'transparent' : '#00d68f'}
                    stroke="#00d68f"
                    strokeWidth={isProj ? 2 : 0}
                    strokeDasharray={isProj ? '2 1' : undefined}
                  />
                )
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-white/30 text-center mt-2">Barras tracejadas = projeção · Linha verde = MRR (escala à direita)</p>
      </GlassCard>

      {/* Cards de Projeção */}
      {projecao6Meses.filter(p => p.tipo === 'projecao').length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {projecao6Meses.filter(p => p.tipo === 'projecao').map(proj => (
            <GlassCard key={`${proj.mes}-${proj.ano}`} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Projeção {proj.mesLabel}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                  ±15%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-1">Ativos esperados</p>
                  <p className="text-xl font-bold text-white">{proj.ativos}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {proj.ativosMin}–{proj.ativosMax}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">MRR esperado</p>
                  <p className="text-xl font-bold" style={{ color: '#00d68f' }}>{formatBRL(proj.mrr)}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {formatBRL(proj.mrrMin ?? 0)}–{formatBRL(proj.mrrMax ?? 0)}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* SEÇÃO 3 — Funil de Vendas */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Funil de Vendas</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Barras horizontais */}
          <div className="flex flex-col gap-3">
            {dadosFunil.map((item) => {
              const maxVal = Math.max(...dadosFunil.map(d => d.valor))
              const pct = maxVal > 0 ? (item.valor / maxVal) * 100 : 0
              return (
                <div key={item.nome} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-white/70 shrink-0">{item.nome}</span>
                  <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-lg flex items-center justify-end px-3 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 5)}%`, background: item.cor }}
                    >
                      <span className="text-sm font-bold text-white">{item.valor}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Métricas do funil */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(0,214,143,0.08)', border: '1px solid rgba(0,214,143,0.15)' }}>
              <p className="text-xs text-white/50 mb-1">Taxa de Conversão</p>
              <p className="text-2xl font-bold" style={{ color: '#00d68f' }}>{funil.taxaConversao.toFixed(1)}%</p>
              <p className="text-xs text-white/30 mt-1">ativos ÷ cadastrados</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-xs text-white/50 mb-1">Taxa de Perda</p>
              <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{funil.taxaPerda.toFixed(1)}%</p>
              <p className="text-xs text-white/30 mt-1">cancelados ÷ cadastrados</p>
            </div>
            <div className="p-4 rounded-xl col-span-2" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-white/50">Tempo Médio para Ativar</p>
                {funil.tempoMedioAtivacaoIsEstimado && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                    espera atual
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: '#06b6d4' }}>
                {funil.tempoMedioAtivacao !== null ? `${funil.tempoMedioAtivacao.toFixed(1)} dias` : '—'}
              </p>
              <p className="text-xs text-white/30 mt-1">
                {funil.tempoMedioAtivacaoIsEstimado
                  ? 'média dos contratos aguardando hoje'
                  : 'do cadastro até ativação'}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* SEÇÃO 3b — Contratos Aguardando há Mais Tempo (expansível) */}
      {aguardandoAntigos.length > 0 && (
        <GlassCard className="overflow-hidden">
          {/* Header clicável */}
          <button
            onClick={() => { setAguardandoExpanded(v => !v); setAguardandoVerTodos(false) }}
            className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-white/2"
          >
            <Clock size={15} className="text-amber-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">Contratos Aguardando há Mais Tempo</h3>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full ml-1"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              {aguardandoAntigos.length}
            </span>
            <span className="ml-auto text-white/30 shrink-0">
              {aguardandoExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>

          {/* Conteúdo expansível */}
          {aguardandoExpanded && (
            <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-4">
                {(aguardandoVerTodos ? aguardandoAntigos : aguardandoAntigos.slice(0, 12))
                  .filter(c => !aguardandoOcultados.has(c.id))
                  .map(c => {
                  const badge =
                    c.dias_aguardando > 30
                      ? { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' }
                      : c.dias_aguardando >= 8
                        ? { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' }
                        : { bg: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: 'rgba(6,182,212,0.25)' }
                  const dataCadastro = c.data_cadastro
                    ? new Date(c.data_cadastro).toLocaleDateString('pt-BR')
                    : null
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 p-3.5 rounded-xl relative group"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-white leading-snug">{c.cliente_nome}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
                            style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                          >
                            {c.dias_aguardando}d
                          </span>
                          <button
                            onClick={() => setCancelModal({ id: c.id, cliente_nome: c.cliente_nome, dias_aguardando: c.dias_aguardando })}
                            title="Cancelar contrato"
                            className="p-1 rounded-lg transition-colors cursor-pointer"
                            style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <span className="text-xs text-white/50">{c.vendedor_nome}</span>
                      {dataCadastro && (
                        <span className="text-xs text-white/30">Cadastrado em {dataCadastro}</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {aguardandoAntigos.length > 12 && !aguardandoVerTodos && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setAguardandoVerTodos(true)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    Ver todos ({aguardandoAntigos.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Modal de confirmação de cancelamento */}
      <Modal
        open={cancelModal !== null}
        onClose={() => { if (!cancelLoading) { setCancelModal(null); setCancelMotivo('') } }}
        title={`Cancelar contrato de ${cancelModal?.cliente_nome ?? ''}?`}
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/50">
            Este contrato está aguardando há <span className="font-semibold text-amber-400">{cancelModal?.dias_aguardando} dias</span>.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/60">Motivo do cancelamento <span className="text-red-400">*</span></label>
            <textarea
              value={cancelMotivo}
              onChange={e => setCancelMotivo(e.target.value)}
              placeholder="Descreva o motivo do cancelamento (mínimo 10 caracteres)"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
            <p className="text-xs" style={{ color: cancelMotivo.trim().length < 10 ? 'rgba(255,255,255,0.3)' : '#00d68f' }}>
              {cancelMotivo.trim().length}/10 caracteres mínimos
            </p>
          </div>
          <div className="flex items-center gap-3 justify-end pt-1">
            <button
              onClick={() => { setCancelModal(null); setCancelMotivo('') }}
              disabled={cancelLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Voltar
            </button>
            <button
              onClick={handleCancelar}
              disabled={cancelMotivo.trim().length < 10 || cancelLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: cancelMotivo.trim().length < 10 ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.2)',
                color: cancelMotivo.trim().length < 10 ? 'rgba(239,68,68,0.4)' : '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
                cursor: cancelMotivo.trim().length < 10 || cancelLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de reativação */}
      <Modal
        open={reativarModal !== null}
        onClose={() => { if (!reativarLoading) setReativarModal(null) }}
        title={`Reativar contrato de ${reativarModal?.cliente_nome ?? ''}?`}
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-white/50">
            O contrato voltará para <span className="font-semibold text-cyan-400">Aguardando Assinatura</span>.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setReativarModal(null)}
              disabled={reativarLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Voltar
            </button>
            <button
              onClick={handleReativar}
              disabled={reativarLoading}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={{ background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.3)' }}
            >
              {reativarLoading ? 'Reativando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast de sucesso */}
      {cancelSuccessMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl"
          style={{ background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.3)' }}
        >
          {cancelSuccessMsg}
        </div>
      )}

      {/* SEÇÃO 3c — Contratos Cancelados (colapsada por padrão) */}
      {canceladosData.filter(c => !canceladosOcultados.has(c.id)).length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {/* Header */}
          <button
            onClick={() => setCanceladosExpanded(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors"
            style={{ background: 'rgba(239,68,68,0.08)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.13)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
          >
            <X size={15} className="shrink-0 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Contratos Cancelados</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full ml-1 bg-red-500/20 text-red-400">
              {canceladosData.filter(c => !canceladosOcultados.has(c.id)).length}
            </span>
            <span className="ml-auto text-white/30 shrink-0">
              {canceladosExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>

          {/* Linhas */}
          {canceladosExpanded && (
            <div className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex flex-col gap-2">
                {canceladosData.filter(c => !canceladosOcultados.has(c.id)).map(c => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-white truncate">{c.cliente_nome}</p>
                      <p className="text-xs text-white/40">{c.vendedor_nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        {c.data_cancel && (
                          <span className="text-xs text-white/35">
                            Cancelado em {new Date(c.data_cancel).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {c.dias_aguardando > 0 && (
                          <span className="text-xs text-white/30">{c.dias_aguardando}d aguardando</span>
                        )}
                        {c.motivo && (
                          <span className="text-xs text-white/30 italic" title={c.motivo}>
                            "{c.motivo.length > 60 ? c.motivo.slice(0, 60) + '…' : c.motivo}"
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Botão reativar */}
                    <button
                      onClick={() => setReativarModal({ id: c.id, cliente_nome: c.cliente_nome })}
                      title="Reativar contrato"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                      style={{ color: '#00d68f', background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.25)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,214,143,0.18)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,214,143,0.1)' }}
                    >
                      <RotateCcw size={12} />
                      Reativar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 4 — Gráficos de Pizza */}
      {distribuicaoVendedor.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Pizza 1: Contratos Ativos */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Distribuição de Contratos Ativos</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={distribuicaoVendedor}
                  dataKey="ativos"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                >
                  {distribuicaoVendedor.map((_, idx) => (
                    <Cell key={idx} fill={CORES_VENDEDORES[idx % CORES_VENDEDORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 12 }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {distribuicaoVendedor.map((v, i) => (
                <span key={v.vendedor_id} className="flex items-center gap-1.5 text-xs text-white/60">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_VENDEDORES[i % CORES_VENDEDORES.length] }} />
                  {v.nome}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* Pizza 2: MRR */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Distribuição de MRR</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={distribuicaoVendedor}
                  dataKey="mrr"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                >
                  {distribuicaoVendedor.map((_, idx) => (
                    <Cell key={idx} fill={CORES_VENDEDORES[idx % CORES_VENDEDORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatBRL(Number(value))}
                  contentStyle={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 12 }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {distribuicaoVendedor.map((v, i) => (
                <span key={v.vendedor_id} className="flex items-center gap-1.5 text-xs text-white/60">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_VENDEDORES[i % CORES_VENDEDORES.length] }} />
                  {v.nome}: {formatBRL(v.mrr)}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* Pizza 3: Aguardando Assinatura por Vendedor */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Aguardando Assinatura por Vendedor</h3>
            {distribuicaoAguardando.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-xs text-white/30">Nenhum contrato aguardando no período</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={distribuicaoAguardando}
                      dataKey="aguardando"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    >
                      {distribuicaoAguardando.map((_, idx) => (
                        <Cell key={idx} fill={CORES_VENDEDORES[idx % CORES_VENDEDORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} contrato(s) · ${formatBRL((props.payload as typeof distribuicaoAguardando[0]).mrrPotencial)}`,
                        name,
                      ]}
                      contentStyle={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 12 }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {distribuicaoAguardando.map((v, i) => (
                    <span key={v.vendedor_id} className="flex items-center gap-1.5 text-xs text-white/60">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_VENDEDORES[i % CORES_VENDEDORES.length] }} />
                      {v.nome}: {formatBRL(v.mrrPotencial)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </GlassCard>

        </div>
      )}

      {/* SEÇÃO 4b — Pessoa Física vs Pessoa Jurídica */}
      {(tipoPessoaData[0].value + tipoPessoaData[1].value) > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Pizza PF vs PJ */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Pessoa Física vs Pessoa Jurídica</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={tipoPessoaData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                >
                  <Cell fill="#06b6d4" />
                  <Cell fill="#00d68f" />
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 12 }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 justify-center mt-2">
              {tipoPessoaData.map((item, i) => {
                const total = tipoPessoaData[0].value + tipoPessoaData[1].value
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0'
                const cor = i === 0 ? '#06b6d4' : '#00d68f'
                return (
                  <span key={item.name} className="flex items-center gap-1.5 text-xs text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cor }} />
                    {item.name} — {item.value} ({pct}%)
                  </span>
                )
              })}
            </div>
          </GlassCard>

          {/* Barras empilhadas PF/PJ por Vendedor */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tipo de Cliente por Vendedor</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tipoPessoaPorVendedor} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="nome"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 12 }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}
                  formatter={(value, name, props) => {
                    const total = (props.payload as { pf: number; pj: number }).pf + (props.payload as { pf: number; pj: number }).pj
                    return [`${value} (total: ${total})`, name]
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.6)' }}>{value}</span>}
                />
                <Bar dataKey="pf" name="Pessoa Física" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pj" name="Pessoa Jurídica" stackId="a" fill="#00d68f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

        </div>
      )}

      {/* SEÇÃO 5 — Linha de Tendência MRR */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Tendência de MRR</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded" style={{ background: '#00d68f' }} />
              <span className="text-white/50">Total do Time</span>
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dadosMrrLinha}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="mesLabel" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={v => formatBRL(v)} />
            <Tooltip content={<MrrTooltip />} />
            <Legend
              iconType="line"
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 10 }}
              formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.6)' }}>{value}</span>}
            />
            <Line type="monotone" dataKey="mrrTotal" name="Total do Time" stroke="#00d68f" strokeWidth={3} dot={{ fill: '#00d68f', r: 4 }} activeDot={{ r: 6 }} connectNulls={true} />
            {vendedoresParaLinha.map(v => (
              <Line
                key={v.id}
                type="monotone"
                dataKey={v.id}
                name={v.nome}
                stroke={v.cor}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ fill: v.cor, r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* SEÇÃO 6 — Tabela de Performance por Vendedor */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white">Performance por Vendedor</h3>
          <p className="text-xs text-white/30 mt-0.5">Clique nas colunas para ordenar</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">Vendedor</th>
                {[
                  { key: 'cadastrados', label: 'Cadastrados' },
                  { key: 'ativos', label: 'Ativos' },
                  { key: 'aguardando', label: 'Aguardando' },
                  { key: 'cancelados', label: 'Cancelados' },
                  { key: 'mrrTotal', label: 'MRR Total' },
                  { key: 'ticketMedio', label: 'Ticket Médio' },
                  { key: 'taxaConversao', label: 'Taxa de Conversão' },
                  { key: 'tempoMedioAtivacao', label: 'Tempo Médio Ativação' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30 cursor-pointer hover:text-white/50 transition-colors whitespace-nowrap"
                  >
                    {col.label}
                    {sortCol === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {performanceSorted.map(p => (
                <tr key={p.vendedor_id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 font-semibold text-white">{p.nome}</td>
                  <td className="px-3 py-3 tabular-nums text-white/70">
                    {p.cadastrados}
                    {melhorPorColuna.cadastrados === p.vendedor_id && <Award size={12} className="inline ml-1.5 text-amber-400" />}
                  </td>
                  <td className="px-3 py-3 tabular-nums font-semibold" style={{ color: '#00d68f' }}>
                    {p.ativos}
                    {melhorPorColuna.ativos === p.vendedor_id && <Award size={12} className="inline ml-1.5 text-amber-400" />}
                  </td>
                  <td className="px-3 py-3 tabular-nums" style={{ color: '#06b6d4' }}>{p.aguardando}</td>
                  <td className="px-3 py-3 tabular-nums" style={{ color: p.cancelados > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>{p.cancelados}</td>
                  <td className="px-3 py-3 tabular-nums text-white font-medium">
                    {formatBRL(p.mrrTotal)}
                    {melhorPorColuna.mrrTotal === p.vendedor_id && <Award size={12} className="inline ml-1.5 text-amber-400" />}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-white/70">
                    {formatBRL(p.ticketMedio)}
                    {melhorPorColuna.ticketMedio === p.vendedor_id && <Award size={12} className="inline ml-1.5 text-amber-400" />}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-white/70">
                    {p.taxaConversao.toFixed(1)}%
                    {melhorPorColuna.taxaConversao === p.vendedor_id && <Award size={12} className="inline ml-1.5 text-amber-400" />}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-white/50">
                    {p.tempoMedioAtivacao !== null ? `${p.tempoMedioAtivacao.toFixed(1)} dias` : '—'}
                  </td>
                </tr>
              ))}
              {/* Linha de total */}
              <tr className="font-bold" style={{ borderTop: '2px solid rgba(0,214,143,0.2)', background: 'rgba(0,214,143,0.03)' }}>
                <td className="px-4 py-3 text-white">Total do Time</td>
                <td className="px-3 py-3 tabular-nums text-white">{totaisTime.cadastrados}</td>
                <td className="px-3 py-3 tabular-nums" style={{ color: '#00d68f' }}>{totaisTime.ativos}</td>
                <td className="px-3 py-3 tabular-nums" style={{ color: '#06b6d4' }}>{totaisTime.aguardando}</td>
                <td className="px-3 py-3 tabular-nums" style={{ color: totaisTime.cancelados > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>{totaisTime.cancelados}</td>
                <td className="px-3 py-3 tabular-nums text-white">{formatBRL(totaisTime.mrrTotal)}</td>
                <td className="px-3 py-3 tabular-nums text-white/70">{formatBRL(totaisTime.ticketMedio)}</td>
                <td className="px-3 py-3 tabular-nums text-white/70">{totaisTime.taxaConversao.toFixed(1)}%</td>
                <td className="px-3 py-3 tabular-nums text-white/50">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}

// ── Aba 2: Ranking de Vendedores ───────────────────────────────────────────────

function TabRanking({ vendedores }: {
  vendedores: { id: string; nome: string; ativo: boolean | null }[]
}) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [editando, setEditando] = useState<{ vendedorId: string; valor: number } | null>(null)

  const { data: contratos = [], isFetching } = useRelatoriosMes(mes, ano, null)
  const { getMetaVendedor, upsertMeta, loading: loadingMetas } = useMetasVendedor(mes, ano)

  const ranking = useMemo(() => {
    const map = new Map<string, { ativos: number; aguardando: number }>()
    for (const v of vendedores.filter(v => v.ativo)) {
      map.set(v.id, { ativos: 0, aguardando: 0 })
    }
    for (const c of contratos) {
      const vid = c.vendedor?.id
      if (!vid) continue
      if (!map.has(vid)) map.set(vid, { ativos: 0, aguardando: 0 })
      const row = map.get(vid)!
      if (c.status_ixc === 'A')  row.ativos++
      if (c.status_ixc === 'AA') row.aguardando++
    }
    return Array.from(map.entries())
      .map(([id, { ativos, aguardando }]) => {
        const meta = getMetaVendedor(id)
        return {
          id,
          nome: vendedores.find(v => v.id === id)?.nome ?? id,
          ativos,
          aguardando,
          meta,
          pct: meta > 0 ? Math.min((ativos / meta) * 100, 200) : 0,
        }
      })
      .sort((a, b) => b.ativos - a.ativos)
  }, [contratos, vendedores, getMetaVendedor])

  async function handleSaveMeta(vendedorId: string, valor: number) {
    await upsertMeta(vendedorId, valor)
    setEditando(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Período</p>
          <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white">Ranking de Vendedores</h3>
          <p className="text-xs text-white/30 mt-0.5">Clique no ícone para definir a meta individual</p>
        </div>
        {isFetching || loadingMetas ? (
          <div className="flex justify-center py-10"><Spinner style={{ color: '#00d68f' }} /></div>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-white/30 px-5 py-8 text-center">Nenhum dado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30 w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">Ativos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">Aguardando</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">Meta</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30 min-w-[160px]">% Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-white/30 font-bold tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-white">{r.nome}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: '#00d68f' }}>{r.ativos}</td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: '#06b6d4' }}>{r.aguardando}</td>
                    <td className="px-4 py-3">
                      {editando?.vendedorId === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={editando.valor}
                            onChange={e => setEditando({ vendedorId: r.id, valor: Number(e.target.value) })}
                            className="w-16 px-2 py-1 rounded-lg text-xs text-white outline-none tabular-nums"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(0,214,143,0.3)' }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveMeta(r.id, editando.valor)}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                          ><Check size={14} /></button>
                          <button
                            onClick={() => setEditando(null)}
                            className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                          ><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 tabular-nums">{r.meta > 0 ? r.meta : '—'}</span>
                          <button
                            onClick={() => setEditando({ vendedorId: r.id, valor: r.meta })}
                            className="text-white/20 hover:text-white/60 transition-colors cursor-pointer"
                          ><Edit2 size={12} /></button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.meta > 0 ? (
                        <div className="flex items-center gap-3 min-w-[140px]">
                          <ProgressBar
                            value={r.pct}
                            color={r.pct >= 100 ? 'success' : r.pct >= 60 ? 'primary' : 'warning'}
                            size="sm"
                            className="flex-1"
                            emptyLabel="Mês iniciando"
                          />
                          <span className="text-xs font-semibold text-white/60 w-10 text-right tabular-nums">{r.pct.toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">sem meta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// ── Aba 3: Por Vendedor ───────────────────────────────────────────────────────

function TabPorVendedor({ vendedorIdFiltro, isGestor, vendedores }: {
  vendedorIdFiltro: string | null
  isGestor: boolean
  vendedores: { id: string; nome: string; ativo: boolean | null }[]
}) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())

  const primeiroVendedor = vendedores.find(v => v.ativo)?.id ?? null
  const [vendedorSel, setVendedorSel] = useState<string | null>(
    isGestor ? primeiroVendedor : vendedorIdFiltro
  )

  const vendedorEfetivo = isGestor ? vendedorSel : vendedorIdFiltro

  const { data: contratos = [], isFetching } = useRelatoriosMes(mes, ano, vendedorEfetivo)
  const { data: contratosTime = [] } = useRelatoriosMes(mes, ano, null)
  const { getMetaVendedor } = useMetasVendedor(mes, ano)

  const meses4 = useMemo(() => ultimosMeses(4, mes, ano), [mes, ano])
  const { data: contratosRange = [] } = useRelatoriosRange(meses4, vendedorEfetivo)

  const kpis = useMemo(() => calcKpis(contratos), [contratos])
  const meta = getMetaVendedor(vendedorEfetivo ?? '')
  const pctMeta = meta > 0 ? Math.min((kpis.ativos / meta) * 100, 200) : 0

  const chartData = useMemo(() => agruparPorMes(contratosRange, meses4), [contratosRange, meses4])

  const nomeVendedor = vendedorEfetivo
    ? (vendedores.find(v => v.id === vendedorEfetivo)?.nome ?? 'Vendedor')
    : 'Todos'

  const cancelamentos = contratos.filter(c => c.status_ixc === 'C' || c.status_ixc === 'CN' || c.status_ixc === 'CA').length
  const taxaConversaoInd = contratos.length > 0 ? (kpis.ativos / contratos.length) * 100 : 0
  const tempoAtivInd = useMemo(() => calcTempoAtivacao(contratos), [contratos])

  const badgeDestaque = useMemo(() => {
    if (!vendedorEfetivo || contratosTime.length === 0) return false
    const vendMap = new Map<string, { ativos: number; total: number }>()
    for (const c of contratosTime) {
      const vid = c.vendedor?.id
      if (!vid) continue
      const e = vendMap.get(vid) ?? { ativos: 0, total: 0 }
      e.total++
      if (c.status_ixc === 'A') e.ativos++
      vendMap.set(vid, e)
    }
    let melhorId = ''
    let melhorTaxa = -1
    for (const [id, e] of vendMap.entries()) {
      const taxa = e.total > 0 ? e.ativos / e.total : 0
      if (taxa > melhorTaxa) { melhorTaxa = taxa; melhorId = id }
    }
    return melhorId === vendedorEfetivo
  }, [contratosTime, vendedorEfetivo])

  const badgeAtencao = useMemo(() => {
    if (!vendedorEfetivo || contratosTime.length === 0) return false
    const cancelMap = new Map<string, number>()
    for (const c of contratosTime) {
      const vid = c.vendedor?.id
      if (!vid || (c.status_ixc !== 'C' && c.status_ixc !== 'CN' && c.status_ixc !== 'CA')) continue
      cancelMap.set(vid, (cancelMap.get(vid) ?? 0) + 1)
    }
    if (cancelMap.size === 0) return false
    const maxId = Array.from(cancelMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
    return maxId === vendedorEfetivo && cancelMap.get(vendedorEfetivo)! > 0
  }, [contratosTime, vendedorEfetivo])

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {isGestor && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Vendedor</p>
              <select
                value={vendedorSel ?? ''}
                onChange={e => setVendedorSel(e.target.value || null)}
                className="px-3 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
              >
                <option value="" style={{ background: '#0f2419', color: '#fff' }}>Todos</option>
                {vendedores.filter(v => v.ativo).map(v => (
                  <option key={v.id} value={v.id} style={{ background: '#0f2419', color: '#fff' }}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Período</p>
            <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
          </div>
        </div>
      </GlassCard>

      {isFetching ? (
        <div className="flex justify-center py-12"><Spinner style={{ color: '#00d68f' }} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Contratos Ativos" value={String(kpis.ativos)} icon={<Check size={18} />} accentHex="#00d68f" />
            <KpiCard label="Aguardando Assinatura" value={String(kpis.aguardando)} icon={<ChevronDown size={18} />} accentHex="#06b6d4" />
            <KpiCard label="% da Meta" value={meta > 0 ? formatPercent(pctMeta) : '—'} icon={<Target size={18} />} accentHex="#8b5cf6" sub={meta > 0 ? `meta: ${meta}` : 'sem meta definida'} />
            <KpiCard label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} icon={<DollarSign size={18} />} accentHex="#f59e0b" sub="por contrato ativo" />
          </div>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h3 className="text-sm font-semibold text-white">Perfil de desempenho — {nomeVendedor}</h3>
              {badgeDestaque && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.3)' }}>
                  ★ Melhor conversão do time
                </span>
              )}
              {badgeAtencao && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                  ⚠ Mais cancelamentos do time
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
              <div>
                <p className="text-xs text-white/40 mb-1">Taxa de conversão</p>
                <p className="text-xl font-bold text-white">{formatPercent(taxaConversaoInd)}</p>
                <p className="text-xs text-white/30 mt-0.5">ativos ÷ total cadastrados</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Tempo médio de ativação</p>
                {tempoAtivInd ? (
                  <>
                    <p className="text-xl font-bold text-white">{tempoAtivInd.mediaDias.toFixed(1)}<span className="text-sm font-normal text-white/40 ml-1">dias</span></p>
                    <p className="text-xs text-white/30 mt-0.5">melhor {tempoAtivInd.melhorCaso}d · pior {tempoAtivInd.piorCaso}d</p>
                  </>
                ) : (
                  <p className="text-sm text-white/30">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Cancelamentos no período</p>
                <p className="text-xl font-bold" style={{ color: cancelamentos > 0 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>{cancelamentos}</p>
                <p className="text-xs text-white/30 mt-0.5">contratos com status C</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Meta individual</p>
                {meta > 0 ? (
                  <>
                    <p className="text-xl font-bold text-white">{pctMeta.toFixed(0)}%</p>
                    <p className="text-xs text-white/30 mt-0.5">{kpis.ativos} de {meta} contratos</p>
                  </>
                ) : (
                  <p className="text-sm text-white/30">Não definida</p>
                )}
              </div>
            </div>
            {meta > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">Progresso vs. meta individual</span>
                  <span className="text-xs font-semibold" style={{ color: pctMeta >= 100 ? '#00d68f' : '#f59e0b' }}>{kpis.ativos} / {meta}</span>
                </div>
                <ProgressBar value={Math.min(pctMeta, 100)} color={pctMeta >= 100 ? 'success' : pctMeta >= 60 ? 'primary' : 'warning'} size="md" emptyLabel="Mês iniciando" />
              </div>
            )}
          </GlassCard>

          {meta > 0 && (
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Meta — {nomeVendedor}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: '#00d68f' }}>
                  {kpis.ativos} / {meta} ativos
                </span>
              </div>
              <ProgressBar value={Math.min(pctMeta, 100)} color={pctMeta >= 100 ? 'success' : pctMeta >= 60 ? 'primary' : 'warning'} size="lg" emptyLabel="Mês iniciando" />
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Evolução — últimos 4 meses · {nomeVendedor}</h3>
            {chartData.every(d => d.total === 0) ? (
              <p className="text-sm text-white/30 text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                  <Bar dataKey="ativos" name="Ativos" fill="#00d68f" radius={[3,3,0,0]} />
                  <Bar dataKey="aguardando" name="Aguardando" fill="#06b6d4" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}

// ── Aba 4: Projetos & Serviços ────────────────────────────────────────────────

type StatusFiltroProjeto = 'todos' | 'pendente' | 'quitado' | 'em_atraso' | 'cancelado'

function TabProjetos({ vendedorIdFiltro }: { vendedorIdFiltro: string | null }) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltroProjeto>('todos')

  const { vendas, loading } = useVendasUnicas()

  const projetosMes = useMemo(() => {
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const fimMes = new Date(ano, mes, 0)
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimMes.getDate()).padStart(2, '0')}`
    return vendas.filter(v =>
      v.data_venda >= inicio && v.data_venda <= fim &&
      v.vendedor_id !== null &&
      (vendedorIdFiltro === null || v.vendedor?.id === vendedorIdFiltro)
    )
  }, [vendas, mes, ano, vendedorIdFiltro])

  const projetosFiltrados = useMemo(() => {
    if (statusFiltro === 'todos') return projetosMes
    return projetosMes.filter(v => v.status_geral === statusFiltro)
  }, [projetosMes, statusFiltro])

  const metricas = useMemo(() => {
    const ativos = projetosMes.filter(v => v.status !== 'cancelado')
    return {
      total: ativos.length,
      valor_vendido: ativos.reduce((acc, v) => acc + v.valor_total, 0),
      valor_recebido: ativos.reduce((acc, v) => acc + v.valor_recebido, 0),
      valor_pendente: ativos.reduce((acc, v) => acc + v.valor_pendente, 0),
      valor_em_atraso: ativos.reduce((acc, v) => acc + v.valor_em_atraso, 0),
    }
  }, [projetosMes])

  const statusOptions: { key: StatusFiltroProjeto; label: string; color: string }[] = [
    { key: 'todos', label: 'Todos', color: '#a78bfa' },
    { key: 'pendente', label: 'Pendente', color: '#f59e0b' },
    { key: 'quitado', label: 'Quitados', color: '#00d68f' },
    { key: 'em_atraso', label: 'Em Atraso', color: '#ef4444' },
    { key: 'cancelado', label: 'Cancelados', color: '#666' },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner style={{ color: '#a78bfa' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FolderKanban size={18} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Projetos & Serviços</span>
            <span className="text-xs text-white/40">(Vendas únicas - não contam na meta)</span>
          </div>
          <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {statusOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setStatusFiltro(opt.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={statusFiltro === opt.key
                ? { background: `${opt.color}20`, color: opt.color, border: `1px solid ${opt.color}40` }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard label="Total Projetos" value={String(metricas.total)} icon={<FolderKanban size={18} />} accentHex="#a78bfa" />
        <KpiCard label="Valor Vendido" value={formatBRL(metricas.valor_vendido)} icon={<DollarSign size={18} />} accentHex="#a78bfa" />
        <KpiCard label="Valor Recebido" value={formatBRL(metricas.valor_recebido)} icon={<CheckCircle2 size={18} />} accentHex="#00d68f" sub={metricas.valor_vendido > 0 ? `${Math.round((metricas.valor_recebido / metricas.valor_vendido) * 100)}%` : '0%'} />
        <KpiCard label="Valor Pendente" value={formatBRL(metricas.valor_pendente)} icon={<Clock size={18} />} accentHex="#06b6d4" />
        <KpiCard label="Em Atraso" value={formatBRL(metricas.valor_em_atraso)} icon={<AlertCircle size={18} />} accentHex="#ef4444" />
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Projetos do Mês ({projetosFiltrados.length})
        </h3>

        {projetosFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <FolderKanban size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">Nenhum projeto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Descrição</th>
                  <th className="pb-3 font-semibold">Vendedor</th>
                  <th className="pb-3 font-semibold text-right">Valor</th>
                  <th className="pb-3 font-semibold text-right">Recebido</th>
                  <th className="pb-3 font-semibold text-center">Progresso</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {projetosFiltrados.map(projeto => {
                  const statusColor = projeto.status_geral === 'quitado' ? '#00d68f' :
                                     projeto.status_geral === 'em_atraso' ? '#ef4444' :
                                     projeto.status_geral === 'cancelado' ? '#666' : '#f59e0b'
                  const StatusIcon = projeto.status_geral === 'quitado' ? CheckCircle2 :
                                    projeto.status_geral === 'em_atraso' ? AlertCircle : Clock

                  return (
                    <tr key={projeto.id} className="border-t border-white/5">
                      <td className="py-3 text-white font-medium">{projeto.cliente_nome}</td>
                      <td className="py-3 text-white/60 truncate max-w-[200px]">{projeto.descricao || '—'}</td>
                      <td className="py-3 text-white/60">{projeto.vendedor?.nome || '—'}</td>
                      <td className="py-3 text-right text-white tabular-nums">{formatBRL(projeto.valor_total)}</td>
                      <td className="py-3 text-right tabular-nums" style={{ color: '#00d68f99' }}>
                        {formatBRL(projeto.valor_recebido)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${projeto.progresso_pct}%`, background: statusColor }}
                            />
                          </div>
                          <span className="text-xs tabular-nums" style={{ color: statusColor }}>
                            {projeto.progresso_pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}
                        >
                          <StatusIcon size={12} />
                          {projeto.status_geral === 'quitado' ? 'Quitado' :
                           projeto.status_geral === 'em_atraso' ? 'Atraso' :
                           projeto.status_geral === 'cancelado' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}


// ── Componente principal ───────────────────────────────────────────────────────

export default function Relatorios() {
  const { permissoes, vendedorDbId } = useAuthStore()
  const { vendedores } = useVendedores()

  const isGestor = Boolean(permissoes?.relatorios) && !vendedorDbId

  const [aba, setAba] = useState<Aba>('visao_geral')

  const abas: { key: Aba; label: string; icon: React.ReactNode; somenteGestor?: boolean }[] = [
    { key: 'visao_geral',   label: 'Visão Geral',          icon: <TrendingUp size={15} /> },
    { key: 'ranking',       label: 'Ranking de Vendedores', icon: <Users size={15} />,      somenteGestor: true },
    { key: 'projetos',      label: 'Projetos & Serviços',   icon: <FolderKanban size={15} /> },
    { key: 'comissoes',     label: 'Comissões',             icon: <DollarSign size={15} /> },
  ]

  const abasVisiveis = abas.filter(a => !a.somenteGestor || isGestor)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white">Relatórios Gerenciais</h2>
        <p className="text-sm text-white/40 font-medium mt-0.5">
          {isGestor ? 'Visão completa do time' : 'Seu desempenho'}
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {abasVisiveis.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            style={aba === a.key
              ? { background: 'rgba(0,214,143,0.15)', border: '1px solid rgba(0,214,143,0.3)', color: '#00d68f' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
            }
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'visao_geral' && (
        <TabVisaoGeral
          vendedorIdFiltro={vendedorDbId}
          isGestor={isGestor}
          vendedores={vendedores}
        />
      )}
      {aba === 'ranking' && isGestor && (
        <TabRanking vendedores={vendedores} />
      )}
      {aba === 'por_vendedor' && (
        <TabPorVendedor
          vendedorIdFiltro={vendedorDbId}
          isGestor={isGestor}
          vendedores={vendedores}
        />
      )}
      {aba === 'projetos' && (
        <TabProjetos vendedorIdFiltro={vendedorDbId} />
      )}
      {aba === 'comissoes' && (
        <TabComissoesPagamento
          vendedorIdFiltro={vendedorDbId}
          isGestor={isGestor}
          vendedores={vendedores}
        />
      )}
    </div>
  )
}
