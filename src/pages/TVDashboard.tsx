import { useCallback, useState, useEffect, useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import { TVClock } from '@/components/tv/TVClock'
import { TVLogo } from '@/components/tv/TVLogo'
import { Spinner } from '@/components/ui/Spinner'
import { TVTelaVisaoGeral } from '@/components/tv/TVTelaVisaoGeral'
import { TVTelaFunil } from '@/components/tv/TVTelaFunil'
import { TVTelaAlertas } from '@/components/tv/TVTelaAlertas'
import { TVTelaRanking } from '@/components/tv/TVTelaRanking'
import { TVTelaPlanos } from '@/components/tv/TVTelaPlanos'
import { TVTelaChurn } from '@/components/tv/TVTelaChurn'
import { TVTelaVelocidade } from '@/components/tv/TVTelaVelocidade'
import { TVSyncIndicator } from '@/components/tv/TVSyncIndicator'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useTVStats } from '@/hooks/useTVStats'
import { useRealtime } from '@/hooks/useRealtime'
import type { TVThemeColors } from '@/components/tv/TVCard'

type TVTheme = 'blue' | 'green'

const THEMES: Record<TVTheme, TVThemeColors> = {
  blue: {
    bg: '#080f1e',
    glow: 'rgba(59,130,246,0.08)',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    card1: 'text-blue-400',
    card2: 'text-blue-300',
    card3: 'text-cyan-400',
    metaColors: ['#3b82f6', '#60a5fa'],
  },
  green: {
    bg: '#0c1e14',
    glow: 'rgba(0,214,143,0.07)',
    primary: '#00d68f',
    secondary: '#06b6d4',
    card1: 'text-emerald-400',
    card2: 'text-cyan-400',
    card3: 'text-amber-400',
    metaColors: ['#00d68f', '#06b6d4'],
  },
}

const THEME_KEY = 'tv_theme'
const SLIDE_INTERVAL = 15000
const TELA_LABELS = ['Visão Geral', 'Funil', 'Alertas', 'Ranking', 'Planos', 'Cancelamentos', 'Velocidade']

export default function TVDashboard() {
  const { stats: dashStats, loading: dashLoading, refetch: refetchDash } = useDashboardStats()
  const tvStats = useTVStats()

  const [theme, setTheme] = useState<TVTheme>(() => {
    return (localStorage.getItem(THEME_KEY) as TVTheme) ?? 'blue'
  })
  const [tela, setTela] = useState(0)
  const [pausado, setPausado] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Carrossel automático
  useEffect(() => {
    if (pausado) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTela((s) => (s + 1) % 7)
    }, SLIDE_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pausado])

  const handleChange = useCallback(() => {
    refetchDash()
    tvStats.refetch()
  }, [refetchDash, tvStats])
  useRealtime({ onVenda: handleChange, onCancelamento: handleChange })

  const t = THEMES[theme]
  const loading = dashLoading || tvStats.loading

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: t.bg }}>
        <Spinner size="lg" style={{ color: t.primary }} />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col p-4 gap-3 relative overflow-hidden" style={{ background: t.bg }}>
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${t.glow} 0%, transparent 70%)` }}
      />

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

        <div className="flex items-center gap-4">
          {/* Label tela atual */}
          <span
            className="text-xs font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full transition-all duration-500"
            style={{ background: `${t.primary}15`, color: `${t.primary}99`, border: `1px solid ${t.primary}20` }}
          >
            {TELA_LABELS[tela]}
          </span>
          <TVClock />
        </div>
      </header>

      {/* ── TELAS (fade + scale) ── */}
      <div className="relative z-10 flex-1 min-h-0">

        {/* Tela 0 — Visão Geral */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 0 ? 1 : 0, transform: tela === 0 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 0 ? 'auto' : 'none' }}
        >
          <TVTelaVisaoGeral
            faturamentoReal={tvStats.faturamentoReal}
            faturamentoPrometido={tvStats.faturamentoPrometido}
            mrrReal={tvStats.mrrReal}
            mrrProjetado={tvStats.mrrProjetado}
            faturamento12Meses={dashStats.faturamento12Meses}
            mrr12Meses={tvStats.mrr12Meses}
            t={t}
          />
        </div>

        {/* Tela 1 — Funil */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 1 ? 1 : 0, transform: tela === 1 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 1 ? 'auto' : 'none' }}
        >
          <TVTelaFunil
            funilCounts={tvStats.funilCounts}
            taxaConversao={tvStats.taxaConversao}
            faturamentoReal={tvStats.faturamentoReal}
            faturamentoPrometido={tvStats.faturamentoPrometido}
            vendasPorDiaSemana={tvStats.vendasPorDiaSemana}
            t={t}
          />
        </div>

        {/* Tela 2 — Alertas */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 2 ? 1 : 0, transform: tela === 2 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 2 ? 'auto' : 'none' }}
        >
          <TVTelaAlertas alertasAA={tvStats.alertasAA} t={t} />
        </div>

        {/* Tela 3 — Ranking */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 3 ? 1 : 0, transform: tela === 3 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 3 ? 'auto' : 'none' }}
        >
          <TVTelaRanking rankingVendedores={tvStats.rankingVendedores} t={t} />
        </div>

        {/* Tela 4 — Planos */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 4 ? 1 : 0, transform: tela === 4 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 4 ? 'auto' : 'none' }}
        >
          <TVTelaPlanos planosMes={tvStats.planosMes} t={t} />
        </div>

        {/* Tela 5 — Cancelamentos */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 5 ? 1 : 0, transform: tela === 5 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 5 ? 'auto' : 'none' }}
        >
          <TVTelaChurn churn={tvStats.churn} t={t} />
        </div>

        {/* Tela 6 — Velocidade */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 6 ? 1 : 0, transform: tela === 6 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 6 ? 'auto' : 'none' }}
        >
          <TVTelaVelocidade velocidadeVendedores={tvStats.velocidadeVendedores} mediaVelocidadeTime={tvStats.mediaVelocidadeTime} t={t} />
        </div>

      </div>

      {/* ── FOOTER: dots + pause + sync indicator ── */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between pb-1">
        {/* Esquerda — indicador de sync */}
        <TVSyncIndicator />

        {/* Centro — dots de navegação */}
        <div className="flex items-center gap-2">
          {TELA_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setTela(i)}
              className="flex items-center gap-1.5 cursor-pointer transition-all duration-300"
              title={label}
            >
              <span
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === tela ? '1.5rem' : '0.5rem',
                  height: '0.5rem',
                  background: i === tela ? t.primary : 'rgba(255,255,255,0.2)',
                }}
              />
            </button>
          ))}
        </div>

        {/* Direita — botão pause */}
        <button
          onClick={() => setPausado((p) => !p)}
          className="flex items-center justify-center w-7 h-7 rounded-full transition-colors cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
          title={pausado ? 'Retomar carrossel' : 'Pausar carrossel'}
        >
          {pausado ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </div>
    </div>
  )
}
