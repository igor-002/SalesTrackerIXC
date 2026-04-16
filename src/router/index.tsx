import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui/Spinner'

const LoginPage   = lazy(() => import('@/pages/auth/LoginPage'))
const Dashboard   = lazy(() => import('@/pages/Dashboard'))
const NovaVenda   = lazy(() => import('@/pages/NovaVenda'))
const Vendedores  = lazy(() => import('@/pages/Vendedores'))
const Metas       = lazy(() => import('@/pages/Metas'))
const Clientes    = lazy(() => import('@/pages/Clientes'))
const TVDashboard = lazy(() => import('@/pages/TVDashboard'))
const Usuarios    = lazy(() => import('@/pages/Usuarios'))
const Relatorios  = lazy(() => import('@/pages/Relatorios'))

function PageLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <Spinner size="lg" className="text-primary" />
    </div>
  )
}

export function Router() {
  const { session } = useAuthStore()

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={session ? <Navigate to="/" replace /> : <LoginPage />}
          />

          {/* Rotas protegidas por permissão granular */}
          <Route path="/" element={
            <ProtectedRoute permissao="dashboard">
              <AppShell><Dashboard /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/nova-venda" element={
            <ProtectedRoute permissao="nova_venda">
              <AppShell><NovaVenda /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/clientes" element={
            <ProtectedRoute permissao="clientes">
              <AppShell><Clientes /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/vendedores" element={
            <ProtectedRoute permissao="vendedores">
              <AppShell><Vendedores /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/metas" element={
            <ProtectedRoute permissao="metas">
              <AppShell><Metas /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/usuarios" element={
            <ProtectedRoute permissao="admin">
              <AppShell><Usuarios /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/relatorios" element={
            <ProtectedRoute permissao="relatorios">
              <AppShell><Relatorios /></AppShell>
            </ProtectedRoute>
          } />

          {/* TV Dashboard — sem AppShell */}
          <Route path="/tv" element={
            <ProtectedRoute permissao="tv_dashboard">
              <TVDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
