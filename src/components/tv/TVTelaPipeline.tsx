import { CheckCircle2, Clock, ArrowDown } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { FunilCounts, AlertaAATv } from '@/hooks/useTVStats'
import { formatBRL, formatNumber, formatPercent } from '@/lib/formatters'

interface TVTelaPipelineProps {
  funilCounts: FunilCounts
  taxaConversao: number
  faturamentoReal: number
  faturamentoPrometido: number
  alertasAA: AlertaAATv[]
  t: TVThemeColors
}

export function TVTelaPipeline({
  funilCounts,
  taxaConversao,
  faturamentoReal,
  faturamentoPrometido,
  alertasAA,
  t,
}: TVTelaPipelineProps) {
  const totalPipeline = funilCounts.A + funilCounts.AA
  const pctAtivos = totalPipeline > 0 ? (funilCounts.A / totalPipeline) * 100 : 50
  const top3 = alertasAA.slice(0, 3)

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Funil de Vendas
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {new Date().toLocaleString('pt-BR', { month: 'long' })}
        </span>
      </div>

      <div className="flex-1 grid gap-5 min-h-0" style={{ gridTemplateColumns: '1fr 1.4fr' }}>

        {/* Esquerda: Funil Visual */}
        <div
          className="rounded-3xl p-6 flex flex-col relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 text-center">
            Pipeline Atual
          </p>

          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4">

            {/* Topo — Aguardando */}
            <div className="relative w-full flex flex-col items-center">
              <div
                className="relative flex items-center justify-center py-6 transition-all duration-500"
                style={{
                  width: '100%',
                  background: `linear-gradient(180deg, ${t.secondary}35 0%, ${t.secondary}18 100%)`,
                  clipPath: 'polygon(5% 0%, 95% 0%, 88% 100%, 12% 100%)',
                  boxShadow: `0 4px 30px ${t.secondary}25, inset 0 1px 0 ${t.secondary}40`,
                }}
              >
                <div className="text-center relative z-10">
                  <p className="text-4xl font-black text-white tracking-tight">{formatNumber(funilCounts.AA)}</p>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: t.secondary }}>
                    Aguardando
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{formatBRL(faturamentoPrometido)}</p>
                </div>
                <div className="absolute inset-0 opacity-30 blur-xl" style={{ background: t.secondary }} />
              </div>
              <div className="py-2 flex flex-col items-center">
                <ArrowDown size={16} className="text-white/20 animate-pulse" />
                <span className="text-[10px] font-bold mt-1" style={{ color: t.primary }}>
                  {formatPercent(taxaConversao)} conversão
                </span>
              </div>
            </div>

            {/* Base — Ativos */}
            <div className="relative w-full flex flex-col items-center">
              <div
                className="relative flex items-center justify-center py-8 transition-all duration-500"
                style={{
                  width: '85%',
                  background: `linear-gradient(180deg, ${t.primary}45 0%, ${t.primary}25 100%)`,
                  clipPath: 'polygon(8% 0%, 92% 0%, 80% 100%, 20% 100%)',
                  boxShadow: `0 8px 40px ${t.primary}30, inset 0 1px 0 ${t.primary}50`,
                }}
              >
                <div className="text-center relative z-10">
                  <p className="text-5xl font-black text-white tracking-tight">{formatNumber(funilCounts.A)}</p>
                  <p className="text-sm font-black uppercase tracking-wider mt-1" style={{ color: t.primary }}>
                    Ativos
                  </p>
                  <p className="text-sm text-white/50 mt-0.5 font-semibold">{formatBRL(faturamentoReal)}</p>
                </div>
                <div
                  className="absolute inset-0 opacity-20 blur-2xl animate-pulse"
                  style={{ background: t.primary, animationDuration: '3s' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Direita: Taxa Conversão + Top 3 mais antigos */}
        <div className="flex flex-col gap-4">

          {/* Taxa de Conversão */}
          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${t.primary}18 0%, ${t.primary}05 100%)`,
              border: `1px solid ${t.primary}30`,
              boxShadow: `0 0 60px ${t.primary}15`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Taxa de Conversão</p>
                <p
                  className="text-6xl font-black tracking-tighter"
                  style={{ color: t.primary, textShadow: `0 0 40px ${t.primary}60` }}
                >
                  {formatPercent(taxaConversao)}
                </p>
                <p className="text-sm text-white/30 mt-2">
                  {formatNumber(funilCounts.A)} de {formatNumber(totalPipeline)} propostas convertidas
                </p>
              </div>
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center relative"
                style={{ background: `conic-gradient(${t.primary} ${pctAtivos}%, transparent ${pctAtivos}%)` }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  <CheckCircle2 size={28} style={{ color: t.primary }} />
                </div>
              </div>
            </div>
            <div
              className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: t.primary, opacity: 0.1 }}
            />
          </div>

          {/* Top 3 mais tempo aguardando */}
          <div
            className="flex-1 rounded-3xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid ${t.secondary}22`,
              borderTop: `2px solid ${t.secondary}`,
            }}
          >
            <div
              className="flex items-center gap-2 px-6 py-3 flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Clock size={14} style={{ color: t.secondary }} />
              <span className="text-xs font-black uppercase tracking-widest text-white/40">
                Mais tempo aguardando
              </span>
            </div>

            {top3.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-white/25">Nenhum contrato aguardando</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-around px-6 py-4">
                {top3.map((v) => {
                  const dias = v.dias_em_aa ?? 0
                  const diasColor = dias > 7 ? '#ef4444' : dias >= 4 ? '#f59e0b' : '#00d68f'
                  return (
                    <div key={v.id} className="flex items-center justify-between gap-4 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-white truncate">{v.cliente_nome}</p>
                        <p className="text-sm text-white/40 truncate">{v.vendedor?.nome ?? '—'}</p>
                      </div>
                      <span
                        className="text-3xl font-black tabular-nums flex-shrink-0"
                        style={{ color: diasColor }}
                      >
                        {dias}d
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
