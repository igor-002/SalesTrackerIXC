/**
 * Tela Pipeline - Funil de Vendas Visual
 * Design moderno com funil 3D e métricas destacadas
 */
import { CheckCircle2, Clock, XCircle, TrendingDown, TrendingUp, ArrowDown } from 'lucide-react'
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
  const diffBloq = churn.bloqueadosMes - churn.bloqueadosMesAnterior

  // Calcular totais para proporções do funil
  const totalPipeline = funilCounts.A + funilCounts.AA
  const pctAtivos = totalPipeline > 0 ? (funilCounts.A / totalPipeline) * 100 : 50
  const pctAguardando = totalPipeline > 0 ? (funilCounts.AA / totalPipeline) * 100 : 50

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
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

      {/* Layout principal */}
      <div className="flex-1 grid gap-5 min-h-0" style={{ gridTemplateColumns: '1fr 1.4fr' }}>

        {/* Esquerda: Funil Visual 3D */}
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

          {/* Funil com formato trapezóide */}
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4">

            {/* Topo do funil - Aguardando (mais largo) */}
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
                {/* Glow effect */}
                <div
                  className="absolute inset-0 opacity-30 blur-xl"
                  style={{ background: t.secondary }}
                />
              </div>
              {/* Seta indicando fluxo */}
              <div className="py-2 flex flex-col items-center">
                <ArrowDown size={16} className="text-white/20 animate-pulse" />
                <span className="text-[10px] font-bold mt-1" style={{ color: t.primary }}>
                  {formatPercent(taxaConversao)} conversão
                </span>
              </div>
            </div>

            {/* Base do funil - Ativos (mais estreito) */}
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
                {/* Glow pulsante */}
                <div
                  className="absolute inset-0 opacity-20 blur-2xl animate-pulse"
                  style={{ background: t.primary, animationDuration: '3s' }}
                />
              </div>
            </div>

            {/* Saída - Perdidos */}
            <div className="flex items-center gap-3 mt-4 px-4 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <XCircle size={14} className="text-red-400/60" />
              <span className="text-xs text-white/40">Saídas:</span>
              <span className="text-sm font-black text-red-400">{funilCounts.CN}</span>
              <span className="text-xs text-white/30">cancelados</span>
            </div>
          </div>
        </div>

        {/* Direita: Métricas detalhadas */}
        <div className="flex flex-col gap-4">

          {/* Cards principais - Conversão destacada */}
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
              <div className="flex flex-col items-end gap-2">
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
            </div>
            <div
              className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: t.primary, opacity: 0.1 }}
            />
          </div>

          {/* Grid Cancelados + Bloqueados */}
          <div className="flex-1 grid grid-cols-2 gap-4">

            {/* Cancelados */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-red-400/70">Cancelados</span>
                <XCircle size={18} className="text-red-400/50" />
              </div>
              <div>
                <p className="text-5xl font-black text-red-400 tracking-tighter leading-none">
                  {churn.canceladosMes}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {diffCancel !== 0 ? (
                    <>
                      {cancelamentosAumentaram ? (
                        <TrendingUp size={14} className="text-red-400" />
                      ) : (
                        <TrendingDown size={14} className="text-emerald-400" />
                      )}
                      <span className={`text-sm font-bold ${cancelamentosAumentaram ? 'text-red-400' : 'text-emerald-400'}`}>
                        {diffCancel > 0 ? '+' : ''}{diffCancel} vs mês anterior
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-white/30">= igual ao mês anterior</span>
                  )}
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl bg-red-500/20 pointer-events-none" />
            </div>

            {/* Bloqueados */}
            <div
              className="rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
                border: '1px solid rgba(245,158,11,0.22)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400/70">Bloqueados</span>
                <Clock size={18} className="text-amber-400/50" />
              </div>
              <div>
                <p className="text-5xl font-black text-amber-400 tracking-tighter leading-none">
                  {churn.bloqueadosMes}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {diffBloq !== 0 ? (
                    <>
                      {diffBloq > 0 ? (
                        <TrendingUp size={14} className="text-amber-400" />
                      ) : (
                        <TrendingDown size={14} className="text-emerald-400" />
                      )}
                      <span className={`text-sm font-bold ${diffBloq > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {diffBloq > 0 ? '+' : ''}{diffBloq} vs mês anterior
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-white/30">= igual ao mês anterior</span>
                  )}
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl bg-amber-500/15 pointer-events-none" />
            </div>
          </div>

          {/* Alerta visual se cancelamentos aumentaram */}
          {cancelamentosAumentaram && (
            <div
              className="rounded-xl px-5 py-3 flex items-center gap-3"
              style={{
                background: 'linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)',
                border: '1px solid rgba(239,68,68,0.3)',
                boxShadow: '0 0 20px rgba(239,68,68,0.1)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}
              />
              <span className="text-sm font-bold text-red-400">
                Atenção: cancelamentos em alta este mês
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
