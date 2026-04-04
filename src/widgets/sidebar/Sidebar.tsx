import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Package,
  MapPin,
  UserCircle,
  ScrollText,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
} from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { useUIStore, useAuthStore } from '@shared/lib/store'
import { getInitials } from '@shared/lib/utils'
import toast from 'react-hot-toast'

interface NavItem {
  label: string
  path: string
  icon: typeof LayoutDashboard
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      path: '/',           icon: LayoutDashboard },
  { label: 'Leadlar',        path: '/leads',      icon: Users },
  { label: 'Chatlar',        path: '/chats',      icon: MessageSquare },
  { label: 'Mahsulotlar',    path: '/products',   icon: Package },
  { label: 'Magazinlar',     path: '/stores',     icon: MapPin },
  { label: 'Foydalanuvchilar', path: '/users',    icon: UserCircle },
  { label: 'AI Loglar',      path: '/ai-logs',    icon: ScrollText },
  { label: 'AI Sozlamalar',  path: '/ai-settings', icon: Settings2, roles: ['super_admin'] },
]

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Chiqildi')
    navigate('/login')
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside
      className={cn(
        'sidebar-transition flex-shrink-0 flex flex-col',
        'bg-surface border-r border-border h-screen sticky top-0 z-30',
        isSidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0',
          isSidebarCollapsed && 'justify-center px-0'
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        {!isSidebarCollapsed && (
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

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
                    isSidebarCollapsed && 'justify-center px-0 w-10 mx-auto'
                  )
                }
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      className={cn(
                        'flex-shrink-0',
                        isActive ? 'text-primary' : 'text-text-muted'
                      )}
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-border flex-shrink-0">
        {/* User info */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-3',
            isSidebarCollapsed && 'justify-center px-0'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {user ? getInitials(user.name) : 'U'}
            </span>
          </div>
          {!isSidebarCollapsed && user && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">
                {user.role === 'super_admin' ? 'Super Admin' : 'KAS Admin'}
              </p>
            </div>
          )}
          {!isSidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1 text-text-muted hover:text-danger transition-colors"
              title="Chiqish"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 px-3',
            'text-xs text-text-muted hover:text-text-primary hover:bg-surface-2',
            'border-t border-border transition-colors'
          )}
        >
          {isSidebarCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <>
              <ChevronLeft size={14} />
              <span>Yig'ish</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
