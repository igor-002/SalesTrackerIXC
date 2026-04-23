type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]',
  success: 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]',
  danger: 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]',
  warning: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
  info: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]',
  purple: 'bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantMap[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'A':  return 'success'
    case 'CM': return 'warning'
    case 'FA': return 'danger'
    case 'AA': return 'info'
    case 'CN': return 'danger'
    case 'N':  return 'purple'
  }
  switch (status.toLowerCase()) {
    case 'ativo': return 'success'
    case 'cancelado': return 'danger'
    case 'pendente': return 'warning'
    case 'em análise': return 'info'
    case 'inativo': return 'default'
    default: return 'default'
  }
}
