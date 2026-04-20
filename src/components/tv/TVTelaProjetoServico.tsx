import { FolderKanban, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import { formatBRL } from '@/lib/formatters'

interface VendaUnicaTV {
  id: string
  cliente_nome: string
  descricao: string | null
  valor_total: number
  parcelas: number
  status_geral: 'a_receber' | 'pago' | 'em_atraso' | 'cancelado'
  progresso_pct: number
  valor_recebido: number
  valor_pendente: number
}

interface ProjetosStats {
  total_projetos: number
  valor_vendido: number
  valor_recebido: number
  valor_pendente: number
  valor_em_atraso: number
}

interface TVTelaProjetoServicoProps {
  projetos: VendaUnicaTV[]
  stats: ProjetosStats
  t: TVThemeColors
}

const VIOLET = '#a78bfa'

export function TVTelaProjetoServico({ projetos, stats, t }: TVTelaProjetoServicoProps) {
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  if (projetos.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <FolderKanban size={52} style={{ color: VIOLET, opacity: 0.35 }} />
        <p className="text-2xl font-bold text-white/30">Nenhum projeto registrado este mês</p>
      </div>
    )
  }

  const progressoPct = stats.valor_vendido > 0
    ? Math.round((stats.valor_recebido / stats.valor_vendido) * 100)
    : 0

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <FolderKanban size={20} style={{ color: VIOLET }} />
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${VIOLET}99` }}>
            Projetos & Serviços
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${VIOLET}12`, color: `${VIOLET}cc`, border: `1px solid ${VIOLET}20` }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-4 flex-shrink-0">
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: `${VIOLET}0a`, border: `1px solid ${VIOLET}25` }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: `${VIOLET}80` }}>
            Projetos
          </p>
          <p className="text-3xl font-black text-white">{stats.total_projetos}</p>
          <p className="text-xs text-white/40 mt-1">{formatBRL(stats.valor_vendido)} total</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10" style={{ background: VIOLET }} />
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'rgba(0,214,143,0.06)', border: '1px solid rgba(0,214,143,0.15)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70 mb-1">Recebido</p>
          <p className="text-3xl font-black text-white">{formatBRL(stats.valor_recebido)}</p>
          <p className="text-xs text-emerald-400/60 mt-1">{progressoPct}% do total</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10 bg-emerald-400" />
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/70 mb-1">Pendente</p>
          <p className="text-3xl font-black text-white">{formatBRL(stats.valor_pendente)}</p>
          <p className="text-xs text-cyan-400/60 mt-1">A receber</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10 bg-cyan-400" />
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400/70 mb-1">Em Atraso</p>
          <p className="text-3xl font-black text-white">{formatBRL(stats.valor_em_atraso)}</p>
          <p className="text-xs text-red-400/60 mt-1">Vencidas</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10 bg-red-400" />
        </div>
      </div>

      {/* Lista de projetos */}
      <div
        className="flex-1 rounded-3xl overflow-hidden min-h-0 flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: `2px solid ${VIOLET}`,
        }}
      >
        {/* Cabeçalho fixo */}
        <div
          className="grid text-[11px] font-black uppercase tracking-widest text-white/25 px-8 py-4 flex-shrink-0"
          style={{
            gridTemplateColumns: '1fr 140px 100px 100px 80px',
            gap: '1.5rem',
            background: 'rgba(0,0,0,0.35)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span>Cliente / Descrição</span>
          <span>Progresso</span>
          <span className="text-right">Valor</span>
          <span className="text-right">Recebido</span>
          <span className="text-center">Status</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {projetos.slice(0, 10).map((projeto) => {
            const StatusIcon = projeto.status_geral === 'pago' ? CheckCircle2 :
                               projeto.status_geral === 'em_atraso' ? AlertCircle : Clock
            const statusColor = projeto.status_geral === 'pago' ? '#00d68f' :
                               projeto.status_geral === 'em_atraso' ? '#ef4444' :
                               projeto.status_geral === 'cancelado' ? '#666' : '#f59e0b'

            return (
              <div
                key={projeto.id}
                className="grid items-center px-8 py-5 border-b"
                style={{
                  gridTemplateColumns: '1fr 140px 100px 100px 80px',
                  gap: '1.5rem',
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                }}
              >
                {/* Cliente */}
                <div className="min-w-0">
                  <p className="font-bold text-white/90 truncate" style={{ fontSize: '1.1rem' }}>
                    {projeto.cliente_nome}
                  </p>
                  {projeto.descricao && (
                    <p className="text-xs text-white/40 truncate mt-0.5">{projeto.descricao}</p>
                  )}
                </div>

                {/* Barra de progresso */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${projeto.progresso_pct}%`, background: statusColor }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: statusColor }}>
                    {projeto.progresso_pct}%
                  </span>
                </div>

                {/* Valor */}
                <span className="text-right tabular-nums font-semibold text-white/70">
                  {formatBRL(projeto.valor_total)}
                </span>

                {/* Recebido */}
                <span className="text-right tabular-nums font-semibold" style={{ color: '#00d68f99' }}>
                  {formatBRL(projeto.valor_recebido)}
                </span>

                {/* Status */}
                <div className="flex justify-center">
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}
                  >
                    <StatusIcon size={12} />
                    {projeto.status_geral === 'pago' ? 'Pago' :
                     projeto.status_geral === 'em_atraso' ? 'Atraso' :
                     projeto.status_geral === 'cancelado' ? 'Cancel.' :
                     `${projeto.parcelas}x`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-3 px-6 py-3 rounded-2xl"
        style={{ background: `${VIOLET}0a`, border: `1px solid ${VIOLET}18` }}
      >
        <span className="text-sm text-white/40">Vendas únicas não contam na meta mensal</span>
      </div>
    </div>
  )
}
