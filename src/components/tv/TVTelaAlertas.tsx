import { CheckCircle2 } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { AlertaAATv } from '@/hooks/useTVStats'

interface TVTelaAlertasProps {
  alertasAA: AlertaAATv[]
  t: TVThemeColors
}

export function TVTelaAlertas({ alertasAA, t }: TVTelaAlertasProps) {
  if (alertasAA.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{ background: `${t.primary}18`, boxShadow: `0 0 60px ${t.primary}30` }}
        >
          <CheckCircle2 size={64} style={{ color: t.primary }} />
        </div>
        <div className="text-center">
          <p className="text-4xl font-black text-white mb-3">Tudo em dia!</p>
          <p className="text-xl text-white/40">Nenhum contrato aguardando assinatura</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.secondary}99` }}>
          Contratos Aguardando Assinatura
        </p>
        <span
          className="text-sm font-black px-4 py-1.5 rounded-full"
          style={{
            background: `${t.secondary}20`,
            color: t.secondary,
            border: `1px solid ${t.secondary}35`,
          }}
        >
          {alertasAA.length} contrato{alertasAA.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      <div
        className="flex-1 rounded-3xl overflow-hidden min-h-0"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${t.secondary}22`,
          borderTop: `2px solid ${t.secondary}`,
          boxShadow: `0 0 40px ${t.secondary}10`,
        }}
      >
        {/* Cabeçalho fixo */}
        <div
          className="grid text-[11px] font-black uppercase tracking-widest text-white/25 px-8 py-4 flex-shrink-0"
          style={{ gridTemplateColumns: '1fr 220px 100px 130px', gap: '1.5rem', background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span>Cliente</span>
          <span>Vendedor</span>
          <span className="text-right">Dias</span>
          <span className="text-right">Urgência</span>
        </div>

        <div className="h-full overflow-y-auto">
          {alertasAA.map((v, idx) => {
            const dias = v.dias_em_aa ?? 0
            const urgente = dias > 7
            const atencao = dias >= 4 && dias <= 7
            const verde   = dias >= 1 && dias <= 3

            const rowBg = urgente
              ? 'rgba(239,68,68,0.07)'
              : atencao
              ? 'rgba(245,158,11,0.06)'
              : verde
              ? 'rgba(0,214,143,0.06)'
              : undefined

            const borderColor = urgente
              ? 'rgba(239,68,68,0.3)'
              : atencao
              ? 'rgba(245,158,11,0.25)'
              : verde
              ? 'rgba(0,214,143,0.35)'
              : 'rgba(255,255,255,0.04)'

            const leftBorder = urgente
              ? '3px solid #ef4444'
              : atencao
              ? '3px solid #f59e0b'
              : verde
              ? '3px solid #00d68f'
              : '3px solid transparent'

            const diasColor = urgente
              ? '#ef4444'
              : atencao
              ? '#f59e0b'
              : verde
              ? '#00d68f'
              : 'rgba(255,255,255,0.35)'

            return (
              <div
                key={v.id}
                className="grid items-center px-8 py-5 border-b transition-colors"
                style={{
                  gridTemplateColumns: '1fr 220px 100px 130px',
                  gap: '1.5rem',
                  background: rowBg,
                  borderBottomColor: borderColor,
                  borderLeft: leftBorder,
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                <span className="text-xl font-bold text-white truncate">{v.cliente_nome}</span>

                <span className="text-base text-white/45 truncate">
                  {v.vendedor?.nome ?? '—'}
                </span>

                <span
                  className="text-2xl font-black text-right tabular-nums"
                  style={{ color: diasColor }}
                >
                  {dias}d
                </span>

                <div className="flex justify-end">
                  {urgente ? (
                    <span
                      className="text-xs font-black px-3 py-1.5 rounded-full whitespace-nowrap"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 0 12px rgba(239,68,68,0.25)' }}
                    >
                      URGENTE
                    </span>
                  ) : atencao ? (
                    <span
                      className="text-xs font-black px-3 py-1.5 rounded-full whitespace-nowrap"
                      style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}
                    >
                      ATENÇÃO
                    </span>
                  ) : verde ? (
                    <span
                      className="text-xs font-black px-3 py-1.5 rounded-full whitespace-nowrap"
                      style={{ background: 'rgba(0,214,143,0.18)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.35)' }}
                    >
                      Em dia
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap text-white/25 bg-white/5 border border-white/8">
                      Pendente
                    </span>
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
