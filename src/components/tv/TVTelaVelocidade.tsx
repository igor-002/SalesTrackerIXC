import { Zap } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { VelocidadeVendedor } from '@/hooks/useTVStats'

interface TVTelaVelocidadeProps {
  velocidadeVendedores: VelocidadeVendedor[]
  mediaVelocidadeTime: number
  t: TVThemeColors
}

const RANK_ICONS = ['🥇', '🥈', '🥉']

function fmt(dias: number) {
  return dias.toFixed(1) + 'd'
}

export function TVTelaVelocidade({ velocidadeVendedores, mediaVelocidadeTime, t }: TVTelaVelocidadeProps) {
  if (velocidadeVendedores.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <Zap size={52} style={{ color: t.primary, opacity: 0.35 }} />
        <p className="text-2xl font-bold text-white/30">Nenhum contrato ativado com dados suficientes</p>
      </div>
    )
  }

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex flex-col flex-shrink-0 gap-1">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Velocidade de Ativação
        </p>
        <p className="text-xs text-white/30">dias entre cadastro e ativação no IXC</p>
      </div>

      {/* Lista */}
      <div
        className="flex-1 rounded-3xl overflow-hidden min-h-0"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderTop: `2px solid ${t.primary}`,
        }}
      >
        <div className="h-full overflow-y-auto">
          {velocidadeVendedores.map((v, i) => {
            const isFirst = i === 0
            const isTop3 = i < 3
            const alertaOperacao = mediaVelocidadeTime > 0 && v.mediaDias > mediaVelocidadeTime * 2

            return (
              <div
                key={v.id}
                className="px-8 py-5 border-b"
                style={{
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                  background: isFirst ? `${t.primary}08` : undefined,
                }}
              >
                <div className="flex items-start gap-5">
                  {/* Posição */}
                  <span className="w-8 text-center flex-shrink-0 text-lg leading-none pt-1">
                    {isTop3
                      ? RANK_ICONS[i]
                      : <span className="text-sm font-bold text-white/20 tabular-nums">{i + 1}</span>
                    }
                  </span>

                  {/* Nome + badge alerta */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="block font-bold truncate"
                      style={{
                        fontSize: isFirst ? '1.4rem' : isTop3 ? '1.2rem' : '1rem',
                        color: isFirst ? 'rgba(255,255,255,0.95)' : isTop3 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {v.nome}
                    </span>
                    <div className="flex items-center gap-2 mt-1" style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.75rem' }}>
                      <span>melhor {fmt(v.melhorCaso)}</span>
                      <span>·</span>
                      <span>pior {fmt(v.piorCaso)}</span>
                      <span>·</span>
                      <span>{v.totalContratos} contrato{v.totalContratos !== 1 ? 's' : ''}</span>
                    </div>
                    {alertaOperacao && (
                      <div className="mt-2">
                        <span
                          className="inline-block text-xs font-bold px-3 py-1 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}
                        >
                          verificar operação
                        </span>
                        <span className="ml-2 text-xs text-white/25">pode ser gargalo de instalação</span>
                      </div>
                    )}
                  </div>

                  {/* Média em dias — destaque */}
                  <div className="text-right flex-shrink-0">
                    <span
                      className="font-black tabular-nums leading-none"
                      style={{
                        fontSize: isFirst ? '2.2rem' : isTop3 ? '1.8rem' : '1.5rem',
                        color: isFirst ? t.primary : isTop3 ? `${t.primary}cc` : `${t.primary}70`,
                      }}
                    >
                      {fmt(v.mediaDias)}
                    </span>
                    <p className="text-xs text-white/25 mt-1">média</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé: média do time */}
      <div
        className="flex-shrink-0 flex items-center justify-end px-6 py-3 rounded-2xl"
        style={{ background: `${t.primary}0a`, border: `1px solid ${t.primary}18` }}
      >
        <span className="text-sm text-white/40 mr-3">Média do time</span>
        <span className="text-xl font-black tabular-nums" style={{ color: t.primary }}>
          {fmt(mediaVelocidadeTime)}
        </span>
      </div>
    </div>
  )
}
