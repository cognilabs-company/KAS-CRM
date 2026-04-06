import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  ScrollText,
  Settings2,
  UserCircle,
  Users,
  X,
  Zap,
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
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, pageKey: 'dashboard' },
  { label: 'Leadlar', path: '/leads', icon: Users, pageKey: 'leads' },
  { label: 'Chatlar', path: '/chats', icon: MessageSquare, pageKey: 'chats' },
  { label: 'Mahsulotlar', path: '/products', icon: Package, pageKey: 'products' },
  { label: 'Magazinlar', path: '/stores', icon: MapPin, pageKey: 'stores' },
  { label: 'Foydalanuvchilar', path: '/users', icon: UserCircle, pageKey: 'users' },
  { label: 'AI Loglar', path: '/ai-logs', icon: ScrollText, pageKey: 'ai_logs' },
  { label: 'AI Sozlamalar', path: '/ai-settings', icon: Settings2, pageKey: 'ai_settings' },
]

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
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          {(!collapsed || mobile) && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-text-primary leading-tight whitespace-nowrap">
                KAS CRM
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

      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary'
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
          ))}
        </ul>
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

        {!mobile && (
          <button
            onClick={onToggleDesktop}
            className={cn(
              'hidden md:flex w-full items-center justify-center gap-2 py-2.5 px-3',
              'text-xs text-text-muted hover:text-text-primary hover:bg-surface-2',
              'border-t border-border transition-colors'
            )}
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} />
                <span>Yig&apos;ish</span>
              </>
            )}
          </button>
        )}
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
            'sticky top-0 z-30 hidden h-screen flex-col bg-surface border-r border-border flex-shrink-0 md:flex',
            isSidebarCollapsed ? 'w-16' : 'w-60'
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
