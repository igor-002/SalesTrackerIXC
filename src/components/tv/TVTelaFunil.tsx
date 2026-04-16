import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { FunilCounts } from '@/hooks/useTVStats'
import { BarChartSemana } from '@/components/charts/BarChartSemana'
import { formatBRL, formatNumber, formatPercent } from '@/lib/formatters'

interface TVTelaFunilProps {
  funilCounts: FunilCounts
  taxaConversao: number
  faturamentoReal: number
  faturamentoPrometido: number
  vendasPorDiaSemana: { dia: string; qtd: number }[]
  t: TVThemeColors
}

export function TVTelaFunil({
  funilCounts,
  taxaConversao,
  faturamentoReal,
  faturamentoPrometido,
  vendasPorDiaSemana,
  t,
}: TVTelaFunilProps) {
  const bloqueados = funilCounts.CN + funilCounts.CM + funilCounts.FA + funilCounts.N

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* ── Linha 1: 3 cards grandes ── */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0" style={{ minHeight: '45%' }}>

        {/* Ativos */}
        <div
          className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${t.primary}25 0%, ${t.primary}08 100%)`,
            border: `1px solid ${t.primary}35`,
            boxShadow: `0 0 60px ${t.primary}20`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: t.primary }}>
              Ativos
            </span>
            <CheckCircle2 size={24} style={{ color: t.primary, opacity: 0.6 }} />
          </div>
          <div>
            <p className="text-8xl font-black text-white tracking-tighter leading-none">
              {formatNumber(funilCounts.A)}
            </p>
            <p className="text-base text-white/50 mt-3 font-medium">{formatBRL(faturamentoReal)}</p>
          </div>
          <div
            className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{ background: t.primary, opacity: 0.15 }}
          />
        </div>

        {/* Aguardando */}
        <div
          className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${t.secondary}20 0%, ${t.secondary}06 100%)`,
            border: `1px solid ${t.secondary}30`,
            boxShadow: `0 0 60px ${t.secondary}15`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: t.secondary }}>
              Aguardando
            </span>
            <Clock size={24} style={{ color: t.secondary, opacity: 0.6 }} />
          </div>
          <div>
            <p className="text-8xl font-black text-white tracking-tighter leading-none">
              {formatNumber(funilCounts.AA)}
            </p>
            <p className="text-base text-white/50 mt-3 font-medium">{formatBRL(faturamentoPrometido)}</p>
          </div>
          <div
            className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{ background: t.secondary, opacity: 0.12 }}
          />
        </div>

        {/* Cancelados / Bloqueados */}
        <div
          className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 100%)',
            border: '1px solid rgba(239,68,68,0.22)',
            boxShadow: '0 0 60px rgba(239,68,68,0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-widest text-red-400">
              Canc. / Bloq.
            </span>
            <XCircle size={24} className="text-red-400 opacity-60" />
          </div>
          <div>
            <p className="text-8xl font-black text-white tracking-tighter leading-none">
              {formatNumber(bloqueados)}
            </p>
            <p className="text-base text-white/40 mt-3 font-medium">
              {funilCounts.CN} cancel. · {funilCounts.CM + funilCounts.FA} bloq.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full blur-2xl bg-red-500 opacity-10 pointer-events-none" />
        </div>
      </div>

      {/* ── Linha 2: conversão + gráfico ── */}
      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: '1fr 2.2fr' }}>

        {/* Taxa de conversão */}
        <div
          className="rounded-3xl p-8 flex flex-col justify-center items-center relative overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${t.primary}18 0%, transparent 100%)`,
            border: `1px solid ${t.primary}28`,
            boxShadow: `inset 0 0 40px ${t.primary}08`,
          }}
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35 mb-4 text-center">
            Conversão AA → A
          </p>
          <p
            className="font-black tracking-tighter leading-none mb-3"
            style={{ fontSize: 'clamp(3.5rem, 6vw, 5rem)', color: t.primary, textShadow: `0 0 40px ${t.primary}60` }}
          >
            {formatPercent(taxaConversao)}
          </p>
          <p className="text-sm text-white/30 text-center">
            {formatNumber(funilCounts.A)} de {formatNumber(funilCounts.A + funilCounts.AA)} propostas
          </p>
          <div
            className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none"
            style={{ background: t.primary, opacity: 0.12 }}
          />
        </div>

        {/* Gráfico semana */}
        <div
          className="rounded-3xl p-6 flex flex-col min-h-0"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${t.secondary}22`,
            borderTop: `2px solid ${t.secondary}`,
          }}
        >
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4 flex-shrink-0">
            Vendas por Dia da Semana
          </p>
          <div className="flex-1 min-h-0">
            <BarChartSemana data={vendasPorDiaSemana} />
          </div>
        </div>
      </div>

    </div>
  )
}
