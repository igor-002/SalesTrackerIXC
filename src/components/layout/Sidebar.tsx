import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  UserCog,
  Target,
  Monitor,
  TrendingUp,
  LogOut,
  UserCheck,
  Users,
  BarChart2,
  Wrench,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Avatar } from '@/components/ui/Avatar'
import type { Permissoes } from '@/types/permissoes'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',    permissao: 'dashboard'    as keyof Permissoes, exact: true },
  { to: '/nova-venda', icon: PlusCircle,       label: 'Nova Venda',   permissao: 'nova_venda'   as keyof Permissoes },
  { to: '/clientes',   icon: UserCheck,        label: 'Clientes',     permissao: 'clientes'     as keyof Permissoes },
  { to: '/vendedores', icon: UserCog,          label: 'Vendedores',   permissao: 'vendedores'   as keyof Permissoes },
  { to: '/metas',      icon: Target,           label: 'Metas',        permissao: 'metas'        as keyof Permissoes },
  { to: '/relatorios',  icon: BarChart2,        label: 'Relatórios',   permissao: 'relatorios'   as keyof Permissoes },
  { to: '/tv',         icon: Monitor,          label: 'TV Dashboard', permissao: 'tv_dashboard' as keyof Permissoes },
  { to: '/usuarios',        icon: Users,  label: 'Usuários',        permissao: 'admin' as keyof Permissoes },
  { to: '/diagnostico-ixc', icon: Wrench, label: 'Diagnóstico IXC', permissao: 'admin' as keyof Permissoes },
]

export function Sidebar() {
  const { user, signOut, permissoes } = useAuthStore()
  const userName = user?.email?.split('@')[0] ?? 'Usuário'

  const navVisiveis = navItems.filter(({ permissao }) =>
    !permissoes || permissoes[permissao]
  )

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, #0f2419 0%, #0c1e14 100%)',
        borderRight: '1px solid rgba(0,214,143,0.1)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary glow-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">SalesTracker</p>
            <p className="text-xs font-medium" style={{ color: 'rgba(0,214,143,0.7)' }}>CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5" aria-label="Navegação principal">
        {navVisiveis.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
              ${isActive
                ? 'text-white'
                : 'text-white/45 hover:text-white/80 hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'rgba(0,214,143,0.15)',
              border: '1px solid rgba(0,214,143,0.25)',
            } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} style={isActive ? { color: '#00d68f' } : {}} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 flex flex-col gap-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <Avatar name={userName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-xs text-white/40">
              {permissoes?.admin ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150 cursor-pointer"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  )
}
