interface ProgressBarProps {
  value: number      // 0-100
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
  showLabel?: boolean
  emptyLabel?: string
}

const colorMap = {
  primary: 'gradient-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  secondary: 'bg-cyan-500',
}

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
}

export function ProgressBar({
  value,
  color = 'primary',
  size = 'md',
  animated = false,
  className = '',
  showLabel = false,
  emptyLabel,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  if (clamped < 5 && emptyLabel) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div
          className={`flex-1 rounded-full border border-dashed ${sizeMap[size]}`}
          style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'transparent' }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <span className="text-xs text-white/40 whitespace-nowrap">{emptyLabel}</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex-1 rounded-full overflow-hidden ${sizeMap[size]}`} style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className={`${sizeMap[size]} ${colorMap[color]} rounded-full transition-all duration-700 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-white/45 w-10 text-right">{clamped.toFixed(0)}%</span>
      )}
    </div>
  )
}
