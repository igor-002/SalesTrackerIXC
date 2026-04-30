export interface Permissoes {
  dashboard: boolean
  nova_venda: boolean
  clientes: boolean
  vendedores: boolean
  metas: boolean
  produtos: boolean
  tv_dashboard: boolean
  relatorios: boolean
  admin: boolean
}

export const PERMISSOES_DEFAULT: Permissoes = {
  dashboard: false,
  nova_venda: true,
  clientes: true,
  vendedores: false,
  metas: false,
  produtos: false,
  tv_dashboard: true,
  relatorios: false,
  admin: false,
}

export const PERMISSOES_ADMIN: Permissoes = {
  dashboard: true,
  nova_venda: true,
  clientes: true,
  vendedores: true,
  metas: true,
  produtos: true,
  tv_dashboard: true,
  relatorios: true,
  admin: true,
}

export const PERMISSOES_VENDEDOR: Permissoes = {
  dashboard: false,
  nova_venda: false,
  clientes: false,
  vendedores: false,
  metas: false,
  produtos: false,
  tv_dashboard: false,
  relatorios: true,
  admin: false,
}

export const PERMISSAO_LABELS: Record<keyof Permissoes, string> = {
  dashboard:    'Dashboard',
  nova_venda:   'Nova Venda',
  clientes:     'Clientes',
  vendedores:   'Vendedores',
  metas:        'Metas',
  produtos:     'Produtos',
  tv_dashboard: 'TV Dashboard',
  relatorios:   'Relatórios',
  admin:        'Administrador',
}
