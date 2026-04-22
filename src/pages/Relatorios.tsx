/**
 * Fase 4 — Relatórios Gerenciais
 * 3 abas: Visão Geral · Ranking de Vendedores · Por Vendedor
 *
 * Acesso:
 *  - Gestores/donos (permissoes.relatorios = true, sem vendedorDbId): veem tudo
 *  - Vendedores (vendedorDbId definido): veem apenas os próprios dados, sem aba Ranking
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
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
    </div>
  )
}

// ── Tooltip escuro Recharts ───────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl" style={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)' }}>
      {label && <p className="text-white/50 mb-1.5 font-medium">{label}</p>}
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

  // Se vendedor (não gestor), forçar filtro para o próprio
  const vendedorEfetivo = isGestor ? vendedorLocal : vendedorIdFiltro

  // Dados do mês atual
  const { data: contratos = [], isFetching } = useRelatoriosMes(mes, ano, vendedorEfetivo)

  // Dados dos últimos 6 meses para o gráfico (fallback)
  const meses6 = useMemo(() => ultimosMeses(6, mes, ano), [mes, ano])
  const { data: contratosRange = [] } = useRelatoriosRange(meses6, vendedorEfetivo)

  // Dados de evolução com histórico (3 passados + atual + 2 projeção)
  const { totalTime: evolucao6Meses, porVendedor: evolucaoPorVendedor } = useEvolucao6Meses(vendedorEfetivo)

  // Metas do time
  const { getMetaAtual } = useMetas()
  const metaAtual = getMetaAtual()
  const metaTime = metaAtual?.meta_mensal ?? 0

  const kpis = useMemo(() => calcKpis(contratos), [contratos])
  const pctMeta = metaTime > 0 ? Math.min((kpis.ativos / metaTime) * 100, 100) : 0

  // Usa dados de evolução se disponíveis, senão fallback para dados antigos
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
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Período</p>
            <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
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

      {isFetching ? (
        <div className="flex justify-center py-12"><Spinner style={{ color: '#00d68f' }} /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            <KpiCard label="Total Cadastrados"     value={String(kpis.total)}              icon={<FileText size={18} />}   accentHex="#6b7280" />
            <KpiCard label="Aguardando Assinatura" value={String(kpis.aguardando)}         icon={<ChevronDown size={18} />} accentHex="#06b6d4" />
            <KpiCard label="Contratos Ativos"      value={String(kpis.ativos)}             icon={<Check size={18} />}      accentHex="#00d68f" />
            <KpiCard label="Ticket Médio"          value={formatBRL(kpis.ticketMedio)}     icon={<DollarSign size={18} />} accentHex="#f59e0b" sub="por contrato ativo" />
            <KpiCard label="Taxa de Conversão"     value={formatPercent(kpis.taxaConversao)} icon={<Percent size={18} />}  accentHex="#8b5cf6" sub="ativos ÷ total" />
          </div>

          {/* Meta + Forecast */}
          {isGestor && metaTime > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Meta do time */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Meta do Time — {MESES_LABELS[mes - 1]}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#00d68f' }}>
                    {kpis.ativos} / {metaTime} ativos ({pctMeta.toFixed(0)}%)
                  </span>
                </div>
                <ProgressBar value={pctMeta} color={pctMeta >= 100 ? 'success' : pctMeta >= 60 ? 'primary' : 'warning'} size="lg" emptyLabel="Mês iniciando" />
              </GlassCard>

              {/* Forecast */}
              {forecast ? (() => {
                const pctForecast = metaTime > 0 ? (forecast.forecast / metaTime) * 100 : 0
                const accentHex = pctForecast >= 100 ? '#00d68f' : pctForecast >= 50 ? '#f59e0b' : '#ef4444'
                const label = pctForecast >= 100 ? 'Meta atingível' : pctForecast >= 50 ? 'Abaixo do ritmo' : 'Ritmo crítico'
                return (
                  <GlassCard className="p-5 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={15} style={{ color: accentHex }} />
                      <span className="text-sm font-semibold text-white">Projeção de fechamento</span>
                      <span
                        className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${accentHex}18`, color: accentHex, border: `1px solid ${accentHex}30` }}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white tracking-tight">{formatBRL(forecast.forecast)}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {pctForecast.toFixed(0)}% da meta · baseado em {forecast.passadosDU}/{forecast.totalDU} dias úteis
                    </p>
                    <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
                  </GlassCard>
                )
              })() : (
                <GlassCard className="p-5 flex items-center gap-3">
                  <Zap size={15} className="text-white/20" />
                  <span className="text-sm text-white/30">Projeção disponível a partir do 1º dia útil</span>
                </GlassCard>
              )}
            </div>
          )}

          {/* Tempo médio de ativação + ARPU por segmento */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Tempo de ativação */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={15} className="text-cyan-400" />
                <span className="text-sm font-semibold text-white">Tempo médio de ativação</span>
                <span className="ml-auto text-xs text-white/30">cadastro → ativação no IXC</span>
              </div>
              {tempoAtiv ? (
                <div className="flex items-end gap-6">
                  <div>
                    <p className="text-3xl font-bold text-white tracking-tight">{tempoAtiv.mediaDias.toFixed(1)}<span className="text-base font-normal text-white/40 ml-1">dias</span></p>
                    <p className="text-xs text-white/40 mt-1">média do time · {tempoAtiv.amostra} contrato{tempoAtiv.amostra !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-white/40 mb-1">
                    <div>
                      <p className="font-semibold text-emerald-400">{tempoAtiv.melhorCaso}d</p>
                      <p>melhor</p>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-400">{tempoAtiv.piorCaso}d</p>
                      <p>pior</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/30">Sem dados de ativação no período.</p>
              )}
            </GlassCard>

            {/* ARPU por segmento */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={15} className="text-amber-400" />
                <span className="text-sm font-semibold text-white">ARPU por segmento</span>
                <span className="ml-auto text-xs text-white/30">contratos ativos</span>
              </div>
              {arpuList.length === 0 ? (
                <p className="text-sm text-white/30">Sem contratos ativos no período.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {arpuList.map((s, i) => (
                    <div key={s.nome} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-white/70 truncate">{s.nome}</span>
                      {i === 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                          mais rentável
                        </span>
                      )}
                      <span className="text-xs text-white/40 w-14 text-right tabular-nums">{s.contratos} contr.</span>
                      <span className="text-sm font-semibold text-white tabular-nums w-28 text-right">{formatBRL(s.arpu)}</span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Gráfico 6 meses com cores por tipo */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Evolução — 6 meses</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00d68f' }} />
                  <span className="text-white/40">Real</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#06b6d4' }} />
                  <span className="text-white/40">Atual</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00d68f40' }} />
                  <span className="text-white/40">Projeção</span>
                </span>
              </div>
            </div>
            {chartData.every(d => d.total === 0) ? (
              <p className="text-sm text-white/30 text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="ativos"
                    name="Contratos"
                    radius={[3,3,0,0]}
                    fill="#00d68f"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props
                      const tipo = payload?.tipo
                      const fill = tipo === 'projecao' ? '#00d68f40' : tipo === 'atual' ? '#06b6d4' : '#00d68f'
                      return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} ry={3} />
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Tabela Performance por Vendedor — Histórico */}
          {isGestor && evolucaoPorVendedor.length > 0 && (
            <GlassCard className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Performance por Vendedor — Histórico</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">Vendedor</th>
                      {evolucao6Meses.map(m => (
                        <th
                          key={`${m.mes}-${m.ano}`}
                          className="text-center px-2 py-2 text-xs font-semibold uppercase tracking-wider"
                          style={{
                            color: m.tipo === 'projecao' ? 'rgba(255,255,255,0.25)' : m.tipo === 'atual' ? '#06b6d4' : 'rgba(255,255,255,0.4)'
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
                      <tr key={v.vendedor_id} className="hover:bg-white/3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-3 py-2.5 text-white font-medium">{v.vendedor_nome}</td>
                        {v.meses.map(m => (
                          <td
                            key={`${v.vendedor_id}-${m.mes}-${m.ano}`}
                            className="text-center px-2 py-2.5 tabular-nums"
                            style={{ color: m.tipo === 'projecao' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)' }}
                          >
                            <span className="font-semibold">{m.total_contratos}</span>
                            <br />
                            <span className="text-xs text-white/30">{formatBRL(m.valor_total)}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Linha de total */}
                    <tr className="font-bold" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <td className="px-3 py-2.5 text-white">Total Time</td>
                      {evolucao6Meses.map(m => (
                        <td
                          key={`total-${m.mes}-${m.ano}`}
                          className="text-center px-2 py-2.5 tabular-nums"
                          style={{ color: m.tipo === 'projecao' ? 'rgba(255,255,255,0.4)' : '#00d68f' }}
                        >
                          <span>{m.total_contratos}</span>
                          <br />
                          <span className="text-xs" style={{ color: m.tipo === 'projecao' ? 'rgba(255,255,255,0.25)' : 'rgba(0,214,143,0.6)' }}>
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

  // Agrupa por vendedor
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
  vendedores: { id: string; nome: string; ativo: boolean | null; meta_mensal?: number | null }[]
}) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())

  // Vendedor selecionado: gestor pode escolher, vendedor está bloqueado no próprio
  const primeiroVendedor = vendedores.find(v => v.ativo)?.id ?? null
  const [vendedorSel, setVendedorSel] = useState<string | null>(
    isGestor ? primeiroVendedor : vendedorIdFiltro
  )

  const vendedorEfetivo = isGestor ? vendedorSel : vendedorIdFiltro

  const { data: contratos = [], isFetching } = useRelatoriosMes(mes, ano, vendedorEfetivo)
  // Dados do time completo para badges comparativos (cached pelo React Query)
  const { data: contratosTime = [] } = useRelatoriosMes(mes, ano, null)
  const { getMetaVendedor } = useMetasVendedor(mes, ano)

  // Últimos 4 meses para o gráfico
  const meses4 = useMemo(() => ultimosMeses(4, mes, ano), [mes, ano])
  const { data: contratosRange = [] } = useRelatoriosRange(meses4, vendedorEfetivo)

  const kpis = useMemo(() => calcKpis(contratos), [contratos])
  const meta  = getMetaVendedor(vendedorEfetivo ?? '')
  const pctMeta = meta > 0 ? Math.min((kpis.ativos / meta) * 100, 200) : 0

  const chartData = useMemo(() => agruparPorMes(contratosRange, meses4), [contratosRange, meses4])

  const nomeVendedor = vendedorEfetivo
    ? (vendedores.find(v => v.id === vendedorEfetivo)?.nome ?? 'Vendedor')
    : 'Todos'

  // Métricas expandidas do vendedor selecionado
  const cancelamentos = contratos.filter(c => c.status_ixc === 'C').length
  const taxaConversaoInd = contratos.length > 0 ? (kpis.ativos / contratos.length) * 100 : 0
  const tempoAtivInd = useMemo(() => calcTempoAtivacao(contratos), [contratos])
  const metaIndividual = vendedores.find(v => v.id === vendedorEfetivo)?.meta_mensal ?? null
  const pctMetaInd = metaIndividual && metaIndividual > 0
    ? Math.min((kpis.ativos / metaIndividual) * 100, 200)
    : null

  // Badges: comparativo com o time
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
      {/* Filtros */}
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
          {/* KPIs do vendedor */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Contratos Ativos"      value={String(kpis.ativos)}              icon={<Check size={18} />}      accentHex="#00d68f" />
            <KpiCard label="Aguardando Assinatura" value={String(kpis.aguardando)}          icon={<ChevronDown size={18} />} accentHex="#06b6d4" />
            <KpiCard label="% da Meta"             value={meta > 0 ? formatPercent(pctMeta) : '—'} icon={<Target size={18} />} accentHex="#8b5cf6" sub={meta > 0 ? `meta: ${meta}` : 'sem meta definida'} />
            <KpiCard label="Ticket Médio"          value={formatBRL(kpis.ticketMedio)}     icon={<DollarSign size={18} />} accentHex="#f59e0b" sub="por contrato ativo" />
          </div>

          {/* Métricas expandidas (Fase 3 — Tarefa 3.4) */}
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
              {/* Taxa de conversão individual */}
              <div>
                <p className="text-xs text-white/40 mb-1">Taxa de conversão</p>
                <p className="text-xl font-bold text-white">{formatPercent(taxaConversaoInd)}</p>
                <p className="text-xs text-white/30 mt-0.5">ativos ÷ total cadastrados</p>
              </div>
              {/* Tempo médio de ativação */}
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
              {/* Cancelamentos */}
              <div>
                <p className="text-xs text-white/40 mb-1">Cancelamentos no período</p>
                <p className="text-xl font-bold" style={{ color: cancelamentos > 0 ? '#ef4444' : 'rgba(255,255,255,0.7)' }}>{cancelamentos}</p>
                <p className="text-xs text-white/30 mt-0.5">contratos com status C</p>
              </div>
              {/* Meta individual (vendedores.meta_mensal) */}
              <div>
                <p className="text-xs text-white/40 mb-1">Meta individual</p>
                {metaIndividual && metaIndividual > 0 ? (
                  <>
                    <p className="text-xl font-bold text-white">{pctMetaInd?.toFixed(0)}%</p>
                    <p className="text-xs text-white/30 mt-0.5">{kpis.ativos} de {metaIndividual} contratos</p>
                  </>
                ) : (
                  <p className="text-sm text-white/30">Não definida</p>
                )}
              </div>
            </div>
            {/* Barra de progresso vs meta individual */}
            {metaIndividual && metaIndividual > 0 && pctMetaInd !== null && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">Progresso vs. meta individual</span>
                  <span className="text-xs font-semibold" style={{ color: (pctMetaInd ?? 0) >= 100 ? '#00d68f' : '#f59e0b' }}>{kpis.ativos} / {metaIndividual}</span>
                </div>
                <ProgressBar value={Math.min(pctMetaInd, 100)} color={(pctMetaInd ?? 0) >= 100 ? 'success' : (pctMetaInd ?? 0) >= 60 ? 'primary' : 'warning'} size="md" emptyLabel="Mês iniciando" />
              </div>
            )}
          </GlassCard>

          {/* Barra de meta individual (metas_vendedor) */}
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

          {/* Gráfico 4 meses */}
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
                  <Bar dataKey="ativos"     name="Ativos"      fill="#00d68f" radius={[3,3,0,0]} />
                  <Bar dataKey="aguardando" name="Aguardando"  fill="#06b6d4" radius={[3,3,0,0]} />
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

  // Filtrar por mês/ano
  const projetosMes = useMemo(() => {
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const fimMes = new Date(ano, mes, 0)
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimMes.getDate()).padStart(2, '0')}`

    return vendas.filter(v => v.data_venda >= inicio && v.data_venda <= fim)
  }, [vendas, mes, ano])

  // Filtrar por status
  const projetosFiltrados = useMemo(() => {
    if (statusFiltro === 'todos') return projetosMes
    return projetosMes.filter(v => v.status_geral === statusFiltro)
  }, [projetosMes, statusFiltro])

  // Métricas agregadas
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
      {/* Filtros */}
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FolderKanban size={18} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Projetos & Serviços</span>
            <span className="text-xs text-white/40">(Vendas únicas - não contam na meta)</span>
          </div>
          <MesAnoSelect mes={mes} ano={ano} onChangeMes={setMes} onChangeAno={setAno} />
        </div>

        {/* Filtro de status */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Total Projetos"
          value={String(metricas.total)}
          icon={<FolderKanban size={18} />}
          accentHex="#a78bfa"
        />
        <KpiCard
          label="Valor Vendido"
          value={formatBRL(metricas.valor_vendido)}
          icon={<DollarSign size={18} />}
          accentHex="#a78bfa"
        />
        <KpiCard
          label="Valor Recebido"
          value={formatBRL(metricas.valor_recebido)}
          icon={<CheckCircle2 size={18} />}
          accentHex="#00d68f"
          sub={metricas.valor_vendido > 0 ? `${Math.round((metricas.valor_recebido / metricas.valor_vendido) * 100)}%` : '0%'}
        />
        <KpiCard
          label="Valor Pendente"
          value={formatBRL(metricas.valor_pendente)}
          icon={<Clock size={18} />}
          accentHex="#06b6d4"
        />
        <KpiCard
          label="Em Atraso"
          value={formatBRL(metricas.valor_em_atraso)}
          icon={<AlertCircle size={18} />}
          accentHex="#ef4444"
        />
      </div>

      {/* Tabela de projetos */}
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

  // Gestor/dono: permissoes.relatorios = true e sem vínculo direto com vendedor
  // Vendedor: tem vendedorDbId definido
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
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Relatórios Gerenciais</h2>
        <p className="text-sm text-white/40 font-medium mt-0.5">
          {isGestor ? 'Visão completa do time' : 'Seu desempenho'}
        </p>
      </div>

      {/* Abas */}
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

      {/* Conteúdo */}
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
