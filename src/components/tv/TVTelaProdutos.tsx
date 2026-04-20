/**
 * Tela Produtos - Consolida Planos + Projetos
 * Visão do portfólio: planos recorrentes e projetos únicos
 */
import { BarChart2, FolderKanban } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { PlanoStat } from '@/hooks/useTVStats'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface ProjetoSimples {
  id: string
  cliente_nome: string
  valor_total: number
  progresso_pct: number
  status_geral: 'pendente' | 'quitado' | 'em_atraso' | 'em_dia' | 'parcial' | 'cancelado'
}

interface ProjetosStats {
  total_projetos: number
  valor_vendido: number
  valor_recebido: number
}

interface TVTelaProdutosProps {
  planosMes: PlanoStat[]
  projetos: ProjetoSimples[]
  projetosStats: ProjetosStats
  t: TVThemeColors
}

const VIOLET = '#a78bfa'

export function TVTelaProdutos({ planosMes, projetos, projetosStats, t }: TVTelaProdutosProps) {
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long' })

  if (planosMes.length === 0 && projetos.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <BarChart2 size={52} style={{ color: t.primary, opacity: 0.35 }} />
        <p className="text-2xl font-bold text-white/30">Nenhum produto vendido este mês</p>
      </div>
    )
  }

  const maxQtd = planosMes[0]?.qtd || 1
  const totalPlanos = planosMes.reduce((s, p) => s + p.total, 0)
  const qtdPlanos = planosMes.reduce((s, p) => s + p.qtd, 0)
  const ticketMedio = qtdPlanos > 0 ? totalPlanos / qtdPlanos : 0

  const temProjetos = projetos.length > 0

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Portfólio de Produtos
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Grid: Planos (maior) + Projetos (menor) */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: temProjetos ? '1.5fr 1fr' : '1fr' }}>

        {/* Planos Recorrentes */}
        <div
          className="rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderTop: `2px solid ${t.primary}`,
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <BarChart2 size={14} style={{ color: t.primary }} />
              <span className="text-xs font-black uppercase tracking-widest text-white/40">Planos Recorrentes</span>
            </div>
            <span className="text-xs text-white/30">
              Ticket médio: <span className="font-bold" style={{ color: t.primary }}>{formatBRL(ticketMedio)}</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {planosMes.slice(0, 8).map((p, i) => {
              const pct = Math.round((p.qtd / maxQtd) * 100)
              const isFirst = i === 0

              return (
                <div
                  key={p.nome}
                  className="grid items-center px-6 py-4 border-b"
                  style={{
                    gridTemplateColumns: '1fr 140px 70px 100px',
                    gap: '1rem',
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                    background: isFirst ? `${t.primary}08` : undefined,
                  }}
                >
                  {/* Nome */}
                  <span
                    className="font-bold truncate"
                    style={{
                      fontSize: isFirst ? '1.1rem' : '0.95rem',
                      color: isFirst ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {p.nome}
                  </span>

                  {/* Barra */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: isFirst ? t.primary : `${t.primary}55` }}
                    />
                  </div>

                  {/* Qtd */}
                  <span
                    className="text-right font-black tabular-nums"
                    style={{ color: isFirst ? t.primary : `${t.primary}80` }}
                  >
                    {formatNumber(p.qtd)}
                  </span>

                  {/* Total */}
                  <span className="text-right tabular-nums text-sm text-white/45">
                    {formatBRL(p.total)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Projetos Únicos */}
        {temProjetos && (
          <div
            className="rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid rgba(255,255,255,0.08)`,
              borderTop: `2px solid ${VIOLET}`,
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-3 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-2">
                <FolderKanban size={14} style={{ color: VIOLET }} />
                <span className="text-xs font-black uppercase tracking-widest text-white/40">Projetos</span>
              </div>
              <span className="text-xs text-white/30">
                <span className="font-bold" style={{ color: VIOLET }}>{projetosStats.total_projetos}</span> ativos
              </span>
            </div>

            {/* Resumo */}
            <div
              className="px-6 py-4 grid grid-cols-2 gap-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-1">Vendido</p>
                <p className="text-lg font-black" style={{ color: VIOLET }}>{formatBRL(projetosStats.valor_vendido)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/25 mb-1">Recebido</p>
                <p className="text-lg font-black text-emerald-400">{formatBRL(projetosStats.valor_recebido)}</p>
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {projetos.slice(0, 5).map((p) => {
                const statusColor = p.status_geral === 'quitado' ? '#00d68f' :
                                   p.status_geral === 'em_atraso' ? '#ef4444' :
                                   p.status_geral === 'cancelado' ? '#666' : '#f59e0b'

                return (
                  <div
                    key={p.id}
                    className="px-6 py-3 border-b"
                    style={{ borderBottomColor: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white/70 truncate text-sm">{p.cliente_nome}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: VIOLET }}>
                        {formatBRL(p.valor_total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${p.progresso_pct}%`, background: statusColor }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: statusColor }}>
                        {p.progresso_pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-2 flex-shrink-0 text-center"
              style={{ background: `${VIOLET}08`, borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-[10px] text-white/30">Não contam na meta mensal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
