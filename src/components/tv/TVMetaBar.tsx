import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatBRL } from '@/lib/formatters'

interface TVMetaBarProps {
  label: string
  atual: number
  meta: number
  color?: 'primary' | 'success' | 'warning' | 'secondary'
}

export function TVMetaBar({ label, atual, meta, color = 'primary' }: TVMetaBarProps) {
  const pct = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0
  const isAtingida = pct >= 100

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-white/50">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{formatBRL(atual)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/30">Meta</p>
          <p className="text-lg font-semibold text-white/70">{formatBRL(meta)}</p>
        </div>
      </div>
      <ProgressBar value={pct} color={isAtingida ? 'success' : color} size="lg" animated={!isAtingida} />
      <p className={`text-sm font-semibold mt-3 ${isAtingida ? 'text-emerald-400' : 'text-white/60'}`}>
        {pct.toFixed(1)}% {isAtingida ? '✓ Atingida!' : 'realizado'}
      </p>
    </div>
  )
}
