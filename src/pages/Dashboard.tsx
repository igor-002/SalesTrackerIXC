import { useState } from 'react'
import { TrendingUp, DollarSign, Users, Repeat2, Award, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { VendasTable } from '@/components/vendas/VendasTable'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useIxcSync } from '@/hooks/useIxcSync'
import { useHistoricoSync } from '@/hooks/useSyncStatus'
import type { SyncLogRow } from '@/hooks/useSyncStatus'
import { ixcConfigurado } from '@/lib/ixc'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  sub?: string
  accentHex: string
}

function StatCard({ label, value, icon, sub, accentHex }: StatCardProps) {
  return (
    <div
      className="glass rounded-2xl p-5 relative overflow-hidden"
      style={{ borderTop: `2px solid ${accentHex}` }}
    >
      <div className="mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accentHex}18`, color: accentHex }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-0.5 tracking-tight">{value}</p>
      <p className="text-xs font-medium text-white/50">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.08]" style={{ background: accentHex }} />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse" style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
      <div className="w-9 h-9 bg-white/8 rounded-xl mb-3" />
      <div className="h-7 bg-white/8 rounded-lg w-2/3 mb-2" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
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
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.25)' }}>
        <CheckCircle2 size={10} /> sucesso
      </span>
    )
  }
  if (status === 'erro') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
        <XCircle size={10} /> erro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
      <Loader2 size={10} className="animate-spin" /> em andamento
    </span>
  )
}

function SyncHistoricoCard({ sincronizarAgora, sincronizando }: {
  sincronizarAgora: () => void
  sincronizando: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const { data: historico = [], isFetching, refetchTudo } = useHistoricoSync()

  const ultimo = historico[0] ?? null

  function handleSync() {
    sincronizarAgora()
    // Após 3s, refetch do histórico para mostrar o novo registro
    setTimeout(() => refetchTudo(), 3000)
  }

  return (
    <GlassCard className="overflow-hidden">
      {/* Header — sempre visível */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <RefreshCw size={14} className="text-emerald-400" />
          <span className="text-sm font-semibold text-white">Sincronização IXC</span>
          {ultimo && <SyncStatusBadge status={ultimo.status} />}
        </div>
        <div className="flex items-center gap-3">
          {ultimo && (
            <span className="text-xs text-white/30">
              {formatIsoHora(ultimo.finalizado_em ?? ultimo.iniciado_em)}
              {ultimo.registros_processados != null && ` · ${ultimo.registros_processados} contratos`}
            </span>
          )}
          {aberto ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
        </div>
      </button>

      {/* Painel expandido */}
      {aberto && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Último sync em destaque */}
          {ultimo && (
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/30 mb-2">Última sincronização</p>
              <div className="flex flex-wrap items-center gap-4">
                <SyncStatusBadge status={ultimo.status} />
                <span className="text-sm text-white">{formatIsoHora(ultimo.iniciado_em)}</span>
                {ultimo.registros_processados != null && (
                  <span className="text-xs text-white/50">{ultimo.registros_processados} contratos processados</span>
                )}
                {ultimo.registros_atualizados != null && (
                  <span className="text-xs text-white/50">{ultimo.registros_atualizados} atualizados</span>
                )}
                {ultimo.duracao_ms != null && (
                  <span className="text-xs text-white/30">{ultimo.duracao_ms}ms</span>
                )}
                {ultimo.erro_mensagem && (
                  <span className="text-xs text-red-400 font-medium">Erro: {ultimo.erro_mensagem}</span>
                )}
              </div>
            </div>
          )}

          {/* Lista compacta dos últimos 10 */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/30 mb-2">Histórico recente</p>
            {isFetching && historico.length === 0 ? (
              <div className="flex justify-center py-4"><Spinner size="sm" style={{ color: '#00d68f' }} /></div>
            ) : historico.length === 0 ? (
              <p className="text-xs text-white/30 py-2">Nenhum registro de sincronização.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {historico.map((row: SyncLogRow) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 py-1.5 rounded-lg px-2 text-xs"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <span className="text-white/30 w-28 flex-shrink-0 tabular-nums">{formatIsoHora(row.iniciado_em)}</span>
                    <SyncStatusBadge status={row.status} />
                    <span className="text-white/40 flex-shrink-0 capitalize">{row.tipo.replace('_', ' ')}</span>
                    {row.registros_processados != null && (
                      <span className="text-white/30 tabular-nums">{row.registros_processados} proc.</span>
                    )}
                    {row.registros_atualizados != null && row.registros_atualizados > 0 && (
                      <span className="text-emerald-400/70 tabular-nums">{row.registros_atualizados} atualiz.</span>
                    )}
                    {row.duracao_ms != null && (
                      <span className="text-white/20 tabular-nums ml-auto">{row.duracao_ms}ms</span>
                    )}
                    {row.erro_mensagem && (
                      <span className="text-red-400/70 ml-auto truncate max-w-[200px]">{row.erro_mensagem}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="px-5 pb-4 flex gap-2">
            <button
              onClick={handleSync}
              disabled={sincronizando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
            >
              {sincronizando ? <Spinner size="sm" /> : <RefreshCw size={12} />}
              Sincronizar agora
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export default function Dashboard() {
  const { stats, loading } = useDashboardStats()
  const { ultimaSincronizacao, sincronizando, sincronizarAgora } = useIxcSync()
  const ixcAtivo = ixcConfigurado()
  const now = new Date()
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Visão Geral</h2>
          <p className="text-sm text-white/40 font-medium">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</p>
        </div>
        {ixcAtivo && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">
              {sincronizando ? 'Sincronizando...' : `IXC: ${formatSyncTime(ultimaSincronizacao)}`}
            </span>
            <button
              onClick={() => sincronizarAgora()}
              disabled={sincronizando}
              className="flex items-center justify-center w-6 h-6 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-white/30 hover:text-white hover:bg-white/8"
              title="Sincronizar status IXC agora"
            >
              {sincronizando
                ? <Spinner size="sm" />
                : <RefreshCw size={12} />
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
            <StatCard label="Faturamento do Mês" value={formatBRL(stats.faturamentoMes)} icon={<DollarSign size={18} />} accentHex="#00d68f" />
            <StatCard label="Total de Vendas" value={formatNumber(stats.vendasMes)} icon={<TrendingUp size={18} />} accentHex="#06b6d4" sub={`${stats.vendasUnicasMes} únicas`} />
            <StatCard label="Comissões" value={formatBRL(stats.comissoesMes)} icon={<Award size={18} />} accentHex="#f59e0b" />
            <StatCard label="MRR" value={formatBRL(stats.mrrTotal)} icon={<Repeat2 size={18} />} accentHex="#00d68f" sub="Receita recorrente" />
            <StatCard label="Vendas Únicas" value={formatNumber(stats.vendasUnicasMes)} icon={<Users size={18} />} accentHex="#06b6d4" />
          </>
        )}
      </div>

      {/* Status dos Contratos IXC */}
      {!loading && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Status dos Contratos</h3>
            <span className="text-xs text-white/35">Mês atual · via IXC</span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Ativos */}
            <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'rgba(0,214,143,0.06)', border: '1px solid rgba(0,214,143,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-1">Realidade</p>
              <p className="text-2xl font-bold text-white mb-0.5">{formatNumber(stats.countPorStatus.A)}</p>
              <p className="text-xs font-medium text-emerald-400">Ativos</p>
              <p className="text-xs text-white/30 mt-0.5">{formatBRL(stats.faturamentoAtivos)}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full opacity-10 bg-emerald-400" />
            </div>

            {/* Aguardando Assinatura */}
            <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/70 mb-1">Promessa</p>
              <p className="text-2xl font-bold text-white mb-0.5">{formatNumber(stats.countPorStatus.AA)}</p>
              <p className="text-xs font-medium text-cyan-400">Aguardando Assinatura</p>
              <p className="text-xs text-white/30 mt-0.5">{formatBRL(stats.faturamentoAguardando)}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full opacity-10 bg-cyan-400" />
            </div>

            {/* Cancelados */}
            <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-1">Realidade</p>
              <p className="text-2xl font-bold text-white mb-0.5">{formatNumber(stats.countPorStatus.CN)}</p>
              <p className="text-xs font-medium text-red-400">Cancelados</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full opacity-10 bg-red-400" />
            </div>

            {/* Bloqueados */}
            <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 mb-1">&nbsp;</p>
              <p className="text-2xl font-bold text-white mb-0.5">{formatNumber(stats.countPorStatus.CM + stats.countPorStatus.FA)}</p>
              <p className="text-xs font-medium text-amber-400">Bloqueados</p>
              <p className="text-xs text-white/30 mt-0.5">CM: {stats.countPorStatus.CM} · FA: {stats.countPorStatus.FA}</p>
              <div className="absolute -right-3 -bottom-3 w-14 h-14 rounded-full opacity-10 bg-amber-400" />
            </div>
          </div>
        </GlassCard>
      )}

      {/* Alertas AA > 7 dias */}
      {!loading && stats.alertasAA.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Contratos Aguardando há mais de 7 dias</h3>
            </div>
            <Link
              to="/clientes"
              className="text-xs font-semibold transition-colors"
              style={{ color: '#06b6d4' }}
            >
              Ver todos →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {stats.alertasAA.map((alerta) => {
              const dias = alerta.dias_em_aa ?? 0
              return (
                <div key={alerta.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{alerta.cliente_nome}</p>
                    <p className="text-xs text-white/35 mt-0.5">{alerta.vendedor?.nome ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <span className="text-xs text-white/40 tabular-nums">{dias}d</span>
                    <Badge variant={dias > 15 ? 'danger' : 'warning'}>
                      {dias > 15 ? 'Urgente' : 'Atenção'}
                    </Badge>
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
            <h3 className="text-sm font-semibold text-white">Últimas Vendas</h3>
            <p className="text-xs text-white/40 mt-0.5">Registros mais recentes</p>
          </div>
          <Link
            to="/nova-venda"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
          >
            + Nova venda
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner style={{ color: '#00d68f' }} /></div>
        ) : (
          <VendasTable vendas={stats.ultimasVendas} />
        )}
      </GlassCard>
    </div>
  )
}
