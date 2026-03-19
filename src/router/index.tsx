import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui/Spinner'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const NovaVenda = lazy(() => import('@/pages/NovaVenda'))
const Vendedores = lazy(() => import('@/pages/Vendedores'))
const Metas = lazy(() => import('@/pages/Metas'))
const Produtos = lazy(() => import('@/pages/Produtos'))
const Clientes = lazy(() => import('@/pages/Clientes'))
const TVDashboard = lazy(() => import('@/pages/TVDashboard'))

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

          {/* Admin routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <Dashboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/nova-venda"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <NovaVenda />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendedores"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <Vendedores />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/metas"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <Metas />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <Produtos />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute role="admin">
                <AppShell>
                  <Clientes />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* TV Dashboard — admin acessa diretamente, sem AppShell */}
          <Route
            path="/tv"
            element={
              <ProtectedRoute role="admin">
                <TVDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
