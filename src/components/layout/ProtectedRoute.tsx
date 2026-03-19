import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'

interface ProtectedRouteProps {
  children: ReactNode
  role?: 'admin' | 'tv'
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { session, role: userRole, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-base">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (role && userRole !== role) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
