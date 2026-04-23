import { useState, useMemo } from 'react'
import { TrendingUp, DollarSign, Users, Repeat2, Award, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, FolderKanban, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { VendasTable } from '@/components/vendas/VendasTable'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useStatusContratosMes } from '@/hooks/useStatusContratosMes'
import { useIxcSync, useIxcSyncFull } from '@/hooks/useIxcSync'
import { useHistoricoSync } from '@/hooks/useSyncStatus'
import type { SyncLogRow } from '@/hooks/useSyncStatus'
import { runReconciliacao } from '@/services/reconciliacao'
import { ixcConfigurado } from '@/lib/ixc'
import { formatBRL, formatNumber } from '@/lib/formatters'
import { useVendasUnicasMes } from '@/hooks/useVendasUnicas'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  sub?: string
  accentHex: string
}

function StatCard({ label, value, icon, sub, accentHex }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-lg p-5 relative overflow-hidden">
      <div className="mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accentHex}15`, color: accentHex }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-[#09090b] mb-0.5 tracking-tight">{value}</p>
      <p className="text-xs font-medium text-[#71717a]">{label}</p>
      {sub && <p className="text-xs text-[#a1a1aa] mt-0.5">{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-lg p-5 animate-pulse">
      <div className="w-9 h-9 bg-[#f4f4f5] rounded-lg mb-3" />
      <div className="h-7 bg-[#f4f4f5] rounded w-2/3 mb-2" />
      <div className="h-3 bg-[#f4f4f5] rounded w-1/2" />
    </div>
  )
}

function formatSyncTime(date: Date | null): string {
  if (!date) return 'nunca'
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins === 1) return 'há 1 min'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  return hrs === 1 ? 'há 1 hora' : `há ${hrs} horas`
}

function formatIsoHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function SyncStatusBadge({ status }: { status: string }) {
  if (status === 'sucesso') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
        <CheckCircle2 size={10} /> sucesso
      </span>
    )
  }
  if (status === 'erro') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
        <XCircle size={10} /> erro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
      <Loader2 size={10} className="animate-spin" /> em andamento
    </span>
  )
}

function SyncHistoricoCard({ sincronizarAgora, sincronizando }: {
  sincronizarAgora: () => void
  sincronizando: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [reconciliando, setReconciliando] = useState(false)
  const { data: historico = [], isFetching, refetchTudo } = useHistoricoSync()
  const { progress, executarSyncCompleto, resetProgress } = useIxcSyncFull()

  const ultimo = historico[0] ?? null

  function handleSync() {
    sincronizarAgora()
    setTimeout(() => refetchTudo(), 3000)
  }

  async function handleReconciliar() {
    setReconciliando(true)
    try {
      await runReconciliacao('')
    } finally {
      setReconciliando(false)
      refetchTudo()
    }
  }

  return (
    <GlassCard className="overflow-hidden">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <RefreshCw size={14} className="text-[#15803d]" />
          <span className="text-sm font-semibold text-[#09090b]">Sincronização IXC</span>
          {ultimo && <SyncStatusBadge status={ultimo.status} />}
        </div>
        <div className="flex items-center gap-3">
          {ultimo && (
            <span className="text-xs text-[#a1a1aa]">
              {formatIsoHora(ultimo.finalizado_em ?? ultimo.iniciado_em)}
              {ultimo.registros_processados != null && ` · ${ultimo.registros_processados} contratos`}
            </span>
          )}
          {aberto ? <ChevronUp size={14} className="text-[#a1a1aa]" /> : <ChevronDown size={14} className="text-[#a1a1aa]" />}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-[#e4e4e7]">
          {ultimo && (
            <div className="px-5 py-4 border-b border-[#f4f4f5]">
              <p className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa] mb-2">Última sincronização</p>
              <div className="flex flex-wrap items-center gap-4">
                <SyncStatusBadge status={ultimo.status} />
                <span className="text-sm text-[#09090b]">{formatIsoHora(ultimo.iniciado_em)}</span>
                {ultimo.registros_processados != null && (
                  <span className="text-xs text-[#71717a]">{ultimo.registros_processados} contratos processados</span>
                )}
                {ultimo.registros_atualizados != null && (
                  <span className="text-xs text-[#71717a]">{ultimo.registros_atualizados} atualizados</span>
                )}
                {ultimo.duracao_ms != null && (
                  <span className="text-xs text-[#a1a1aa]">{ultimo.duracao_ms}ms</span>
                )}
                {ultimo.erro_mensagem && (
                  <span className="text-xs text-[#b91c1c] font-medium">Erro: {ultimo.erro_mensagem}</span>
                )}
              </div>
            </div>
          )}

          <div className="px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa] mb-2">Histórico recente</p>
            {isFetching && historico.length === 0 ? (
              <div className="flex justify-center py-4"><Spinner size="sm" className="text-[#15803d]" /></div>
            ) : historico.length === 0 ? (
              <p className="text-xs text-[#a1a1aa] py-2">Nenhum registro de sincronização.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {historico.map((row: SyncLogRow) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 py-1.5 rounded-md px-2 text-xs bg-[#fafafa]"
                  >
                    <span className="text-[#a1a1aa] w-28 flex-shrink-0 tabular-nums">{formatIsoHora(row.iniciado_em)}</span>
                    <SyncStatusBadge status={row.status} />
                    <span className="text-[#71717a] flex-shrink-0 capitalize">{row.tipo.replace('_', ' ')}</span>
                    {row.registros_processados != null && (
                      <span className="text-[#a1a1aa] tabular-nums">{row.registros_processados} proc.</span>
                    )}
                    {row.registros_atualizados != null && row.registros_atualizados > 0 && (
                      <span className="text-[#15803d] tabular-nums">{row.registros_atualizados} atualiz.</span>
                    )}
                    {row.duracao_ms != null && (
                      <span className="text-[#d4d4d8] tabular-nums ml-auto">{row.duracao_ms}ms</span>
                    )}
                    {row.erro_mensagem && (
                      <span className="text-[#b91c1c] ml-auto truncate max-w-[200px]">{row.erro_mensagem}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {progress.running && (
            <div className="px-5 py-3 border-t border-[#f4f4f5]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#1d4ed8]">Sync completo em andamento</span>
                <span className="text-xs text-[#71717a] tabular-nums">{progress.percent}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-[#f4f4f5]">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-[#1d4ed8]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-[#71717a] mt-2">{progress.message}</p>
            </div>
          )}

          {progress.result && !progress.running && (
            <div className="px-5 py-3 border-t border-[#f4f4f5]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#15803d]" />
                  <span className="text-sm text-[#09090b] font-medium">
                    {progress.result.importados} contratos importados
                  </span>
                </div>
                <button
                  onClick={resetProgress}
                  className="text-xs text-[#71717a] hover:text-[#09090b] cursor-pointer"
                >
                  Fechar
                </button>
              </div>
              <p className="text-xs text-[#71717a] mt-1">
                {progress.result.backupCount} registros salvos no backup · {progress.result.deletados} antigos removidos
                {progress.result.erros > 0 && ` · ${progress.result.erros} erros`}
              </p>
            </div>
          )}

          {progress.error && !progress.running && (
            <div className="px-5 py-3 border-t border-[#f4f4f5]">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-[#b91c1c]" />
                <span className="text-sm text-[#b91c1c] font-medium">Erro no sync</span>
              </div>
              <p className="text-xs text-[#b91c1c]/70 mt-1">{progress.error}</p>
            </div>
          )}

          <div className="px-5 pb-4 flex gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={sincronizando || progress.running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] hover:bg-[#dcfce7]"
            >
              {sincronizando ? <Spinner size="sm" /> : <RefreshCw size={12} />}
              Atualizar status
            </button>
            <button
              onClick={executarSyncCompleto}
              disabled={progress.running || sincronizando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe]"
            >
              {progress.running ? <Spinner size="sm" /> : <RefreshCw size={12} />}
              Sync completo IXC
            </button>
            <button
              onClick={handleReconciliar}
              disabled={reconciliando || progress.running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[#fffbeb] text-[#b45309] border border-[#fde68a] hover:bg-[#fef3c7]"
            >
              {reconciliando ? <Spinner size="sm" /> : <RefreshCw size={12} />}
              Reconciliar
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function get3Meses(): { mes: number; ano: number; label: string }[] {
  const now = new Date()
  const result: { mes: number; ano: number; label: string }[] = []
  for (let i = 0; i <= 2; i++) {
    let m = now.getMonth() + 1 - i
    let a = now.getFullYear()
    while (m <= 0) { m += 12; a-- }
    const label = i === 0 ? 'Mês atual' : i === 1 ? 'Mês anterior' : '2 meses atrás'
    result.push({ mes: m, ano: a, label })
  }
  return result
}

export default function Dashboard() {
  const { stats, loading } = useDashboardStats()
  const { ultimaSincronizacao, sincronizando, sincronizarAgora } = useIxcSync()
  const { data: projetosData, isLoading: loadingProjetos } = useVendasUnicasMes()
  const ixcAtivo = ixcConfigurado()
  const now = new Date()
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const mesesOpcoes = useMemo(() => get3Meses(), [])
  const [mesSelecionado, setMesSelecionado] = useState(0)
  const { mes: mesRef, ano: anoRef } = mesesOpcoes[mesSelecionado]
  const { stats: statusMes, loading: loadingStatusMes } = useStatusContratosMes(mesRef, anoRef)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#09090b]">Visão Geral</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-[#71717a] font-medium">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</p>
            {ixcAtivo && ultimaSincronizacao && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
                Última sync: {formatSyncTime(ultimaSincronizacao)}
              </span>
            )}
          </div>
        </div>
        {ixcAtivo && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#a1a1aa]">
              {sincronizando ? 'Sincronizando...' : `IXC: ${formatSyncTime(ultimaSincronizacao)}`}
            </span>
            <button
              onClick={() => sincronizarAgora()}
              disabled={sincronizando}
              className="flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[#71717a] hover:text-[#09090b] hover:bg-[#f4f4f5]"
              title="Sincronizar status IXC agora"
            >
              {sincronizando
                ? <Spinner size="sm" />
                : <RefreshCw size={14} />
              }
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Faturamento do Mês" value={formatBRL(stats.faturamentoMes)} icon={<DollarSign size={18} />} accentHex="#15803d" />
            <StatCard label="Total de Vendas" value={formatNumber(stats.vendasMes)} icon={<TrendingUp size={18} />} accentHex="#1d4ed8" sub={`${stats.vendasUnicasMes} únicas`} />
            <StatCard label="Comissões" value={formatBRL(stats.comissoesMes)} icon={<Award size={18} />} accentHex="#b45309" />
            <StatCard label="MRR" value={formatBRL(stats.mrrTotal)} icon={<Repeat2 size={18} />} accentHex="#15803d" sub="Receita recorrente" />
            <StatCard label="Vendas Únicas" value={formatNumber(stats.vendasUnicasMes)} icon={<Users size={18} />} accentHex="#1d4ed8" />
          </>
        )}
      </div>

      {/* Status dos Contratos IXC */}
      {!loading && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#1d4ed8]" />
              <h3 className="text-sm font-semibold text-[#09090b]">Status dos Contratos</h3>
            </div>
            <div className="flex items-center gap-1 rounded-full p-1 bg-[#f4f4f5] border border-[#e4e4e7]">
              {mesesOpcoes.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setMesSelecionado(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                    mesSelecionado === idx
                      ? 'bg-[#09090b] text-white'
                      : 'text-[#71717a] hover:text-[#09090b]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#a1a1aa] mb-4">{MESES_NOME[mesRef - 1]} {anoRef} · via IXC</p>
          {loadingStatusMes ? (
            <div className="flex justify-center py-8"><Spinner className="text-[#1d4ed8]" /></div>
          ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-lg p-4 relative overflow-hidden bg-[#f0fdf4] border border-[#bbf7d0]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#15803d]/70 mb-1">Realidade</p>
              <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatNumber(statusMes.ativos)}</p>
              <p className="text-xs font-medium text-[#15803d]">Ativos</p>
              <p className="text-xs text-[#71717a] mt-0.5">{formatBRL(statusMes.valorAtivos)}</p>
            </div>

            <div className="rounded-lg p-4 relative overflow-hidden bg-[#eff6ff] border border-[#bfdbfe]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1d4ed8]/70 mb-1">Promessa</p>
              <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatNumber(statusMes.aguardando)}</p>
              <p className="text-xs font-medium text-[#1d4ed8]">Aguardando Assinatura</p>
              <p className="text-xs text-[#71717a] mt-0.5">{formatBRL(statusMes.valorAguardando)}</p>
              {statusMes.parados30d > 0 && (
                <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1 bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                  {statusMes.parados30d} parados +30d
                </span>
              )}
            </div>

            <div className="rounded-lg p-4 relative overflow-hidden bg-[#fef2f2] border border-[#fecaca]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#b91c1c]/70 mb-1">Realidade</p>
              <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatNumber(statusMes.cancelados)}</p>
              <p className="text-xs font-medium text-[#b91c1c]">Cancelados</p>
            </div>

            <div className="rounded-lg p-4 relative overflow-hidden bg-[#fffbeb] border border-[#fde68a]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#b45309]/70 mb-1">&nbsp;</p>
              <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatNumber(statusMes.bloqueados)}</p>
              <p className="text-xs font-medium text-[#b45309]">Bloqueados</p>
            </div>
          </div>
          )}
        </GlassCard>
      )}

      {/* Alertas AA > 7 dias */}
      {!loading && stats.alertasAA.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#b45309]" />
              <h3 className="text-sm font-semibold text-[#09090b]">Contratos Aguardando há mais de 7 dias</h3>
            </div>
            <Link
              to="/clientes"
              className="text-xs font-medium text-[#1d4ed8] hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {stats.alertasAA.map((alerta) => {
              const dias = alerta.dias_em_aa ?? 0
              return (
                <div key={alerta.id} className="flex items-center justify-between rounded-lg px-4 py-3 bg-[#fafafa] border border-[#e4e4e7]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#09090b] truncate">{alerta.cliente_nome}</p>
                    <p className="text-xs text-[#a1a1aa] mt-0.5">{alerta.vendedor?.nome ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className="text-xs text-[#71717a] tabular-nums">{dias}d</span>
                    <Badge variant={dias > 15 ? 'danger' : 'warning'}>
                      {dias > 15 ? 'Urgente' : 'Atenção'}
                    </Badge>
                    {alerta.tags?.includes('antigo') && (
                      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                        Parado +30d
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {ixcAtivo && (
        <SyncHistoricoCard sincronizarAgora={sincronizarAgora} sincronizando={sincronizando} />
      )}

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-[#09090b]">Últimas Vendas</h3>
            <p className="text-xs text-[#a1a1aa] mt-0.5">Registros mais recentes</p>
          </div>
          <Link
            to="/nova-venda"
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#09090b] text-white hover:bg-[#1f1f1f] transition-colors"
          >
            + Nova venda
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner className="text-[#15803d]" /></div>
        ) : (
          <VendasTable vendas={stats.ultimasVendas} />
        )}
      </GlassCard>

      {/* Projetos & Serviços (Vendas Únicas) */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FolderKanban size={16} className="text-[#7c3aed]" />
            <div>
              <h3 className="text-sm font-semibold text-[#09090b]">Projetos & Serviços</h3>
              <p className="text-xs text-[#a1a1aa] mt-0.5">Vendas únicas do mês (não contam na meta)</p>
            </div>
          </div>
          <Link
            to="/nova-venda"
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff] hover:bg-[#f3e8ff] transition-colors"
          >
            + Novo projeto
          </Link>
        </div>

        {loadingProjetos ? (
          <div className="flex justify-center py-8"><Spinner className="text-[#7c3aed]" /></div>
        ) : !projetosData?.stats.total_projetos ? (
          <div className="text-center py-8">
            <FolderKanban size={32} className="text-[#e4e4e7] mx-auto mb-2" />
            <p className="text-sm text-[#a1a1aa]">Nenhum projeto registrado este mês</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
              <div className="rounded-lg p-4 bg-[#faf5ff] border border-[#e9d5ff]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7c3aed]/70 mb-1">Projetos</p>
                <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{projetosData.stats.total_projetos}</p>
                <p className="text-xs text-[#71717a]">{formatBRL(projetosData.stats.valor_vendido)} vendido</p>
              </div>

              <div className="rounded-lg p-4 bg-[#f0fdf4] border border-[#bbf7d0]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#15803d]/70 mb-1">Recebido</p>
                <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatBRL(projetosData.stats.valor_recebido)}</p>
                <p className="text-xs text-[#71717a]">
                  {projetosData.stats.valor_vendido > 0
                    ? `${Math.round((projetosData.stats.valor_recebido / projetosData.stats.valor_vendido) * 100)}%`
                    : '0%'} do total
                </p>
              </div>

              <div className="rounded-lg p-4 bg-[#eff6ff] border border-[#bfdbfe]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1d4ed8]/70 mb-1">Pendente</p>
                <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatBRL(projetosData.stats.valor_pendente)}</p>
                <p className="text-xs text-[#71717a]">A receber</p>
              </div>

              <div className="rounded-lg p-4 bg-[#fef2f2] border border-[#fecaca]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#b91c1c]/70 mb-1">Em Atraso</p>
                <p className="text-2xl font-semibold text-[#09090b] mb-0.5">{formatBRL(projetosData.stats.valor_em_atraso)}</p>
                <p className="text-xs text-[#71717a]">Vencidas</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[#a1a1aa] mb-1">Projetos recentes</p>
              {projetosData.vendas.slice(0, 5).map((projeto) => (
                <div
                  key={projeto.id}
                  className="flex items-center justify-between rounded-lg px-4 py-3 bg-[#fafafa] border border-[#e4e4e7]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#09090b] truncate">{projeto.cliente_nome}</p>
                    <p className="text-xs text-[#a1a1aa] mt-0.5 truncate">{projeto.descricao || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#09090b] tabular-nums">{formatBRL(projeto.valor_total)}</p>
                      <p className="text-xs text-[#a1a1aa] tabular-nums">{projeto.parcelas ?? 0} parcela{(projeto.parcelas ?? 0) > 1 ? 's' : ''}</p>
                    </div>
                    <Badge
                      variant={
                        projeto.status_geral === 'quitado' ? 'success' :
                        projeto.status_geral === 'em_atraso' ? 'danger' :
                        projeto.status_geral === 'cancelado' ? 'default' : 'warning'
                      }
                    >
                      {projeto.status_geral === 'quitado' ? 'Quitado' :
                       projeto.status_geral === 'em_atraso' ? 'Atraso' :
                       projeto.status_geral === 'cancelado' ? 'Cancelado' :
                       `${projeto.progresso_pct}%`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </GlassCard>
    </div>
  )
}
