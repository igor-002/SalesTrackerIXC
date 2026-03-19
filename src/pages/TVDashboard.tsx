import { useCallback, useState, useEffect } from 'react'
import { DollarSign, Repeat2 } from 'lucide-react'
import { TVClock } from '@/components/tv/TVClock'
import { TVCard } from '@/components/tv/TVCard'
import { TVLogo } from '@/components/tv/TVLogo'
import { TVVendasCarousel } from '@/components/tv/TVVendasCarousel'
import { TVMetaCarousel } from '@/components/tv/TVMetaCarousel'
import { TVMetaAreaChart } from '@/components/tv/TVMetaAreaChart'
import { BarChartFaturamento } from '@/components/charts/BarChartFaturamento'
import { Spinner } from '@/components/ui/Spinner'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useMetas } from '@/hooks/useMetas'
import { useRealtime } from '@/hooks/useRealtime'
import { formatBRL, formatNumber } from '@/lib/formatters'

type TVTheme = 'blue' | 'green'

const THEMES = {
  blue: {
    bg: '#080f1e',
    glow: 'rgba(59,130,246,0.08)',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    card1: 'text-blue-400',
    card2: 'text-blue-300',
    card3: 'text-cyan-400',
    metaColors: ['#3b82f6', '#60a5fa'] as [string, string],
  },
  green: {
    bg: '#0c1e14',
    glow: 'rgba(0,214,143,0.07)',
    primary: '#00d68f',
    secondary: '#06b6d4',
    card1: 'text-emerald-400',
    card2: 'text-cyan-400',
    card3: 'text-amber-400',
    metaColors: ['#00d68f', '#06b6d4'] as [string, string],
  },
}

const THEME_KEY = 'tv_theme'

export default function TVDashboard() {
  const { stats, loading, refetch } = useDashboardStats()
  const { getMetaAtual } = useMetas()

  const [theme, setTheme] = useState<TVTheme>(() => {
    return (localStorage.getItem(THEME_KEY) as TVTheme) ?? 'blue'
  })

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const handleChange = useCallback(() => { refetch() }, [refetch])
  useRealtime({ onVenda: handleChange, onCancelamento: handleChange })

  const metaAtual = getMetaAtual()
  const now = new Date()
  const t = THEMES[theme]

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: t.bg }}>
        <Spinner size="lg" style={{ color: t.primary }} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col p-4 gap-3 relative overflow-hidden" style={{ background: t.bg }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${t.glow} 0%, transparent 70%)` }} />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between flex-shrink-0">
        <TVLogo accentHex={t.primary} />

        {/* Theme toggle */}
        <div
          className="flex items-center gap-1 rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setTheme('green')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer"
            style={theme === 'green'
              ? { background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.3)' }
              : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
            }
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: theme === 'green' ? '#00d68f' : 'rgba(0,214,143,0.4)' }} />
            Verde
          </button>
          <button
            onClick={() => setTheme('blue')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 cursor-pointer"
            style={theme === 'blue'
              ? { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }
              : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
            }
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: theme === 'blue' ? '#3b82f6' : 'rgba(59,130,246,0.4)' }} />
            Azul
          </button>
        </div>

        <TVClock />
      </header>

      {/* ── GRID PRINCIPAL ── */}
      <div className="relative z-10 flex-1 grid gap-3" style={{
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr auto auto',
        minHeight: 0,
      }}>

        {/* Gráfico 12 meses */}
        <div className="glass rounded-2xl p-5 flex flex-col" style={{ gridColumn: '1', gridRow: '1', borderTop: `2px solid ${t.primary}` }}>
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">
            Faturamento — Últimos 12 Meses
          </p>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <BarChartFaturamento data={stats.faturamento12Meses} accentHex={t.primary} />
          </div>
        </div>

        {/* Vendas carousel */}
        <div style={{ gridColumn: '2', gridRow: '1' }}>
          <TVVendasCarousel
            hoje={{ faturamento: stats.faturamentoHoje, vendas: stats.vendasHoje }}
            semana={{ faturamento: stats.faturamentoSemana, vendas: stats.vendasSemana }}
            mes={{ faturamento: stats.faturamentoMes, vendas: stats.vendasMes }}
            accentHex={t.primary}
          />
        </div>

        {/* ── LINHA 2: 2 cards grandes ── */}
        <div className="grid gap-3" style={{ gridColumn: '1 / -1', gridRow: '2', gridTemplateColumns: '1fr 1fr' }}>
          <TVCard
            title="Receita sem Recorrência"
            value={formatBRL(stats.faturamentoSemRecorrencia)}
            subtitle={`${formatNumber(stats.vendasUnicasMes)} venda${stats.vendasUnicasMes !== 1 ? 's' : ''} única${stats.vendasUnicasMes !== 1 ? 's' : ''}`}
            icon={<DollarSign size={20} />}
            accent={t.card1}
          />
          <TVCard
            title="MRR"
            value={formatBRL(stats.mrrTotal)}
            subtitle="Receita Recorrente Mensal"
            icon={<Repeat2 size={20} />}
            accent={t.card2}
          />
        </div>

        {/* ── LINHA 3: Meta area chart + Meta carousel ── */}
        <div className="grid gap-3" style={{ gridColumn: '1 / -1', gridRow: '3', gridTemplateColumns: '1fr 2fr' }}>
          <TVMetaAreaChart
            data={stats.mrrPorDiaMes}
            metaMensal={metaAtual?.meta_mensal ?? 0}
            mrrTotal={stats.mrrTotal}
            accentHex={t.primary}
          />
          <TVMetaCarousel
            metaMensal={metaAtual?.meta_mensal ?? 0}
            metaSemanal={metaAtual?.meta_semanal ?? 0}
            faturamentoMes={stats.mrrTotal}
            faturamentoSemana={stats.faturamentoSemana}
            mes={metaAtual?.mes ?? now.getMonth() + 1}
            ano={metaAtual?.ano ?? now.getFullYear()}
            accentColors={t.metaColors}
          />
        </div>
      </div>
    </div>
  )
}
