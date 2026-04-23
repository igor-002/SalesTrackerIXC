type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-white/8 text-white/70 border border-white/10',
  success: 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20',
  danger: 'bg-red-500/12 text-red-400 border border-red-500/20',
  warning: 'bg-amber-500/12 text-amber-400 border border-amber-500/20',
  info: 'bg-cyan-500/12 text-cyan-400 border border-cyan-500/20',
  purple: 'bg-violet-500/12 text-violet-400 border border-violet-500/20',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${variantMap[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  // Códigos IXC
  switch (status) {
    case 'A':  return 'success'
    case 'CM': return 'warning'
    case 'FA': return 'danger'
    case 'AA': return 'info'
    case 'CN': return 'danger'
    case 'N':  return 'purple'
  }
  // Fallback para nomes legíveis (dados antigos)
  switch (status.toLowerCase()) {
    case 'ativo': return 'success'
    case 'cancelado': return 'danger'
    case 'pendente': return 'warning'
    case 'em análise': return 'info'
    case 'inativo': return 'default'
    default: return 'default'
  }
}
