import { useState } from 'react'
import {
  DollarSign, TrendingUp, Clock, Check, X, ChevronDown, ChevronUp,
  Edit2, RefreshCw, ArrowRightLeft,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { formatBRL } from '@/lib/formatters'
import { useAuthStore } from '@/store/authStore'
import { useComissaoConfig } from '@/hooks/useComissaoConfig'
import { useComissaoPagamentos } from '@/hooks/useComissaoPagamentos'

// ── Meses labels ──────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ── Componentes locais ────────────────────────────────────────────────────────

function MesAnoSelect({ mes, ano, onChangeMes, onChangeAno }: {
  mes: number; ano: number; onChangeMes: (m: number) => void; onChangeAno: (a: number) => void
}) {
  const anos = [ano - 1, ano, ano + 1].filter(a => a >= 2024)
  const selectStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' as const }
  const optStyle = { background: '#0f2419', color: '#fff' }
  return (
    <div className="flex items-center gap-2">
      <select value={mes} onChange={e => onChangeMes(Number(e.target.value))} className="px-3 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer" style={selectStyle}>
        {MESES.map((l, i) => <option key={i + 1} value={i + 1} style={optStyle}>{l}</option>)}
      </select>
      <select value={ano} onChange={e => onChangeAno(Number(e.target.value))} className="px-3 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer" style={selectStyle}>
        {anos.map(a => <option key={a} value={a} style={optStyle}>{a}</option>)}
      </select>
    </div>
  )
}

function KpiCard({ label, value, icon, accentHex, sub }: {
  label: string; value: string; icon: React.ReactNode; accentHex: string; sub?: string
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderTop: `2px solid ${accentHex}` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accentHex}18`, color: accentHex }}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs font-medium text-white/50 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
    </div>
  )
}

function formatData(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  vendedorIdFiltro: string | null
  isGestor: boolean
  vendedores: { id: string; nome: string; ativo: boolean | null }[]
}

export function TabComissoesPagamento({ vendedorIdFiltro, isGestor, vendedores }: Props) {
  const now = new Date()
  const { role } = useAuthStore()
  const isAdmin = role === 'admin' || isGestor

  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [vendedorLocal, setVendedorLocal] = useState<string | null>(null)
  const [pagasExpandidas, setPagasExpandidas] = useState(false)
  const [configExpanded, setConfigExpanded] = useState(false)

  // Config de % (gestor)
  const [editandoGlobal, setEditandoGlobal] = useState<number | ''>('')
  const [editandoVendedor, setEditandoVendedor] = useState<{ id: string; valor: number | '' } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const {
    padraoGlobal,
    vendedoresConfig,
    salvarPadraoGlobal,
    salvarPadraoVendedor,
    loading: loadingConfig,
  } = useComissaoConfig()

  const vendedorEfetivo = isGestor ? vendedorLocal : vendedorIdFiltro

  const { pendentes, pagas, totais, loading, syncing, error, marcarPago, marcarPendente, refetch } =
    useComissaoPagamentos({ mes, ano, vendedorId: vendedorEfetivo, isAdmin })

  console.log('[TAB] TabComissoesPagamento renderizou', { mes, ano, vendedorEfetivo })

  async function handleSalvarGlobal() {
    setSalvando(true)
    await salvarPadraoGlobal(editandoGlobal === '' ? null : Number(editandoGlobal))
    setSalvando(false)
    setEditandoGlobal('')
  }

  async function handleSalvarVendedor(vendedorId: string, valor: number | '') {
    setSalvando(true)
    await salvarPadraoVendedor(vendedorId, valor === '' ? null : Number(valor))
    setSalvando(false)
    setEditandoVendedor(null)
  }

  const COLS = ['Cliente', 'Plano', 'Valor Plano', '%', 'Comissão', 'Ativação', 'Ação']

  return (
    <div className="flex flex-col gap-6">

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
          {syncing && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Spinner size="sm" style={{ color: '#00d68f' }} />
              Sincronizando...
            </div>
          )}
          <button
            onClick={() => { console.log('[BTN] sincronizar clicado'); refetch() }}
            disabled={syncing || loading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={12} />
            Sincronizar
          </button>
        </div>
      </GlassCard>

      {/* Configuração de Comissões — somente gestor */}
      {isGestor && (
        <GlassCard className="overflow-hidden">
          <button
            onClick={() => setConfigExpanded(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-white/2"
          >
            <Edit2 size={14} className="text-violet-400 shrink-0" />
            <h3 className="text-sm font-semibold text-white">Configuração de Comissões</h3>
            <span className="text-xs text-white/30 ml-1">padrões e por vendedor</span>
            <span className="ml-auto text-white/30 shrink-0">
              {configExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>

          {configExpanded && (
            <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {loadingConfig ? (
                <div className="py-6 flex justify-center"><Spinner style={{ color: '#8b5cf6' }} /></div>
              ) : (
                <>
                  <div className="pt-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3">Padrão Global</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} max={100} step={0.5}
                          placeholder={padraoGlobal != null ? String(padraoGlobal) : '0'}
                          value={editandoGlobal}
                          onChange={e => setEditandoGlobal(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-20 px-3 py-1.5 rounded-lg text-sm text-white outline-none tabular-nums"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(139,92,246,0.3)' }}
                        />
                        <span className="text-sm text-white/50">%</span>
                      </div>
                      <button
                        onClick={handleSalvarGlobal}
                        disabled={salvando || editandoGlobal === ''}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-40"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                      >
                        <Check size={12} />Salvar
                      </button>
                      <span className="text-xs text-white/30">
                        {padraoGlobal != null ? `Atual: ${padraoGlobal}%` : 'Nenhum padrão definido'}
                      </span>
                    </div>
                    <p className="text-xs text-white/25 mt-2">Aplicado a vendedores sem % individual configurado</p>
                  </div>

                  <div className="pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3">Por Vendedor</p>
                    <div className="flex flex-col gap-2">
                      {vendedoresConfig.map(v => {
                        const temOverride = v.comissao_pct_padrao != null
                        const isEditando = editandoVendedor?.id === v.id
                        return (
                          <div key={v.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="text-sm text-white/80 w-40 truncate shrink-0">{v.nome}</span>
                            {isEditando ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min={0} max={100} step={0.5}
                                  value={editandoVendedor.valor}
                                  onChange={e => setEditandoVendedor({ id: v.id, valor: e.target.value === '' ? '' : Number(e.target.value) })}
                                  className="w-16 px-2 py-1 rounded-lg text-xs text-white outline-none tabular-nums"
                                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(0,214,143,0.3)' }}
                                  autoFocus
                                />
                                <span className="text-xs text-white/50">%</span>
                                <button onClick={() => handleSalvarVendedor(v.id, editandoVendedor.valor)} disabled={salvando} className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"><Check size={14} /></button>
                                <button onClick={() => setEditandoVendedor(null)} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm tabular-nums text-white/60 w-12">{temOverride ? `${v.comissao_pct_padrao}%` : '—'}</span>
                                <button onClick={() => setEditandoVendedor({ id: v.id, valor: v.comissao_pct_padrao ?? '' })} className="text-white/20 hover:text-white/60 transition-colors cursor-pointer"><Edit2 size={12} /></button>
                                {temOverride && (
                                  <button onClick={() => handleSalvarVendedor(v.id, '')} className="text-white/20 hover:text-red-400 transition-colors cursor-pointer" title="Remover override"><X size={12} /></button>
                                )}
                              </div>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={temOverride ? { background: 'rgba(0,214,143,0.08)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {temOverride ? 'personalizado' : 'usa padrão'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Loading / erro */}
      {error && (
        <GlassCard className="p-4">
          <p className="text-sm text-red-400">{error}</p>
        </GlassCard>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner style={{ color: '#00d68f' }} /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Pago" value={formatBRL(totais.pago)} icon={<Check size={18} />} accentHex="#00d68f" sub={`${pagas.length} contratos`} />
            <KpiCard label="Pendente" value={formatBRL(totais.pendente)} icon={<Clock size={18} />} accentHex="#f59e0b" sub={`${pendentes.length} contratos`} />
            <KpiCard label="Transferidas" value={formatBRL(totais.transferidas)} icon={<ArrowRightLeft size={18} />} accentHex="#8b5cf6" sub="ativadas após dia 20" />
            <KpiCard label="Total do Período" value={formatBRL(totais.total)} icon={<TrendingUp size={18} />} accentHex="#06b6d4" sub="pago + pendente" />
          </div>

          {/* Estado vazio */}
          {pendentes.length === 0 && pagas.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-white/20" />
              <p className="text-sm text-white/40 mb-4">
                Nenhuma comissão encontrada para {MESES[mes - 1]} / {ano}.
              </p>
              <button
                onClick={() => { console.log('[BTN] sincronizar clicado'); refetch() }}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-40"
                style={{ background: 'rgba(0,214,143,0.1)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
              >
                <RefreshCw size={13} />
                Sincronizar agora
              </button>
            </GlassCard>
          ) : (
            <>
              {/* Tabela Pendentes */}
              {pendentes.length > 0 && (
                <GlassCard className="overflow-hidden">
                  <div className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#f59e0b' }} />
                    <h3 className="text-sm font-semibold text-white">Comissões Pendentes</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>{pendentes.length}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {COLS.map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-widest text-white/30 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendentes.map(c => (
                          <tr key={c.id} className="hover:bg-white/3 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td className="px-4 py-3 font-medium text-white">
                              <div className="flex items-center gap-2">
                                {c.cliente_nome}
                                {c.is_transferida && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}>
                                    Transferida
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-white/60 text-xs">{c.plano ?? '—'}</td>
                            <td className="px-4 py-3 tabular-nums text-white/70">{formatBRL(c.valor_plano)}</td>
                            <td className="px-4 py-3 tabular-nums text-white/60">{c.comissao_pct != null ? `${c.comissao_pct}%` : '—'}</td>
                            <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: '#f59e0b' }}>{formatBRL(c.comissao_valor ?? 0)}</td>
                            <td className="px-4 py-3 tabular-nums text-white/50 text-xs">{formatData(c.data_ativacao)}</td>
                            <td className="px-4 py-3">
                              {isAdmin ? (
                                <button
                                  onClick={() => marcarPago(c.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                  style={{ background: 'rgba(0,214,143,0.1)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
                                  title="Marcar como pago"
                                >
                                  <Check size={12} />Pagar
                                </button>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(245,158,11,0.03)' }}>
                          <td className="px-4 py-2.5 text-xs font-bold text-white/50 uppercase tracking-wide" colSpan={4}>Total Pendente</td>
                          <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color: '#f59e0b' }}>{formatBRL(totais.pendente)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </GlassCard>
              )}

              {/* Tabela Pagas — collapsível */}
              {pagas.length > 0 && (
                <GlassCard className="overflow-hidden">
                  <button
                    onClick={() => setPagasExpandidas(v => !v)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-white/2"
                    style={{ borderBottom: pagasExpandidas ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#00d68f' }} />
                    <h3 className="text-sm font-semibold text-white">Comissões Pagas</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.25)' }}>{pagas.length}</span>
                    <span className="text-xs tabular-nums font-semibold ml-2" style={{ color: '#00d68f' }}>{formatBRL(totais.pago)}</span>
                    <span className="ml-auto text-white/30 shrink-0">
                      {pagasExpandidas ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </span>
                  </button>

                  {pagasExpandidas && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {COLS.map(h => (
                              <th key={h} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-widest text-white/30 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pagas.map(c => (
                            <tr key={c.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: 0.6 }}>
                              <td className="px-4 py-3 font-medium text-white/70 line-through">{c.cliente_nome}</td>
                              <td className="px-4 py-3 text-white/50 text-xs">{c.plano ?? '—'}</td>
                              <td className="px-4 py-3 tabular-nums text-white/50">{formatBRL(c.valor_plano)}</td>
                              <td className="px-4 py-3 tabular-nums text-white/40">{c.comissao_pct != null ? `${c.comissao_pct}%` : '—'}</td>
                              <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: 'rgba(0,214,143,0.6)' }}>{formatBRL(c.comissao_valor ?? 0)}</td>
                              <td className="px-4 py-3 tabular-nums text-white/40 text-xs">{formatData(c.data_ativacao)}</td>
                              <td className="px-4 py-3">
                                {isAdmin ? (
                                  <button
                                    onClick={() => marcarPendente(c.id)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    title={c.data_pagamento ? `Pago em ${formatData(c.data_pagamento)}` : 'Pago'}
                                  >
                                    <X size={12} />Reverter
                                  </button>
                                ) : (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full cursor-default"
                                    style={{ background: 'rgba(0,214,143,0.08)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
                                    title={c.data_pagamento ? `Pago em ${formatData(c.data_pagamento)}` : undefined}
                                  >
                                    Pago {c.data_pagamento ? `• ${formatData(c.data_pagamento)}` : ''}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(0,214,143,0.03)' }}>
                            <td className="px-4 py-2.5 text-xs font-bold text-white/50 uppercase tracking-wide" colSpan={4}>Total Pago</td>
                            <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color: '#00d68f' }}>{formatBRL(totais.pago)}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </GlassCard>
              )}
            </>
          )}

          {/* Rodapé explicativo */}
          <p className="text-xs text-white/25 text-center pb-2">
            <span style={{ color: 'rgba(139,92,246,0.7)' }}>Transferida</span> = contrato ativado após o dia 20 do mês de referência — comissão paga no mês seguinte.
            Corte: dia 20 de cada mês.
          </p>
        </>
      )}
    </div>
  )
}
