import { AlertTriangle } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { ChurnStats } from '@/hooks/useTVStats'

interface TVTelaChurnProps {
  churn: ChurnStats
  t: TVThemeColors
}

function Delta({ atual, anterior }: { atual: number; anterior: number }) {
  const diff = atual - anterior
  if (diff === 0) {
    return <span className="text-sm font-semibold text-white/35">= igual ao mês anterior</span>
  }
  if (diff > 0) {
    return (
      <span className="text-sm font-bold" style={{ color: '#ef4444' }}>
        ↑{diff} vs. mês anterior
      </span>
    )
  }
  return (
    <span className="text-sm font-bold" style={{ color: '#00d68f' }}>
      ↓{Math.abs(diff)} vs. mês anterior
    </span>
  )
}

export function TVTelaChurn({ churn }: TVTelaChurnProps) {
  const mesLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
  const cancelamentosAumentaram = churn.canceladosMes > churn.canceladosMesAnterior

  return (
    <div className="min-w-full h-full flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(239,68,68,0.7)' }}>
          Cancelamentos — {mesLabel}
        </p>
      </div>

      {/* 2 Cards grandes */}
      <div className="grid gap-5 flex-1 min-h-0" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Card: Cancelados */}
        <div
          className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            boxShadow: '0 0 50px rgba(239,68,68,0.08)',
          }}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-6" style={{ color: 'rgba(239,68,68,0.7)' }}>
              Cancelados
            </p>
            <p
              className="font-black tabular-nums leading-none"
              style={{ fontSize: '7rem', color: '#ef4444', textShadow: '0 0 40px rgba(239,68,68,0.4)' }}
            >
              {churn.canceladosMes}
            </p>
          </div>
          <Delta atual={churn.canceladosMes} anterior={churn.canceladosMesAnterior} />

          {/* Orb glow */}
          <div
            className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(239,68,68,0.2)' }}
          />
        </div>

        {/* Card: Bloqueados */}
        <div
          className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 0 50px rgba(245,158,11,0.06)',
          }}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-6" style={{ color: 'rgba(245,158,11,0.7)' }}>
              Bloqueados
            </p>
            <p
              className="font-black tabular-nums leading-none"
              style={{ fontSize: '7rem', color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.3)' }}
            >
              {churn.bloqueadosMes}
            </p>
          </div>
          <Delta atual={churn.bloqueadosMes} anterior={churn.bloqueadosMesAnterior} />

          {/* Orb glow */}
          <div
            className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(245,158,11,0.15)' }}
          />
        </div>
      </div>

      {/* Banner de alerta — só aparece se cancelamentos aumentaram */}
      {cancelamentosAumentaram && (
        <div
          className="flex-shrink-0 flex items-center gap-4 px-6 py-4 rounded-2xl"
          style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          <p className="text-sm font-bold" style={{ color: 'rgba(239,68,68,0.85)' }}>
            Cancelamentos aumentaram em relação ao mês anterior
          </p>
        </div>
      )}
    </div>
  )
}
