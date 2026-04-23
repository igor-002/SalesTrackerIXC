import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  strong?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className = '', strong = false, onClick }: GlassCardProps) {
  return (
    <div
      className={`${strong ? 'glass-strong' : 'glass'} ${onClick ? 'cursor-pointer hover:bg-white/7 transition-colors duration-200' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
