import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Router } from '@/router'

export default function App() {
  const { setSession, setLoading, fetchRole, fetchPermissoes } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => null)
          setLoading(false)
          return
        }
        setSession(session)
        if (session?.user) {
          Promise.all([
            fetchRole(session.user.id),
            fetchPermissoes(session.user.id),
          ]).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        supabase.auth.signOut({ scope: 'local' }).catch(() => null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        setLoading(true)
        Promise.all([
          fetchRole(session.user.id),
          fetchPermissoes(session.user.id),
        ]).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Zustand actions são refs estáveis — rodar apenas no mount

  return <Router />
}
