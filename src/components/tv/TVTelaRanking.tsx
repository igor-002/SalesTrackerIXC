import { Trophy } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { VendedorRanking } from '@/hooks/useTVStats'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface TVTelaRankingProps {
  rankingVendedores: VendedorRanking[]
  t: TVThemeColors
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

export function TVTelaRanking({ rankingVendedores, t }: TVTelaRankingProps) {
  if (rankingVendedores.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <Trophy size={52} style={{ color: t.primary, opacity: 0.35 }} />
        <p className="text-2xl font-bold text-white/30">Nenhuma venda confirmada este mês</p>
      </div>
    )
  }

  const maxTotal = rankingVendedores[0].total || 1
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Ranking de Vendedores
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Lista única */}
      <div
        className="flex-1 rounded-3xl overflow-hidden min-h-0"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderTop: `2px solid ${t.primary}`,
        }}
      >
        <div className="h-full overflow-y-auto">
          {rankingVendedores.map((v, i) => {
            const pct = Math.round((v.total / maxTotal) * 100)
            const isFirst = i === 0
            const isTop3 = i < 3

            return (
              <div
                key={v.id}
                className="px-8 py-5 border-b"
                style={{
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                  background: isFirst ? `${t.primary}08` : undefined,
                }}
              >
                {/* Linha principal */}
                <div className="flex items-center gap-5">
                  {/* Posição */}
                  <span className="w-8 text-center flex-shrink-0 text-lg leading-none">
                    {isTop3
                      ? RANK_ICONS[i]
                      : <span className="text-sm font-bold text-white/20 tabular-nums">{i + 1}</span>
                    }
                  </span>

                  {/* Nome + métricas secundárias */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="block truncate font-bold"
                      style={{
                        fontSize: isFirst ? '1.5rem' : isTop3 ? '1.25rem' : '1.1rem',
                        color: isFirst ? 'rgba(255,255,255,0.95)' : isTop3 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {v.nome}
                    </span>
                    <div className="flex items-center gap-2 mt-1" style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem' }}>
                      <span>{formatNumber(v.qtd)} contrato{v.qtd !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{formatBRL(v.ticketMedio)} ticket</span>
                      <span>·</span>
                      <span>{v.taxaConversao.toFixed(0)}% conversão</span>
                    </div>
                  </div>

                  {/* Total */}
                  <span
                    className="font-black tabular-nums flex-shrink-0 text-right"
                    style={{
                      fontSize: isFirst ? '1.6rem' : isTop3 ? '1.3rem' : '1.1rem',
                      color: isFirst ? t.primary : isTop3 ? `${t.primary}cc` : `${t.primary}70`,
                    }}
                  >
                    {formatBRL(v.total)}
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="mt-3 ml-13 h-1 rounded-full overflow-hidden" style={{ marginLeft: '3.25rem', background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: isFirst ? t.primary : `${t.primary}55`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
