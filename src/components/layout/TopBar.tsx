import { useLocation } from 'react-router-dom'

const titleMap: Record<string, string> = {
  '/': 'Dashboard',
  '/nova-venda': 'Nova Venda',
  '/vendedores': 'Vendedores',
  '/metas': 'Metas',
  '/tv': 'TV Dashboard',
}

export function TopBar() {
  const { pathname } = useLocation()
  const title = titleMap[pathname] ?? 'SalesTracker'

  return (
    <header
      className="h-14 px-6 flex items-center flex-shrink-0"
      style={{
        background: 'rgba(12,30,20,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <h1 className="text-base font-semibold text-white">{title}</h1>
    </header>
  )
}
