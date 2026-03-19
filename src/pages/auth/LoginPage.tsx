import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { fetchRole } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.session) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }
    await fetchRole(data.session.user.id)
    navigate('/', { replace: true })
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-base p-4 relative">
      <div className="bg-ambient" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary glow-primary flex items-center justify-center mb-4">
            <TrendingUp size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SalesTracker</h1>
          <p className="text-sm text-white/40 mt-1">Faça login para continuar</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 pointer-events-none" style={{ top: 38, color: 'rgba(255,255,255,0.3)' }} />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                required
                autoComplete="email"
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3.5 pointer-events-none" style={{ top: 38, color: 'rgba(255,255,255,0.3)' }} />
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="pl-10"
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
