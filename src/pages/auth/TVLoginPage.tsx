import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function TVLoginPage() {
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
      setError('Credenciais inválidas.')
      setLoading(false)
      return
    }

    await fetchRole(data.session.user.id)
    navigate('/tv', { replace: true })
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-base p-4 relative">
      <div className="bg-ambient" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mb-4">
            <Monitor size={24} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">TV Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Acesso exclusivo para televisores</p>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none mt-3.5" />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tv@empresa.com"
                required
                autoComplete="email"
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none mt-3.5" />
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

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <Button
              type="submit"
              loading={loading}
              size="lg"
              variant="secondary"
              className="w-full mt-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              Entrar no TV Mode
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Login Admin?{' '}
          <a href="/login" className="text-primary hover:underline">
            Acesse aqui
          </a>
        </p>
      </div>
    </div>
  )
}
