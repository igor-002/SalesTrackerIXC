import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface TVVendasCarouselProps {
  hoje: { faturamento: number; vendas: number }
  semana: { faturamento: number; vendas: number }
  mes: { faturamento: number; vendas: number }
  interval?: number
  accentHex?: string
}

const SLIDES = ['Hoje', 'Esta Semana', 'Este Mês'] as const

export function TVVendasCarousel({ hoje, semana, mes, interval = 5000, accentHex = '#3b82f6' }: TVVendasCarouselProps) {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % 3), interval)
    return () => clearInterval(id)
  }, [interval])

  const data = [hoje, semana, mes]
  const current = data[slide]

  return (
    <div className="glass rounded-2xl p-6 flex flex-col h-full relative overflow-hidden" style={{ borderTop: `2px solid ${accentHex}` }}>
      <div className="flex items-center justify-between mb-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentHex}1e` }}>
            <ShoppingCart size={16} style={{ color: accentHex }} />
          </div>
          <span className="text-sm font-semibold text-white/60">Vendas</span>
        </div>
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="rounded-full transition-all duration-300 cursor-pointer"
              style={i === slide
                ? { width: 20, height: 6, background: accentHex }
                : { width: 6, height: 6, background: 'rgba(255,255,255,0.2)' }
              }
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-white/35 mt-4 mb-1 uppercase tracking-widest font-medium">{SLIDES[slide]}</p>
      <p className="text-4xl font-bold text-white leading-none mb-2">{formatBRL(current.faturamento)}</p>
      <p className="text-sm text-white/45">{formatNumber(current.vendas)} {current.vendas === 1 ? 'venda' : 'vendas'}</p>

      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
        <div className="h-full transition-all duration-700" style={{ width: `${((slide + 1) / 3) * 100}%`, background: accentHex }} />
      </div>
    </div>
  )
}
