import type { ReactNode } from 'react'

export type TVThemeColors = {
  bg: string
  glow: string
  primary: string
  secondary: string
  card1: string
  card2: string
  card3: string
  metaColors: [string, string]
}

interface TVCardProps {
  title: string
  value: string
  subtitle?: string
  icon?: ReactNode
  accent?: string
}

const accentHexMap: Record<string, string> = {
  'blue-3': '#93c5fd',
  blue:     '#3b82f6',
  cyan:     '#06b6d4',
  emerald:  '#00d68f',
  amber:    '#f59e0b',
  red:      '#ef4444',
  violet:   '#8b5cf6',
}

function resolveHex(accent: string): string {
  for (const [key, hex] of Object.entries(accentHexMap)) {
    if (accent.includes(key)) return hex
  }
  return '#3b82f6'
}

export function TVCard({ title, value, subtitle, icon, accent = 'text-blue-400' }: TVCardProps) {
  const hex = resolveHex(accent)

  return (
    <div
      className="glass rounded-2xl p-6 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderTop: `2px solid ${hex}` }}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${hex}18`, color: hex }}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-3xl font-bold text-white leading-tight tracking-tight">{value}</p>
        <p className="text-sm text-white/50 mt-1 font-medium">{title}</p>
        {subtitle && <p className="text-xs text-white/35 mt-0.5">{subtitle}</p>}
      </div>
      <div className="absolute -right-5 -bottom-5 w-24 h-24 rounded-full opacity-[0.07]" style={{ background: hex }} />
    </div>
  )
}
