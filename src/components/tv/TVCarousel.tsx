import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, Repeat2, Users, XCircle, RotateCcw } from 'lucide-react'
import { TVCard } from './TVCard'
import { TVMetaBar } from './TVMetaBar'
import { BarChartSemana } from '@/components/charts/BarChartSemana'
import { BarChartFaturamento } from '@/components/charts/BarChartFaturamento'
import { formatBRL, formatNumber, formatPercent } from '@/lib/formatters'
import type { DashboardStats } from '@/hooks/useDashboardStats'

interface TVCarouselProps {
  stats: DashboardStats
  metaMensal: number
  metaSemanal: number
  slideInterval?: number
}

const DOTS = [0, 1, 2, 3]

export function TVCarousel({ stats, metaMensal, metaSemanal, slideInterval = 12000 }: TVCarouselProps) {
  const [slide, setSlide] = useState(0)

  const next = useCallback(() => setSlide((s) => (s + 1) % 4), [])

  useEffect(() => {
    const id = setInterval(next, slideInterval)
    return () => clearInterval(id)
  }, [next, slideInterval])

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${slide * 100}%)` }}
      >
        {/* Slide 1 — KPIs */}
        <div className="min-w-full h-full grid grid-cols-2 gap-4 p-1 content-start">
          <TVCard
            title="Faturamento do Mês"
            value={formatBRL(stats.faturamentoMes)}
            icon={<DollarSign size={20} />}
            accent="text-blue-600"
          />
          <TVCard
            title="MRR"
            value={formatBRL(stats.mrrTotal)}
            subtitle="Receita recorrente"
            icon={<Repeat2 size={20} />}
            accent="text-emerald-400"
          />
          <TVCard
            title="Ticket Médio"
            value={formatBRL(stats.ticketMedio)}
            icon={<TrendingUp size={20} />}
            accent="text-cyan-400"
          />
          <TVCard
            title="Vendas Únicas"
            value={formatNumber(stats.vendasUnicasMes)}
            subtitle="Este mês"
            icon={<Users size={20} />}
            accent="text-amber-400"
          />
        </div>

        {/* Slide 2 — Metas + cancelamentos */}
        <div className="min-w-full h-full grid grid-cols-2 gap-4 p-1 content-start">
          <TVMetaBar
            label="Meta Mensal"
            atual={stats.faturamentoMes}
            meta={metaMensal}
            color="primary"
          />
          <TVMetaBar
            label="Meta Semanal"
            atual={stats.faturamentoMes}
            meta={metaSemanal}
            color="secondary"
          />
          <TVCard
            title="Cancelamentos"
            value={formatNumber(stats.cancelamentosMes)}
            subtitle="Este mês"
            icon={<XCircle size={20} />}
            accent="text-red-400"
          />
          <TVCard
            title="Turn-over"
            value={formatPercent(stats.turnOverPct)}
            subtitle="Taxa de cancelamento"
            icon={<RotateCcw size={20} />}
            accent="text-orange-400"
          />
        </div>

        {/* Slide 3 — Vendas por dia da semana */}
        <div className="min-w-full h-full flex flex-col gap-3 p-1">
          <div className="glass rounded-2xl px-6 py-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Vendas por Dia da Semana</p>
          </div>
          <div className="flex-1 glass rounded-2xl p-6" style={{ minHeight: 0 }}>
            <BarChartSemana data={stats.vendasPorDiaSemana} />
          </div>
        </div>

        {/* Slide 4 — Faturamento 12 meses */}
        <div className="min-w-full h-full flex flex-col gap-3 p-1">
          <div className="glass rounded-2xl px-6 py-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Faturamento — Últimos 12 Meses</p>
          </div>
          <div className="flex-1 glass rounded-2xl p-6" style={{ minHeight: 0 }}>
            <BarChartFaturamento data={stats.faturamento12Meses} />
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5 pb-2">
        {DOTS.map((i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`rounded-full transition-all duration-300 cursor-pointer ${
              i === slide ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
