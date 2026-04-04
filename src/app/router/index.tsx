import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@shared/lib/store'
import { Sidebar } from '@widgets/sidebar/Sidebar'
import { Header } from '@widgets/header/Header'
import { LoginPage } from '@features/auth/ui/LoginPage'

// Lazy page imports
const DashboardPage   = lazy(() => import('@pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const LeadsPage       = lazy(() => import('@pages/leads/LeadsPage').then((m) => ({ default: m.LeadsPage })))
const ChatsPage       = lazy(() => import('@pages/chats/ChatsPage').then((m) => ({ default: m.ChatsPage })))
const ProductsPage    = lazy(() => import('@pages/products/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const StoresPage      = lazy(() => import('@pages/stores/StoresPage').then((m) => ({ default: m.StoresPage })))
const UsersPage       = lazy(() => import('@pages/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const AiLogsPage      = lazy(() => import('@pages/ai-logs/AiLogsPage').then((m) => ({ default: m.AiLogsPage })))
const AiSettingsPage  = lazy(() => import('@pages/ai-settings/AiSettingsPage').then((m) => ({ default: m.AiSettingsPage })))

function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-surface rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-surface rounded-lg" />
    </div>
  )
}

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"             element={<DashboardPage />} />
              <Route path="/leads"        element={<LeadsPage />} />
              <Route path="/chats"        element={<ChatsPage />} />
              <Route path="/products"     element={<ProductsPage />} />
              <Route path="/stores"       element={<StoresPage />} />
              <Route path="/users"        element={<UsersPage />} />
              <Route path="/ai-logs"      element={<AiLogsPage />} />
              <Route path="/ai-settings"  element={<AiSettingsPage />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function AppRouter() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  )
}
