import { type ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  strong?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className = '', onClick }: GlassCardProps) {
  return (
    <div
      className={`bg-white border border-[#e4e4e7] rounded-lg ${onClick ? 'cursor-pointer hover:bg-[#fafafa] transition-colors duration-150' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
