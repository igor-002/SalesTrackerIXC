/**
 * Tela Pipeline - Consolida Funil + Churn
 * Visão completa do status dos contratos e tendência de cancelamentos
 */
import { CheckCircle2, Clock, XCircle, TrendingDown, TrendingUp } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { FunilCounts, ChurnStats } from '@/hooks/useTVStats'
import { formatBRL, formatNumber, formatPercent } from '@/lib/formatters'

interface TVTelaPipelineProps {
  funilCounts: FunilCounts
  churn: ChurnStats
  taxaConversao: number
  faturamentoReal: number
  faturamentoPrometido: number
  t: TVThemeColors
}

export function TVTelaPipeline({
  funilCounts,
  churn,
  taxaConversao,
  faturamentoReal,
  faturamentoPrometido,
  t,
}: TVTelaPipelineProps) {
  const cancelamentosAumentaram = churn.canceladosMes > churn.canceladosMesAnterior
  const diffCancel = churn.canceladosMes - churn.canceladosMesAnterior

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Pipeline de Contratos
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {new Date().toLocaleString('pt-BR', { month: 'long' })}
        </span>
      </div>

      {/* Grid principal */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: '1.8fr 1fr' }}>

        {/* Esquerda: Status cards */}
        <div className="flex flex-col gap-4">
          {/* Ativos + Aguardando */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* Ativos */}
            <div
              className="rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${t.primary}22 0%, ${t.primary}08 100%)`,
                border: `1px solid ${t.primary}35`,
                boxShadow: `0 0 40px ${t.primary}15`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: t.primary }}>
                  Ativos
                </span>
                <CheckCircle2 size={20} style={{ color: t.primary, opacity: 0.6 }} />
              </div>
              <div>
                <p className="text-6xl font-black text-white tracking-tighter leading-none">
                  {formatNumber(funilCounts.A)}
                </p>
                <p className="text-sm text-white/40 mt-2 font-medium">{formatBRL(faturamentoReal)}</p>
              </div>
              <div
                className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl pointer-events-none"
                style={{ background: t.primary, opacity: 0.12 }}
              />
            </div>

            {/* Aguardando */}
            <div
              className="rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${t.secondary}18 0%, ${t.secondary}05 100%)`,
                border: `1px solid ${t.secondary}28`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: t.secondary }}>
                  Aguardando
                </span>
                <Clock size={20} style={{ color: t.secondary, opacity: 0.6 }} />
              </div>
              <div>
                <p className="text-6xl font-black text-white tracking-tighter leading-none">
                  {formatNumber(funilCounts.AA)}
                </p>
                <p className="text-sm text-white/40 mt-2 font-medium">{formatBRL(faturamentoPrometido)}</p>
              </div>
              <div
                className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-2xl pointer-events-none"
                style={{ background: t.secondary, opacity: 0.1 }}
              />
            </div>
          </div>

          {/* Taxa de conversão + Cancelados/Bloqueados */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            {/* Conversão */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-center items-center relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${t.primary}12 0%, transparent 100%)`,
                border: `1px solid ${t.primary}22`,
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                Conversão
              </p>
              <p
                className="text-4xl font-black tracking-tighter"
                style={{ color: t.primary, textShadow: `0 0 30px ${t.primary}50` }}
              >
                {formatPercent(taxaConversao)}
              </p>
              <p className="text-xs text-white/25 mt-1">AA → A</p>
            </div>

            {/* Cancelados */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-center items-center relative overflow-hidden"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400/60 mb-2">
                Cancelados
              </p>
              <p className="text-4xl font-black text-red-400 tracking-tighter">
                {churn.canceladosMes}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {diffCancel !== 0 && (
                  <>
                    {cancelamentosAumentaram ? (
                      <TrendingUp size={12} className="text-red-400" />
                    ) : (
                      <TrendingDown size={12} className="text-emerald-400" />
                    )}
                    <span className={`text-xs font-bold ${cancelamentosAumentaram ? 'text-red-400' : 'text-emerald-400'}`}>
                      {diffCancel > 0 ? '+' : ''}{diffCancel}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Bloqueados */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-center items-center relative overflow-hidden"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/60 mb-2">
                Bloqueados
              </p>
              <p className="text-4xl font-black text-amber-400 tracking-tighter">
                {churn.bloqueadosMes}
              </p>
              <p className="text-xs text-white/25 mt-1">CM + FA</p>
            </div>
          </div>
        </div>

        {/* Direita: Funil visual */}
        <div
          className="rounded-3xl p-6 flex flex-col"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderTop: `2px solid ${t.primary}`,
          }}
        >
          <p className="text-xs font-black uppercase tracking-widest text-white/25 mb-6">
            Funil do Mês
          </p>

          <div className="flex-1 flex flex-col justify-center gap-4">
            {/* Barra Ativos */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold" style={{ color: t.primary }}>Ativos</span>
                <span className="font-black tabular-nums" style={{ color: t.primary }}>{funilCounts.A}</span>
              </div>
              <div className="h-8 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-xl"
                  style={{ width: '100%', background: `linear-gradient(90deg, ${t.primary}, ${t.primary}88)` }}
                />
              </div>
            </div>

            {/* Barra Aguardando */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold" style={{ color: t.secondary }}>Aguardando</span>
                <span className="font-black tabular-nums" style={{ color: t.secondary }}>{funilCounts.AA}</span>
              </div>
              <div className="h-8 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-xl"
                  style={{
                    width: `${funilCounts.A > 0 ? Math.round((funilCounts.AA / funilCounts.A) * 100) : 0}%`,
                    background: `linear-gradient(90deg, ${t.secondary}, ${t.secondary}88)`,
                  }}
                />
              </div>
            </div>

            {/* Barra Cancelados */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-red-400">Cancelados</span>
                <span className="font-black tabular-nums text-red-400">{funilCounts.CN}</span>
              </div>
              <div className="h-8 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-xl"
                  style={{
                    width: `${funilCounts.A > 0 ? Math.min(Math.round((funilCounts.CN / funilCounts.A) * 100), 100) : 0}%`,
                    background: 'linear-gradient(90deg, #ef4444, #ef444488)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Alerta se cancelamentos aumentaram */}
          {cancelamentosAumentaram && (
            <div
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <XCircle size={14} />
              Cancelamentos em alta
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
