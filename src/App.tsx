import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Router } from '@/router'

export default function App() {
  const { setSession, setLoading, fetchRole } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        if (session?.user) {
          fetchRole(session.user.id).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchRole(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading, fetchRole])

  return <Router />
}
