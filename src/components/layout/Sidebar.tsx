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
    <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-[#0f0f0f] border-r border-[#262626]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#262626]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-[#0f0f0f]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">SalesTracker</p>
            <p className="text-[11px] font-medium text-[#71717a]">CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5" aria-label="Navegação principal">
        {navVisiveis.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 cursor-pointer
              ${isActive
                ? 'bg-[#1f1f1f] text-white border-l-2 border-white -ml-[2px] pl-[14px]'
                : 'text-[#a1a1aa] hover:text-white hover:bg-[#1a1a1a]'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 pb-3 pt-2 border-t border-[#262626]">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar name={userName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[11px] text-[#71717a]">
              {permissoes?.admin ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150 cursor-pointer"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  )
}
