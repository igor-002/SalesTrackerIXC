/**
 * Tela Vendedores - Consolida Ranking + Velocidade
 * Performance completa: faturamento e velocidade de ativação
 */
import { Trophy, Zap } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { VendedorRanking, VelocidadeVendedor } from '@/hooks/useTVStats'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface TVTelaVendedoresProps {
  rankingVendedores: VendedorRanking[]
  velocidadeVendedores: VelocidadeVendedor[]
  mediaVelocidadeTime: number
  t: TVThemeColors
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

function fmt(dias: number) {
  return dias.toFixed(1) + 'd'
}

export function TVTelaVendedores({
  rankingVendedores,
  velocidadeVendedores,
  mediaVelocidadeTime,
  t,
}: TVTelaVendedoresProps) {
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long' })

  if (rankingVendedores.length === 0 && velocidadeVendedores.length === 0) {
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

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Performance Vendedores
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Grid 2 colunas */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: '1.2fr 1fr' }}>

        {/* Esquerda: Ranking Faturamento */}
        <div
          className="rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderTop: `2px solid ${t.primary}`,
          }}
        >
          <div
            className="flex items-center gap-2 px-6 py-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Trophy size={14} style={{ color: t.primary }} />
            <span className="text-xs font-black uppercase tracking-widest text-white/40">Faturamento</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rankingVendedores.slice(0, 6).map((v, i) => {
              const pct = Math.round((v.total / maxTotal) * 100)
              const isFirst = i === 0
              const isTop3 = i < 3

              return (
                <div
                  key={v.id}
                  className="px-6 py-4 border-b"
                  style={{
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                    background: isFirst ? `${t.primary}08` : undefined,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Posição */}
                    <span className="w-6 text-center flex-shrink-0 text-base">
                      {isTop3 ? RANK_ICONS[i] : <span className="text-xs font-bold text-white/20">{i + 1}</span>}
                    </span>

                    {/* Nome + Total */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-bold truncate"
                          style={{
                            fontSize: isFirst ? '1.15rem' : '1rem',
                            color: isFirst ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                          }}
                        >
                          {v.nome}
                        </span>
                        <span
                          className="font-black tabular-nums flex-shrink-0"
                          style={{
                            fontSize: isFirst ? '1.1rem' : '0.95rem',
                            color: isFirst ? t.primary : `${t.primary}90`,
                          }}
                        >
                          {formatBRL(v.total)}
                        </span>
                      </div>

                      {/* Barra */}
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: isFirst ? t.primary : `${t.primary}55` }}
                        />
                      </div>

                      {/* Métricas */}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/25">
                        <span>{formatNumber(v.qtd)} contratos</span>
                        <span>·</span>
                        <span>{v.taxaConversao.toFixed(0)}% conv.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Direita: Velocidade */}
        <div
          className="rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderTop: `2px solid ${t.secondary}`,
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-3 flex-shrink-0"
            style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <Zap size={14} style={{ color: t.secondary }} />
              <span className="text-xs font-black uppercase tracking-widest text-white/40">Velocidade</span>
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: t.secondary }}>
              Média: {fmt(mediaVelocidadeTime)}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {velocidadeVendedores.slice(0, 6).map((v, i) => {
              const isFirst = i === 0
              const isTop3 = i < 3
              const alertaOperacao = mediaVelocidadeTime > 0 && v.mediaDias > mediaVelocidadeTime * 2

              return (
                <div
                  key={v.id}
                  className="px-6 py-4 border-b"
                  style={{
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                    background: isFirst ? `${t.secondary}08` : undefined,
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Posição */}
                    <span className="w-6 text-center flex-shrink-0 text-base">
                      {isTop3 ? RANK_ICONS[i] : <span className="text-xs font-bold text-white/20">{i + 1}</span>}
                    </span>

                    {/* Nome + Velocidade */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-bold truncate"
                          style={{
                            fontSize: isFirst ? '1.15rem' : '1rem',
                            color: isFirst ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                          }}
                        >
                          {v.nome}
                        </span>
                        <span
                          className="font-black tabular-nums flex-shrink-0"
                          style={{
                            fontSize: isFirst ? '1.4rem' : '1.1rem',
                            color: alertaOperacao ? '#f59e0b' : isFirst ? t.secondary : `${t.secondary}90`,
                          }}
                        >
                          {fmt(v.mediaDias)}
                        </span>
                      </div>

                      {/* Métricas */}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/25">
                        <span>melhor {fmt(v.melhorCaso)}</span>
                        <span>·</span>
                        <span>pior {fmt(v.piorCaso)}</span>
                        <span>·</span>
                        <span>{v.totalContratos} ativ.</span>
                      </div>

                      {alertaOperacao && (
                        <span
                          className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                        >
                          verificar operação
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
