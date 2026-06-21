import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  ScrollText,
  Settings2,
  UserCircle,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, getInitials } from '@shared/lib/utils'
import { useAuthStore, useUIStore } from '@shared/lib/store'
import { useIsMobile } from '@shared/lib/useIsMobile'
import type { AdminPage } from '@shared/types/api'

interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
  pageKey: AdminPage
  group: 'main' | 'management' | 'system'
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, pageKey: 'dashboard', group: 'main' },
  { label: 'Leadlar', path: '/leads', icon: Users, pageKey: 'leads', group: 'main' },
  { label: 'Chatlar', path: '/chats', icon: MessageSquare, pageKey: 'chats', group: 'main' },
  { label: 'Mahsulotlar', path: '/products', icon: Package, pageKey: 'products', group: 'management' },
  { label: 'Magazinlar', path: '/stores', icon: MapPin, pageKey: 'stores', group: 'management' },
  { label: 'Foydalanuvchilar', path: '/users', icon: UserCircle, pageKey: 'users', group: 'management' },
  { label: 'AI Loglar', path: '/ai-logs', icon: ScrollText, pageKey: 'ai_logs', group: 'system' },
  { label: 'AI Sozlamalar', path: '/ai-settings', icon: Settings2, pageKey: 'ai_settings', group: 'system' },
  { label: 'Ko‘rinish', path: '/appearance', icon: Palette, pageKey: 'appearance', group: 'system' },
]

const GROUPS = [
  { key: 'main', label: 'Asosiy' },
  { key: 'management', label: 'Boshqaruv' },
  { key: 'system', label: 'Tizim' },
] as const

interface SidebarContentProps {
  collapsed: boolean
  availablePages: AdminPage[]
  userName?: string
  userRole?: string
  onNavigate?: () => void
  onLogout: () => void
  onToggleDesktop?: () => void
  mobile?: boolean
}

function SidebarContent({
  collapsed,
  availablePages,
  userName,
  userRole,
  onNavigate,
  onLogout,
  onToggleDesktop,
  mobile = false,
}: SidebarContentProps) {
  const visibleItems = NAV_ITEMS.filter((item) => availablePages.includes(item.pageKey))

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2.5 border-b border-border flex-shrink-0',
          mobile ? 'h-14 px-4 justify-between' : 'h-14 px-4',
          collapsed && !mobile && 'justify-center px-0'
        )}
      >
        <div className={cn('flex items-center gap-2.5', collapsed && !mobile && 'justify-center')}>
          {mobile ? <div className="flex h-8 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
            <img
              src="/Logo-sidebar.jpg"
              alt="KAS CRM"
              className="h-full w-full object-cover"
            />
          </div> : <button
            type="button"
            onClick={onToggleDesktop}
            className={cn(
              'flex h-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white transition-all hover:border-primary/50',
              collapsed ? 'w-12' : 'w-16'
            )}
            aria-label={collapsed ? 'Sidebarni ochish' : "Sidebarni yig'ish"}
            title={collapsed ? 'Sidebarni ochish' : "Sidebarni yig'ish"}
          >
            <img src="/Logo-sidebar.jpg" alt="KAS CRM" className="h-full w-full object-cover" />
          </button>}
          {(!collapsed || mobile) && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-text-primary leading-tight whitespace-nowrap">
                CRM
              </p>
              <p className="text-xs text-text-muted leading-tight whitespace-nowrap">
                by Cognilabs
              </p>
            </div>
          )}
        </div>

        {mobile ? (
          <button
            onClick={onNavigate}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
            aria-label="Menyuni yopish"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {GROUPS.map((group) => {
          const items = visibleItems.filter((item) => item.group === group.key)
          if (!items.length) return null
          return <div key={group.key} className="mb-5 last:mb-0">
            {(!collapsed || mobile) && <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[.16em] text-text-muted">{group.label}</p>}
            <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/.08)] before:absolute before:-left-2 before:h-5 before:w-0.5 before:rounded-r before:bg-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
                    collapsed && !mobile && 'justify-center px-0 w-10 mx-auto'
                  )
                }
                title={collapsed && !mobile ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      className={cn('flex-shrink-0', isActive ? 'text-primary' : 'text-text-muted')}
                    />
                    {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}</ul></div>
        })}
      </nav>

      <div className="border-t border-border flex-shrink-0">
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-3',
            collapsed && !mobile && 'justify-center px-0'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {userName ? getInitials(userName) : 'U'}
            </span>
          </div>
          {(!collapsed || mobile) && userName ? (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-text-primary truncate">{userName}</p>
              <p className="text-xs text-text-muted truncate">
                {userRole === 'superadmin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          ) : null}
          {(!collapsed || mobile) && (
            <button
              onClick={onLogout}
              className="p-1 text-text-muted hover:text-danger transition-colors"
              title="Chiqish"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>

      </div>
    </>
  )
}

export function Sidebar() {
  const isMobile = useIsMobile()
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed)
  const isMobileSidebarOpen = useUIStore((state) => state.isMobileSidebarOpen)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const availablePages = useAuthStore((state) =>
    state.availablePages.length > 0 ? state.availablePages : state.user?.availablePages ?? []
  )
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    closeMobileSidebar()
    toast.success('Chiqildi')
    navigate('/login', { replace: true })
  }

  return (
    <>
      {!isMobile ? (
        <aside
          className={cn(
            'sidebar-transition sticky top-0 z-30 hidden h-screen flex-col bg-surface/90 backdrop-blur-xl border-r border-border flex-shrink-0 md:flex',
            isSidebarCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <SidebarContent
            collapsed={isSidebarCollapsed}
            availablePages={availablePages}
            userName={user?.name}
            userRole={user?.role}
            onLogout={handleLogout}
            onToggleDesktop={toggleSidebar}
          />
        </aside>
      ) : null}

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity',
          isMobileSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeMobileSidebar}
      />

      {isMobile && isMobileSidebarOpen ? (
        <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[82vw] flex-col bg-surface border-r border-border">
          <SidebarContent
            collapsed={false}
            availablePages={availablePages}
            userName={user?.name}
            userRole={user?.role}
            onNavigate={closeMobileSidebar}
            onLogout={handleLogout}
            mobile
          />
        </aside>
      ) : null}
    </>
  )
}
