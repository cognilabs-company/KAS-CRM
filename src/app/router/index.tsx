import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LoginPage } from '@features/auth/ui/LoginPage'
import { useAuthStore } from '@shared/lib/store'
import type { AdminPage } from '@shared/types/api'
import { Header } from '@widgets/header/Header'
import { Sidebar } from '@widgets/sidebar/Sidebar'

const loadDashboardPage = () =>
  import('@pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage }))
const loadLeadsPage = () =>
  import('@pages/leads/LeadsPage').then((module) => ({ default: module.LeadsPage }))
const loadChatsPage = () =>
  import('@pages/chats/ChatsPage').then((module) => ({ default: module.ChatsPage }))
const loadProductsPage = () =>
  import('@pages/products/ProductsPage').then((module) => ({ default: module.ProductsPage }))
const loadStoresPage = () =>
  import('@pages/stores/StoresPage').then((module) => ({ default: module.StoresPage }))
const loadUsersPage = () =>
  import('@pages/users/UsersPage').then((module) => ({ default: module.UsersPage }))
const loadAiLogsPage = () =>
  import('@pages/ai-logs/AiLogsPage').then((module) => ({ default: module.AiLogsPage }))
const loadAiSettingsPage = () =>
  import('@pages/ai-settings/AiSettingsPage').then((module) => ({ default: module.AiSettingsPage }))

const DashboardPage = lazy(loadDashboardPage)
const LeadsPage = lazy(loadLeadsPage)
const ChatsPage = lazy(loadChatsPage)
const ProductsPage = lazy(loadProductsPage)
const StoresPage = lazy(loadStoresPage)
const UsersPage = lazy(loadUsersPage)
const AiLogsPage = lazy(loadAiLogsPage)
const AiSettingsPage = lazy(loadAiSettingsPage)

const PAGE_PRELOADERS: Record<AdminPage, () => Promise<unknown>> = {
  dashboard: loadDashboardPage,
  leads: loadLeadsPage,
  chats: loadChatsPage,
  products: loadProductsPage,
  stores: loadStoresPage,
  users: loadUsersPage,
  ai_logs: loadAiLogsPage,
  ai_settings: loadAiSettingsPage,
}

const ROUTE_TO_PAGE: Record<string, AdminPage> = {
  '/': 'dashboard',
  '/leads': 'leads',
  '/chats': 'chats',
  '/products': 'products',
  '/stores': 'stores',
  '/users': 'users',
  '/ai-logs': 'ai_logs',
  '/ai-settings': 'ai_settings',
}

function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-surface rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 bg-surface rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-surface rounded-lg" />
    </div>
  )
}

function ProtectedPage({
  page,
  children,
}: {
  page: AdminPage
  children: JSX.Element
}) {
  const availablePages = useAuthStore((state) =>
    state.availablePages.length > 0 ? state.availablePages : state.user?.availablePages ?? []
  )
  if (!availablePages.includes(page)) {
    return <Navigate to="/" replace />
  }
  return children
}

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const availablePages = useAuthStore((state) =>
    state.availablePages.length > 0 ? state.availablePages : state.user?.availablePages ?? []
  )
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const routePage = ROUTE_TO_PAGE[location.pathname]

  useEffect(() => {
    if (!isAuthenticated || availablePages.length === 0) return

    const preload = () => {
      availablePages.forEach((page) => {
        void PAGE_PRELOADERS[page]?.()
      })
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload)
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = globalThis.setTimeout(preload, 200)
    return () => globalThis.clearTimeout(timeoutId)
  }, [availablePages, isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (isAuthenticated && availablePages.length === 0) {
    logout()
    return <Navigate to="/login" replace />
  }

  if (routePage && !availablePages.includes(routePage)) {
    const firstPage = availablePages[0]
    const firstRoute = Object.entries(ROUTE_TO_PAGE).find(([, page]) => page === firstPage)?.[0] ?? '/'
    return <Navigate to={firstRoute} replace />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<ProtectedPage page="dashboard"><DashboardPage /></ProtectedPage>} />
              <Route path="/leads" element={<ProtectedPage page="leads"><LeadsPage /></ProtectedPage>} />
              <Route path="/chats" element={<ProtectedPage page="chats"><ChatsPage /></ProtectedPage>} />
              <Route path="/products" element={<ProtectedPage page="products"><ProductsPage /></ProtectedPage>} />
              <Route path="/stores" element={<ProtectedPage page="stores"><StoresPage /></ProtectedPage>} />
              <Route path="/users" element={<ProtectedPage page="users"><UsersPage /></ProtectedPage>} />
              <Route path="/ai-logs" element={<ProtectedPage page="ai_logs"><AiLogsPage /></ProtectedPage>} />
              <Route path="/ai-settings" element={<ProtectedPage page="ai_settings"><AiSettingsPage /></ProtectedPage>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function AppRouter() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

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
