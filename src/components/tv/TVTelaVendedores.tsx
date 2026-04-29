import { Trophy } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { VendedorRanking } from '@/hooks/useTVStats'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface TVTelaVendedoresProps {
  rankingVendedores: VendedorRanking[]
  metasVendedorMap: Record<string, number>
  t: TVThemeColors
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

export function TVTelaVendedores({
  rankingVendedores,
  metasVendedorMap,
  t,
}: TVTelaVendedoresProps) {
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long' })

  if (rankingVendedores.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <Trophy size={52} style={{ color: t.primary, opacity: 0.35 }} />
        <p className="text-2xl font-bold text-white/30">Nenhuma venda confirmada este mês</p>
      </div>
    )
  }

  const maxTotal = rankingVendedores[0]?.total || 1

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Ranking Vendedores
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {monthLabel}
        </span>
      </div>

      <div
        className="flex-1 rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderTop: `2px solid ${t.primary}`,
        }}
      >
        {/* Cabeçalho */}
        <div
          className="grid text-[11px] font-black uppercase tracking-widest text-white/25 px-8 py-3 flex-shrink-0"
          style={{
            gridTemplateColumns: '2rem 1fr 2fr 5rem 9rem',
            gap: '1.5rem',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <span>#</span>
          <span>Vendedor</span>
          <span>Faturamento</span>
          <span className="text-right">Contr.</span>
          <span className="text-right">Meta</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rankingVendedores.slice(0, 8).map((v, i) => {
            const pct = Math.round((v.total / maxTotal) * 100)
            const isFirst = i === 0
            const isTop3 = i < 3
            const meta = metasVendedorMap[v.id] ?? 0
            const pctMeta = meta > 0 ? Math.min(100, (v.qtd / meta) * 100) : 0
            const metaAtingida = pctMeta >= 100

            return (
              <div
                key={v.id}
                className="grid items-center px-8 py-4 border-b"
                style={{
                  gridTemplateColumns: '2rem 1fr 2fr 5rem 9rem',
                  gap: '1.5rem',
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                  background: isFirst ? `${t.primary}08` : undefined,
                }}
              >
                {/* Rank */}
                <span className="w-6 text-center flex-shrink-0 text-base">
                  {isTop3
                    ? RANK_ICONS[i]
                    : <span className="text-xs font-bold text-white/20">{i + 1}</span>
                  }
                </span>

                {/* Nome */}
                <span
                  className="font-bold truncate"
                  style={{
                    fontSize: isFirst ? '1.15rem' : '1rem',
                    color: isFirst ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                  }}
                >
                  {v.nome}
                </span>

                {/* Faturamento + barra */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="font-black tabular-nums"
                      style={{
                        fontSize: isFirst ? '1.1rem' : '0.95rem',
                        color: isFirst ? t.primary : `${t.primary}90`,
                      }}
                    >
                      {formatBRL(v.total)}
                    </span>
                    <span className="text-[10px] text-white/25">{v.taxaConversao.toFixed(0)}% conv.</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: isFirst ? t.primary : `${t.primary}55` }}
                    />
                  </div>
                </div>

                {/* Contratos ativos */}
                <div className="text-right">
                  <span
                    className="text-2xl font-black tabular-nums"
                    style={{ color: isFirst ? t.primary : `${t.primary}90` }}
                  >
                    {formatNumber(v.qtd)}
                  </span>
                </div>

                {/* Meta progress */}
                <div className="text-right">
                  {meta > 0 ? (
                    <div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: metaAtingida ? '#00d68f' : 'rgba(255,255,255,0.5)' }}
                      >
                        {v.qtd}/{meta}
                      </span>
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pctMeta}%`,
                            background: metaAtingida ? '#00d68f' : t.secondary,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-white/15">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
