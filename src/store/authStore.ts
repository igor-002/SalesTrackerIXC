import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { type Permissoes, PERMISSOES_ADMIN } from '@/types/permissoes'

type Role = 'admin' | 'tv' | null

interface AuthState {
  session: Session | null
  user: User | null
  role: Role
  loading: boolean
  permissoes: Permissoes | null
  idVendedorIxc: string | null
  vendedorDbId: string | null
  setSession: (session: Session | null) => void
  setRole: (role: Role) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  fetchRole: (userId: string) => Promise<void>
  fetchPermissoes: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  loading: true,
  permissoes: null,
  idVendedorIxc: null,
  vendedorDbId: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setRole: (role) => set({ role }),

  setLoading: (loading) => set({ loading }),

  fetchRole: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    set({ role: (data?.role as Role) ?? null })
  },

  fetchPermissoes: async (userId: string) => {
    // Busca permissões na tabela usuarios (sem filtrar por ativo aqui — checar em código)
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('permissoes, id_vendedor_ixc, ativo')
      .eq('user_id', userId)
      .single()

    if (usuarioData) {
      // Usuário desativado → permissões mínimas (o ProtectedRoute bloqueará o acesso)
      if (usuarioData.ativo === false) {
        set({ permissoes: {} as Permissoes, idVendedorIxc: null, vendedorDbId: null })
        return
      }
      const permissoes = (usuarioData.permissoes as Permissoes | null) ?? PERMISSOES_ADMIN
      const idVendedorIxc = usuarioData.id_vendedor_ixc ?? null

      let vendedorDbId: string | null = null
      if (idVendedorIxc) {
        const { data: vendedorData } = await supabase
          .from('vendedores')
          .select('id')
          .eq('ixc_id', idVendedorIxc)
          .single()
        vendedorDbId = vendedorData?.id ?? null
      }

      set({ permissoes, idVendedorIxc, vendedorDbId })
    } else {
      // Sem linha em usuarios → fallback para admin total (compatibilidade)
      set({ permissoes: PERMISSOES_ADMIN, idVendedorIxc: null, vendedorDbId: null })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, role: null, permissoes: null, idVendedorIxc: null, vendedorDbId: null })
  },
}))
