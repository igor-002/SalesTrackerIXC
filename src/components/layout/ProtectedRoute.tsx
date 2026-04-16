import { type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'
import type { Permissoes } from '@/types/permissoes'

interface ProtectedRouteProps {
  children: ReactNode
  permissao?: keyof Permissoes
}

function SemAcesso() {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-bg-base">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <Lock size={28} className="text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-white mb-1">Sem permissão</p>
        <p className="text-sm text-white/40">Você não tem acesso a esta página.</p>
      </div>
      <button
        onClick={() => navigate(-1)}
        className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
      >
        ← Voltar
      </button>
    </div>
  )
}

export function ProtectedRoute({ children, permissao }: ProtectedRouteProps) {
  const { session, permissoes, loading } = useAuthStore()

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

  if (permissao && permissoes && !permissoes[permissao]) {
    return <SemAcesso />
  }

  return <>{children}</>
}
