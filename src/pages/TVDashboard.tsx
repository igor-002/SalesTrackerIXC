import { useCallback, useState, useEffect, useRef } from 'react'
import { Pause, Play } from 'lucide-react'
import { TVClock } from '@/components/tv/TVClock'
import { TVLogo } from '@/components/tv/TVLogo'
import { Spinner } from '@/components/ui/Spinner'
import { TVTelaVisaoGeral } from '@/components/tv/TVTelaVisaoGeral'
import { TVTelaEvolucao } from '@/components/tv/TVTelaEvolucao'
import { TVTelaPipeline } from '@/components/tv/TVTelaPipeline'
import { TVTelaVendedores } from '@/components/tv/TVTelaVendedores'
import { TVTelaAlertas } from '@/components/tv/TVTelaAlertas'
import { TVSyncIndicator } from '@/components/tv/TVSyncIndicator'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useTVStats } from '@/hooks/useTVStats'
import { useMetas } from '@/hooks/useMetas'
import { useMetasVendedor } from '@/hooks/useMetasVendedor'
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
const TELA_LABELS = ['Visão Geral', 'Evolução', 'Pipeline', 'Ranking', 'Alertas']

export default function TVDashboard() {
  const { loading: dashLoading, refetch: refetchDash } = useDashboardStats()
  const tvStats = useTVStats()
  const now = new Date()
  const { getMetaAtual, refetch: refetchMetas } = useMetas()
  const { metas: metasVendedor, refetch: refetchMetasVendedor } = useMetasVendedor(
    now.getMonth() + 1,
    now.getFullYear(),
  )

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
      setTela((s) => (s + 1) % 5)
    }, SLIDE_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [pausado])

  const handleChange = useCallback(() => {
    refetchDash()
    tvStats.refetch()
    refetchMetas()
    refetchMetasVendedor()
  }, [refetchDash, tvStats, refetchMetas, refetchMetasVendedor])
  useRealtime({ onVenda: handleChange, onCancelamento: handleChange })

  const t = THEMES[theme]
  const loading = dashLoading || tvStats.loading

  // Dados derivados
  const metaMensal = getMetaAtual()?.meta_mensal ?? 0
  const mrr6Meses = tvStats.mrr12Meses.slice(-6)
  const mrrPotencial6Meses = tvStats.mrrPotencial12Meses.slice(-6)
  const metasVendedorMap: Record<string, number> = Object.fromEntries(
    metasVendedor.map((m) => [m.vendedor_id, m.meta_contratos]),
  )

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
          <span
            className="text-xs font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full transition-all duration-500"
            style={{ background: `${t.primary}15`, color: `${t.primary}99`, border: `1px solid ${t.primary}20` }}
          >
            {TELA_LABELS[tela]}
          </span>
          <TVClock />
        </div>
      </header>

      {/* ── TELAS ── */}
      <div className="relative z-10 flex-1 min-h-0">

        {/* Tela 0 — Visão Geral */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 0 ? 1 : 0, transform: tela === 0 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 0 ? 'auto' : 'none' }}
        >
          <TVTelaVisaoGeral
            faturamentoReal={tvStats.faturamentoReal}
            mrrReal={tvStats.mrrReal}
            totalAtivos={tvStats.funilCounts.A}
            totalAguardando={tvStats.funilCounts.AA}
            taxaConversao={tvStats.taxaConversao}
            metaMensal={metaMensal}
            t={t}
          />
        </div>

        {/* Tela 1 — Evolução MRR */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 1 ? 1 : 0, transform: tela === 1 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 1 ? 'auto' : 'none' }}
        >
          <TVTelaEvolucao mrr6Meses={mrr6Meses} mrrPotencial6Meses={mrrPotencial6Meses} t={t} />
        </div>

        {/* Tela 2 — Pipeline */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 2 ? 1 : 0, transform: tela === 2 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 2 ? 'auto' : 'none' }}
        >
          <TVTelaPipeline
            funilCounts={tvStats.funilCounts}
            taxaConversao={tvStats.taxaConversao}
            faturamentoReal={tvStats.faturamentoReal}
            faturamentoPrometido={tvStats.faturamentoPrometido}
            alertasAA={tvStats.alertasAA}
            t={t}
          />
        </div>

        {/* Tela 3 — Ranking */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 3 ? 1 : 0, transform: tela === 3 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 3 ? 'auto' : 'none' }}
        >
          <TVTelaVendedores
            rankingVendedores={tvStats.rankingVendedores}
            metasVendedorMap={metasVendedorMap}
            t={t}
          />
        </div>

        {/* Tela 4 — Alertas */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-in-out"
          style={{ opacity: tela === 4 ? 1 : 0, transform: tela === 4 ? 'scale(1)' : 'scale(0.97)', pointerEvents: tela === 4 ? 'auto' : 'none' }}
        >
          <TVTelaAlertas alertasAA={tvStats.alertasAA} t={t} />
        </div>

      </div>

      {/* ── FOOTER: dots + pause + sync indicator ── */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between pb-1">
        <TVSyncIndicator />

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
