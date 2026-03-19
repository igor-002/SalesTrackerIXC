import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import { formatBRL } from '@/lib/formatters'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { MESES } from '@/constants'

interface TVMetaCarouselProps {
  metaMensal: number
  metaSemanal: number
  faturamentoMes: number
  faturamentoSemana: number
  mes?: number
  ano?: number
  interval?: number
  accentColors?: [string, string]
}

export function TVMetaCarousel({
  metaMensal,
  metaSemanal,
  faturamentoMes,
  faturamentoSemana,
  mes,
  ano,
  interval = 6000,
  accentColors = ['#3b82f6', '#60a5fa'],
}: TVMetaCarouselProps) {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % 2), interval)
    return () => clearInterval(id)
  }, [interval])

  const now = new Date()
  const mesLabel = MESES[(mes ?? now.getMonth() + 1) - 1]
  const anoLabel = ano ?? now.getFullYear()

  const slides = [
    { label: 'Meta MRR', periodo: `${mesLabel}/${anoLabel}`, atual: faturamentoMes, meta: metaMensal, color: 'secondary' as const },
    { label: 'Meta da Semana', periodo: 'Semana atual', atual: faturamentoSemana, meta: metaSemanal, color: 'secondary' as const },
  ]

  const current = slides[slide]
  const pct = current.meta > 0 ? Math.min(100, (current.atual / current.meta) * 100) : 0
  const faltam = Math.max(0, current.meta - current.atual)
  const atingida = pct >= 100

  const accentHex = accentColors[slide]

  return (
    <div className="glass rounded-2xl p-5 flex flex-col h-full relative overflow-hidden" style={{ borderTop: `2px solid ${accentHex}` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentHex}18` }}>
            <Target size={16} style={{ color: accentHex }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{current.label}</p>
            <p className="text-xs text-white/40">{current.periodo}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="rounded-full transition-all duration-300 cursor-pointer"
              style={i === slide
                ? { width: 20, height: 6, background: accentColors[i] }
                : { width: 6, height: 6, background: 'rgba(255,255,255,0.2)' }
              }
            />
          ))}
        </div>
      </div>

      <p className="text-3xl font-bold leading-none mb-1" style={{ color: accentHex }}>
        {formatBRL(current.atual)}
      </p>
      <p className="text-xs text-white/40 mb-4">
        Total da Meta: <span className="text-white/65 font-medium">{formatBRL(current.meta)}</span>
      </p>

      <ProgressBar value={pct} color={atingida ? 'success' : current.color} size="lg" animated={!atingida} className="mb-2" />

      <div className="flex items-center justify-between mt-auto pt-2">
        <p className="text-xs text-white/40">
          {atingida ? (
            <span className="font-semibold" style={{ color: accentHex }}>Meta atingida!</span>
          ) : (
            <>Faltam <span className="text-white/65 font-medium">{formatBRL(faltam)}</span></>
          )}
        </p>
        <p className="text-lg font-bold" style={{ color: atingida ? accentColors[0] : accentHex }}>
          {pct.toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
