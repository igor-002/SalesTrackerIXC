/**
 * Fase 4 — Relatórios Gerenciais
 * 3 abas: Visão Geral · Ranking de Vendedores · Por Vendedor
 */
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import {
  FileText, Users, User, TrendingUp, DollarSign, Percent,
  Target, ChevronDown, Check, Edit2, X, Zap, Clock, FolderKanban,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useAuthStore } from '@/store/authStore'
import { useVendedores } from '@/hooks/useVendedores'
import { useMetas } from '@/hooks/useMetas'
import { useMetasVendedor } from '@/hooks/useMetasVendedor'
import {
  useRelatoriosMes,
  useRelatoriosRange,
  calcKpis,
  calcForecast,
  calcArpuPorSegmento,
  calcTempoAtivacao,
  agruparPorMes,
  ultimosMeses,
} from '@/hooks/useRelatoriosIxc'
import { useEvolucao6Meses } from '@/hooks/useVendasHistorico'
import { formatBRL, formatPercent } from '@/lib/formatters'
import { useVendasUnicas } from '@/hooks/useVendasUnicas'

// ── Constantes ───────────────────────────────────────────────────────────────

const MESES_LABELS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

type Aba = 'visao_geral' | 'ranking' | 'por_vendedor' | 'projetos'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, accentHex, sub }: {
  label: string; value: string; icon: React.ReactNode; accentHex: string; sub?: string
}) {
  return (
    <div
      className="rounded-lg p-5 relative overflow-hidden flex flex-col gap-3 bg-white border border-[#e4e4e7]"
      style={{ borderTop: `2px solid ${accentHex}` }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accentHex}15`, color: accentHex }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#09090b] tracking-tight">{value}</p>
        <p className="text-xs font-medium text-[#71717a] mt-0.5">{label}</p>
        {sub && <p className="text-xs text-[#a1a1aa] mt-0.5">{sub}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
    </div>
  )
}

// ── Tooltip Recharts ───────────────────────────────────────────────────────────

function LightTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2.5 text-xs shadow-lg bg-white border border-[#e4e4e7]">
      {label && <p className="text-[#71717a] mb-1.5 font-medium">{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Seletor Mês/Ano ───────────────────────────────────────────────────────────

function MesAnoSelect({ mes, ano, onChangeMes, onChangeAno }: {
  mes: number; ano: number; onChangeMes: (m: number) => void; onChangeAno: (a: number) => void
}) {
  const anos = [ano - 1, ano, ano + 1].filter(a => a >= 2024)
  const selectStyle = {
    background: '#ffffff',
    border: '1px solid #e4e4e7',
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={mes}
        onChange={e => onChangeMes(Number(e.target.value))}
        className="px-3 py-1.5 rounded-md text-xs text-[#09090b] outline-none cursor-pointer focus:ring-2 focus:ring-[#09090b]/10"
        style={selectStyle}
      >
        {MESES_LABELS.map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}
      </select>
      <select
        value={ano}
        onChange={e => onChangeAno(Number(e.target.value))}
        className="px-3 py-1.5 rounded-md text-xs text-[#09090b] outline-none cursor-pointer focus:ring-2 focus:ring-[#09090b]/10"
        style={selectStyle}
      >
        {anos.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  )
}

// ── Aba 1: Visão Geral ────────────────────────────────────────────────────────

function TabVisaoGeral({ vendedorIdFiltro, isGestor, vendedores }: {
  vendedorIdFiltro: string | null
  isGestor: boolean
  vendedores: { id: string; nome: string; ativo: boolean | null; meta_mensal?: number | null }[]
}) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [vendedorLocal, setVendedorLocal] = useState<string | null>(null)

  const vendedorEfetivo = isGestor ? vendedorLocal : vendedorIdFiltro
  const { data: contratos = [], isFetching } = useRelatoriosMes(mes, ano, vendedorEfetivo)
  const meses6 = useMemo(() => ultimosMeses(6, mes, ano), [mes, ano])
  const { data: contratosRange = [] } = useRelatoriosRange(meses6, vendedorEfetivo)
  const { totalTime: evolucao6Meses, porVendedor: evolucaoPorVendedor } = useEvolucao6Meses(vendedorEfetivo)
  const { getMetaAtual } = useMetas()
  const metaAtual = getMetaAtual()
  const metaTime = metaAtual?.meta_mensal ?? 0

  const kpis = useMemo(() => calcKpis(contratos), [contratos])
  const pctMeta = metaTime > 0 ? Math.min((kpis.ativos / metaTime) * 100, 100) : 0

  const chartData = useMemo(() => {
    if (evolucao6Meses.length > 0) {
      return evolucao6Meses.map(e => ({
        mesLabel: e.mesLabel,
        mes: e.mes,
        ano: e.ano,
        total: e.total_contratos,
        ativos: e.total_contratos,
        aguardando: 0,
        tipo: e.tipo,
      }))
    }
    return agruparPorMes(contratosRange, meses6)
  }, [evolucao6Meses, contratosRange, meses6])
  const forecast  = useMemo(() => calcForecast(contratos, mes, ano), [contratos, mes, ano])
  const arpuList  = useMemo(() => calcArpuPorSegmento(contratos), [contratos])
  const tempoAtiv = useMemo(() => calcTempoAtivacao(contratos), [contratos])

  return (
    <div className="flex flex-col gap-5">
      {/* Filtros */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-[#71717a]">Período</p>
            <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
          </div>
          {isGestor && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-[#71717a]">Vendedor</p>
              <select
                value={vendedorLocal ?? ''}
                onChange={e => setVendedorLocal(e.target.value || null)}
                className="px-3 py-1.5 rounded-md text-xs text-[#09090b] outline-none cursor-pointer bg-white border border-[#e4e4e7] focus:ring-2 focus:ring-[#09090b]/10"
              >
                <option value="">Todos</option>
                {vendedores.filter(v => v.ativo).map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </GlassCard>

      {isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard label="Total Cadastrados"     value={String(kpis.total)}              icon={<FileText size={18} />}   accentHex="#71717a" />
            <KpiCard label="Aguardando Assinatura" value={String(kpis.aguardando)}         icon={<ChevronDown size={18} />} accentHex="#1d4ed8" />
            <KpiCard label="Contratos Ativos"      value={String(kpis.ativos)}             icon={<Check size={18} />}      accentHex="#15803d" />
            <KpiCard label="Ticket Médio"          value={formatBRL(kpis.ticketMedio)}     icon={<DollarSign size={18} />} accentHex="#b45309" sub="por contrato ativo" />
            <KpiCard label="Taxa de Conversão"    value={formatPercent(kpis.taxaConversao)} icon={<Percent size={18} />}  accentHex="#7c3aed" sub="ativos ÷ total" />
          </div>

          {/* Meta + Forecast */}
          {isGestor && metaTime > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-[#15803d]" />
                    <span className="text-sm font-semibold text-[#09090b]">Meta do Time — {MESES_LABELS[mes - 1]}</span>
                  </div>
                  <span className="text-sm font-bold text-[#15803d]">
                    {kpis.ativos} / {metaTime} ativos ({pctMeta.toFixed(0)}%)
                  </span>
                </div>
                <ProgressBar value={pctMeta} color={pctMeta >= 100 ? 'success' : pctMeta >= 60 ? 'primary' : 'warning'} size="lg" emptyLabel="Mês iniciando" />
              </GlassCard>

              {forecast ? (() => {
                const pctForecast = metaTime > 0 ? (forecast.forecast / metaTime) * 100 : 0
                const accentHex = pctForecast >= 100 ? '#15803d' : pctForecast >= 50 ? '#b45309' : '#b91c1c'
                const label = pctForecast >= 100 ? 'Meta atingível' : pctForecast >= 50 ? 'Abaixo do ritmo' : 'Ritmo crítico'
                return (
                  <GlassCard className="p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={15} style={{ color: accentHex }} />
                      <span className="text-sm font-semibold text-[#09090b]">Projeção de fechamento</span>
                      <span
                        className="ml-auto text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{ background: `${accentHex}15`, color: accentHex, border: `1px solid ${accentHex}30` }}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-[#09090b] tracking-tight">{formatBRL(forecast.forecast)}</p>
                    <p className="text-xs text-[#71717a] mt-1">
                      {pctForecast.toFixed(0)}% da meta · baseado em {forecast.passadosDU}/{forecast.totalDU} dias úteis
                    </p>
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
                  </GlassCard>
                )
              })() : (
                <GlassCard className="p-5 flex items-center gap-3">
                  <Zap size={15} className="text-[#a1a1aa]" />
                  <span className="text-sm text-[#71717a]">Projeção disponível a partir do 1º dia útil</span>
                </GlassCard>
              )}
            </div>
          )}

          {/* Tempo médio de ativação + ARPU por segmento */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={15} className="text-[#1d4ed8]" />
                <span className="text-sm font-semibold text-[#09090b]">Tempo médio de ativação</span>
                <span className="ml-auto text-xs text-[#a1a1aa]">cadastro → ativação no IXC</span>
              </div>
              {tempoAtiv ? (
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-3xl font-bold text-[#09090b] tracking-tight">{tempoAtiv.mediaDias.toFixed(1)}<span className="text-base font-normal text-[#71717a] ml-1">dias</span></p>
                    <p className="text-xs text-[#71717a] mt-1">média do time · {tempoAtiv.amostra} contrato{tempoAtiv.amostra !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-[#71717a] mb-1">
                    <div>
                      <p className="font-semibold text-[#15803d]">{tempoAtiv.melhorCaso}d</p>
                      <p>melhor</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#b45309]">{tempoAtiv.piorCaso}d</p>
                      <p>pior</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#71717a]">Sem dados de ativação no período.</p>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={15} className="text-[#b45309]" />
                <span className="text-sm font-semibold text-[#09090b]">ARPU por segmento</span>
                <span className="ml-auto text-xs text-[#a1a1aa]">contratos ativos</span>
              </div>
              {arpuList.length === 0 ? (
                <p className="text-sm text-[#71717a]">Sem contratos ativos no período.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {arpuList.map((s, i) => (
                    <div key={s.nome} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-[#71717a] truncate">{s.nome}</span>
                      {i === 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
                          mais rentável
                        </span>
                      )}
                      <span className="text-xs text-[#a1a1aa] w-14 text-right tabular-nums">{s.contratos} contr.</span>
                      <span className="text-sm font-semibold text-[#09090b] tabular-nums w-28 text-right">{formatBRL(s.arpu)}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Gráfico 6 meses */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#09090b]">Evolução — 6 meses</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />
                  <span className="text-[#71717a]">Real</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" />
                  <span className="text-[#71717a]">Atual</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]/40" />
                  <span className="text-[#71717a]">Projeção</span>
                </span>
              </div>
            </div>
            {chartData.every(d => d.total === 0) ? (
              <p className="text-sm text-[#71717a] text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip content={<LightTooltip />} />
                  <Bar
                    dataKey="ativos"
                    name="Contratos"
                    radius={[3,3,0,0]}
                    fill="#15803d"
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props
                      const tipo = payload?.tipo
                      const fill = tipo === 'projecao' ? '#15803d60' : tipo === 'atual' ? '#1d4ed8' : '#15803d'
                      return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} ry={3} />
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Tabela Performance por Vendedor */}
          {isGestor && evolucaoPorVendedor.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-[#09090b] mb-4">Performance por Vendedor — Histórico</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e4e4e7]">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#71717a]">Vendedor</th>
                      {evolucao6Meses.map(m => (
                        <th
                          key={`${m.mes}-${m.ano}`}
                          className="text-center px-2 py-2 text-xs font-semibold uppercase tracking-wider"
                          style={{
                            color: m.tipo === 'projecao' ? '#a1a1aa' : m.tipo === 'atual' ? '#1d4ed8' : '#71717a'
                          }}
                        >
                          {m.mesLabel}
                          {m.tipo === 'projecao' && <span className="text-[9px] ml-0.5">(proj)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evolucaoPorVendedor.map(v => (
                      <tr key={v.vendedor_id} className="hover:bg-[#fafafa]" style={{ borderBottom: '1px solid #f4f4f5' }}>
                        <td className="px-3 py-2.5 text-[#09090b] font-medium">{v.vendedor_nome}</td>
                        {v.meses.map(m => (
                          <td
                            key={`${v.vendedor_id}-${m.mes}-${m.ano}`}
                            className="text-center px-2 py-2.5 tabular-nums"
                            style={{ color: m.tipo === 'projecao' ? '#a1a1aa' : '#71717a' }}
                          >
                            <span className="font-semibold">{m.total_contratos}</span>
                            <br />
                            <span className="text-xs text-[#a1a1aa]">{formatBRL(m.valor_total)}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="font-bold border-t border-[#e4e4e7]">
                      <td className="px-3 py-2.5 text-[#09090b]">Total Time</td>
                      {evolucao6Meses.map(m => (
                        <td
                          key={`total-${m.mes}-${m.ano}`}
                          className="text-center px-2 py-2.5 tabular-nums"
                          style={{ color: m.tipo === 'projecao' ? '#a1a1aa' : '#15803d' }}
                        >
                          <span>{m.total_contratos}</span>
                          <br />
                          <span className="text-xs" style={{ color: m.tipo === 'projecao' ? '#a1a1aa' : '#15803d' }}>
                            {formatBRL(m.valor_total)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
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
          <p className="text-xs font-medium text-[#71717a]">Período</p>
          <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e4e4e7]">
          <h3 className="text-sm font-semibold text-[#09090b]">Ranking de Vendedores</h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Clique no ícone para definir a meta individual</p>
        </div>
        {isFetching || loadingMetas ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-[#71717a] px-5 py-8 text-center">Nenhum dado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#a1a1aa] w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#71717a]">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#71717a]">Ativos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#71717a]">Aguardando</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#71717a]">Meta</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-[#71717a] min-w-[160px]">% Atingimento</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.id} className="hover:bg-[#fafafa] transition-colors" style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td className="px-4 py-3 text-[#a1a1aa] font-bold tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-[#09090b]">{r.nome}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-[#15803d]">{r.ativos}</td>
                    <td className="px-4 py-3 tabular-nums text-[#1d4ed8]">{r.aguardando}</td>
                    <td className="px-4 py-3">
                      {editando?.vendedorId === r.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            value={editando.valor}
                            onChange={e => setEditando({ vendedorId: r.id, valor: Number(e.target.value) })}
                            className="w-16 px-2 py-1 rounded-md text-xs text-[#09090b] outline-none tabular-nums bg-white border border-[#15803d]"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveMeta(r.id, editando.valor)}
                            className="text-[#15803d] hover:text-[#166534] transition-colors cursor-pointer"
                          ><Check size={14} /></button>
                          <button
                            onClick={() => setEditando(null)}
                            className="text-[#a1a1aa] hover:text-[#71717a] transition-colors cursor-pointer"
                          ><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[#71717a] tabular-nums">{r.meta > 0 ? r.meta : '—'}</span>
                          <button
                            onClick={() => setEditando({ vendedorId: r.id, valor: r.meta })}
                            className="text-[#a1a1aa] hover:text-[#71717a] transition-colors cursor-pointer"
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
                          <span className="text-xs font-semibold text-[#71717a] w-10 text-right tabular-nums">{r.pct.toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span className="text-[#a1a1aa] text-xs">sem meta</span>
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
  vendedores: { id: string; nome: string; ativo: boolean | null; meta_mensal?: number | null }[]
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
  const meta  = getMetaVendedor(vendedorEfetivo ?? '')
  const pctMeta = meta > 0 ? Math.min((kpis.ativos / meta) * 100, 200) : 0

  const chartData = useMemo(() => agruparPorMes(contratosRange, meses4), [contratosRange, meses4])

  const nomeVendedor = vendedorEfetivo
    ? (vendedores.find(v => v.id === vendedorEfetivo)?.nome ?? 'Vendedor')
    : 'Todos'

  const cancelamentos = contratos.filter(c => c.status_ixc === 'C').length
  const taxaConversaoInd = contratos.length > 0 ? (kpis.ativos / contratos.length) * 100 : 0
  const tempoAtivInd = useMemo(() => calcTempoAtivacao(contratos), [contratos])
  const metaIndividual = vendedores.find(v => v.id === vendedorEfetivo)?.meta_mensal ?? null
  const pctMetaInd = metaIndividual && metaIndividual > 0
    ? Math.min((kpis.ativos / metaIndividual) * 100, 200)
    : null

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
      if (!vid || c.status_ixc !== 'C') continue
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
              <p className="text-xs font-medium text-[#71717a]">Vendedor</p>
              <select
                value={vendedorSel ?? ''}
                onChange={e => setVendedorSel(e.target.value || null)}
                className="px-3 py-1.5 rounded-md text-xs text-[#09090b] outline-none cursor-pointer bg-white border border-[#e4e4e7] focus:ring-2 focus:ring-[#09090b]/10"
              >
                <option value="">Todos</option>
                {vendedores.filter(v => v.ativo).map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-[#71717a]">Período</p>
            <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
          </div>
        </div>
      </GlassCard>

      {isFetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Contratos Ativos"      value={String(kpis.ativos)}              icon={<Check size={18} />}      accentHex="#15803d" />
            <KpiCard label="Aguardando Assinatura" value={String(kpis.aguardando)}          icon={<ChevronDown size={18} />} accentHex="#1d4ed8" />
            <KpiCard label="% da Meta"             value={meta > 0 ? formatPercent(pctMeta) : '—'} icon={<Target size={18} />} accentHex="#7c3aed" sub={meta > 0 ? `meta: ${meta}` : 'sem meta definida'} />
            <KpiCard label="Ticket Médio"          value={formatBRL(kpis.ticketMedio)}     icon={<DollarSign size={18} />} accentHex="#b45309" sub="por contrato ativo" />
          </div>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h3 className="text-sm font-semibold text-[#09090b]">Perfil de desempenho — {nomeVendedor}</h3>
              {badgeDestaque && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
                  ★ Melhor conversão do time
                </span>
              )}
              {badgeAtencao && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
                  ⚠ Mais cancelamentos do time
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
              <div>
                <p className="text-xs text-[#71717a] mb-1">Taxa de conversão</p>
                <p className="text-xl font-bold text-[#09090b]">{formatPercent(taxaConversaoInd)}</p>
                <p className="text-xs text-[#a1a1aa] mt-0.5">ativos ÷ total cadastrados</p>
              </div>
              <div>
                <p className="text-xs text-[#71717a] mb-1">Tempo médio de ativação</p>
                {tempoAtivInd ? (
                  <>
                    <p className="text-xl font-bold text-[#09090b]">{tempoAtivInd.mediaDias.toFixed(1)}<span className="text-sm font-normal text-[#71717a] ml-1">dias</span></p>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">melhor {tempoAtivInd.melhorCaso}d · pior {tempoAtivInd.piorCaso}d</p>
                  </>
                ) : (
                  <p className="text-sm text-[#a1a1aa]">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#71717a] mb-1">Cancelamentos no período</p>
                <p className="text-xl font-bold" style={{ color: cancelamentos > 0 ? '#b91c1c' : '#71717a' }}>{cancelamentos}</p>
                <p className="text-xs text-[#a1a1aa] mt-0.5">contratos com status C</p>
              </div>
              <div>
                <p className="text-xs text-[#71717a] mb-1">Meta individual</p>
                {metaIndividual && metaIndividual > 0 ? (
                  <>
                    <p className="text-xl font-bold text-[#09090b]">{pctMetaInd?.toFixed(0)}%</p>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">{kpis.ativos} de {metaIndividual} contratos</p>
                  </>
                ) : (
                  <p className="text-sm text-[#a1a1aa]">Não definida</p>
                )}
              </div>
            </div>
            {metaIndividual && metaIndividual > 0 && pctMetaInd !== null && (
              <div className="mt-4 pt-4 border-t border-[#e4e4e7]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#71717a]">Progresso vs. meta individual</span>
                  <span className="text-xs font-semibold" style={{ color: (pctMetaInd ?? 0) >= 100 ? '#15803d' : '#b45309' }}>{kpis.ativos} / {metaIndividual}</span>
                </div>
                <ProgressBar value={Math.min(pctMetaInd, 100)} color={(pctMetaInd ?? 0) >= 100 ? 'success' : (pctMetaInd ?? 0) >= 60 ? 'primary' : 'warning'} size="md" emptyLabel="Mês iniciando" />
              </div>
            )}
          </GlassCard>

          {meta > 0 && (
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-[#15803d]" />
                  <span className="text-sm font-semibold text-[#09090b]">Meta — {nomeVendedor}</span>
                </div>
                <span className="text-sm font-bold text-[#15803d]">
                  {kpis.ativos} / {meta} ativos
                </span>
              </div>
              <ProgressBar value={Math.min(pctMeta, 100)} color={pctMeta >= 100 ? 'success' : pctMeta >= 60 ? 'primary' : 'warning'} size="lg" emptyLabel="Mês iniciando" />
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[#09090b] mb-4">Evolução — últimos 4 meses · {nomeVendedor}</h3>
            {chartData.every(d => d.total === 0) ? (
              <p className="text-sm text-[#71717a] text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip content={<LightTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
                  <Bar dataKey="ativos"     name="Ativos"      fill="#15803d" radius={[3,3,0,0]} />
                  <Bar dataKey="aguardando" name="Aguardando"  fill="#1d4ed8" radius={[3,3,0,0]} />
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

function TabProjetos() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltroProjeto>('todos')

  const { vendas, loading } = useVendasUnicas()

  const projetosMes = useMemo(() => {
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const fimMes = new Date(ano, mes, 0)
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimMes.getDate()).padStart(2, '0')}`

    return vendas.filter(v => v.data_venda >= inicio && v.data_venda <= fim)
  }, [vendas, mes, ano])

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
    { key: 'todos', label: 'Todos', color: '#7c3aed' },
    { key: 'pendente', label: 'Pendente', color: '#b45309' },
    { key: 'quitado', label: 'Quitados', color: '#15803d' },
    { key: 'em_atraso', label: 'Em Atraso', color: '#b91c1c' },
    { key: 'cancelado', label: 'Cancelados', color: '#71717a' },
  ]

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FolderKanban size={18} className="text-[#7c3aed]" />
            <span className="text-sm font-semibold text-[#09090b]">Projetos & Serviços</span>
            <span className="text-xs text-[#71717a]">(Vendas únicas - não contam na meta)</span>
          </div>
          <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {statusOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setStatusFiltro(opt.key)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer"
              style={statusFiltro === opt.key
                ? { background: `${opt.color}15`, color: opt.color, border: `1px solid ${opt.color}40` }
                : { background: '#f4f4f5', color: '#71717a', border: '1px solid #e4e4e7' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Total Projetos"
          value={String(metricas.total)}
          icon={<FolderKanban size={18} />}
          accentHex="#7c3aed"
        />
        <KpiCard
          label="Valor Vendido"
          value={formatBRL(metricas.valor_vendido)}
          icon={<DollarSign size={18} />}
          accentHex="#7c3aed"
        />
        <KpiCard
          label="Valor Recebido"
          value={formatBRL(metricas.valor_recebido)}
          icon={<CheckCircle2 size={18} />}
          accentHex="#15803d"
          sub={metricas.valor_vendido > 0 ? `${Math.round((metricas.valor_recebido / metricas.valor_vendido) * 100)}%` : '0%'}
        />
        <KpiCard
          label="Valor Pendente"
          value={formatBRL(metricas.valor_pendente)}
          icon={<Clock size={18} />}
          accentHex="#1d4ed8"
        />
        <KpiCard
          label="Em Atraso"
          value={formatBRL(metricas.valor_em_atraso)}
          icon={<AlertCircle size={18} />}
          accentHex="#b91c1c"
        />
      </div>

      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-[#09090b] mb-4">
          Projetos do Mês ({projetosFiltrados.length})
        </h3>

        {projetosFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <FolderKanban size={32} className="text-[#a1a1aa] mx-auto mb-2" />
            <p className="text-sm text-[#71717a]">Nenhum projeto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#71717a] text-xs uppercase tracking-wider border-b border-[#e4e4e7]">
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
                  const statusColor = projeto.status_geral === 'quitado' ? '#15803d' :
                                     projeto.status_geral === 'em_atraso' ? '#b91c1c' :
                                     projeto.status_geral === 'cancelado' ? '#71717a' : '#b45309'
                  const StatusIcon = projeto.status_geral === 'quitado' ? CheckCircle2 :
                                    projeto.status_geral === 'em_atraso' ? AlertCircle : Clock

                  return (
                    <tr key={projeto.id} className="border-t border-[#f4f4f5] hover:bg-[#fafafa]">
                      <td className="py-3 text-[#09090b] font-medium">{projeto.cliente_nome}</td>
                      <td className="py-3 text-[#71717a] truncate max-w-[200px]">{projeto.descricao || '—'}</td>
                      <td className="py-3 text-[#71717a]">{projeto.vendedor?.nome || '—'}</td>
                      <td className="py-3 text-right text-[#09090b] tabular-nums">{formatBRL(projeto.valor_total)}</td>
                      <td className="py-3 text-right tabular-nums text-[#15803d]">
                        {formatBRL(projeto.valor_recebido)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden bg-[#e4e4e7]">
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
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold"
                          style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}
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
    { key: 'por_vendedor',  label: 'Por Vendedor',          icon: <User size={15} /> },
    { key: 'projetos',      label: 'Projetos & Serviços',   icon: <FolderKanban size={15} /> },
  ]

  const abasVisiveis = abas.filter(a => !a.somenteGestor || isGestor)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[#09090b]">Relatórios Gerenciais</h2>
        <p className="text-sm text-[#71717a] font-medium mt-0.5">
          {isGestor ? 'Visão completa do time' : 'Seu desempenho'}
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {abasVisiveis.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={aba === a.key
              ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }
              : { background: '#f4f4f5', border: '1px solid #e4e4e7', color: '#71717a' }
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
        <TabProjetos />
      )}
    </div>
  )
}
