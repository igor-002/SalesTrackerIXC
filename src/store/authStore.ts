import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Role = 'admin' | 'tv' | null

interface AuthState {
  session: Session | null
  user: User | null
  role: Role
  loading: boolean
  setSession: (session: Session | null) => void
  setRole: (role: Role) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  fetchRole: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  loading: true,

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

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, role: null })
  },
}))
