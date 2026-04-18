import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Search,
  Store as StoreIcon,
  Sun,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@shared/api/axios'
import { getApiErrorMessage } from '@shared/api/errors'
import {
  mapChatListItem,
  mapDashboardStats,
  mapLeadListItem,
  mapProductListItem,
  mapStoreListItem,
  normalizePaginated,
  type BackendAdminUserResponse,
  type BackendChatListItem,
  type BackendDashboardStatsResponse,
  type BackendLeadListItem,
  type BackendPaginated,
  type BackendProductListItem,
  type BackendStoreListItem,
} from '@shared/api/backend'
import { useAuthStore, useUIStore } from '@shared/lib/store'
import { useIsMobile } from '@shared/lib/useIsMobile'
import { useDebouncedValue } from '@shared/lib/useDebouncedValue'
import { formatRelative, getInitials, truncate } from '@shared/lib/utils'
import { ModalDialog } from '@shared/ui/ModalDialog'
import type { ChatUser, Lead, Product, Store } from '@shared/types/api'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/leads': 'Leadlar',
  '/chats': 'Chatlar',
  '/products': 'Mahsulotlar',
  '/stores': 'Magazinlar',
  '/users': 'Foydalanuvchilar',
  '/ai-logs': 'AI Loglar',
  '/ai-settings': 'AI Sozlamalar',
}

type SearchResult =
  | { id: string; kind: 'chat'; title: string; subtitle: string; meta: string; href: string }
  | { id: string; kind: 'lead'; title: string; subtitle: string; meta: string; href: string }
  | { id: string; kind: 'product'; title: string; subtitle: string; meta: string; href: string }
  | { id: string; kind: 'store'; title: string; subtitle: string; meta: string; href: string }

interface CreateAdminFormState {
  email: string
  password: string
  fullName: string
  role: 'admin' | 'superadmin'
}

const INITIAL_CREATE_ADMIN_FORM: CreateAdminFormState = {
  email: '',
  password: '',
  fullName: '',
  role: 'admin',
}

function useOutsideClick(
  ref: RefObject<HTMLElement>,
  handler: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [active, handler, ref])
}

export function Header() {
  const isMobile = useIsMobile()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar)
  const seenNotificationKeys = useUIStore((state) => state.seenNotificationKeys)
  const markNotificationSeen = useUIStore((state) => state.markNotificationSeen)

  const [search, setSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false)
  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminFormState>(INITIAL_CREATE_ADMIN_FORM)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  useOutsideClick(searchRef, () => setIsSearchOpen(false), isSearchOpen)
  useOutsideClick(notificationsRef, () => setIsNotificationsOpen(false), isNotificationsOpen)

  const pageLabel = ROUTE_LABELS[pathname] ?? 'KAS CRM'
  const segments = pathname.split('/').filter(Boolean)

  const searchQueries = useQueries({
    queries: [
      {
        queryKey: ['header-search-chats', debouncedSearch],
        queryFn: ({ signal }) =>
          api
            .get<BackendPaginated<BackendChatListItem>>('/admin/chats/', {
              params: { search: debouncedSearch, page: 1, size: 5 },
              signal,
            })
            .then((response) => normalizePaginated(response.data, mapChatListItem)),
        enabled: debouncedSearch.length >= 2,
      },
      {
        queryKey: ['header-search-leads', debouncedSearch],
        queryFn: ({ signal }) =>
          api
            .get<BackendPaginated<BackendLeadListItem>>('/admin/leads/', {
              params: { search: debouncedSearch, page: 1, size: 5 },
              signal,
            })
            .then((response) => normalizePaginated(response.data, mapLeadListItem)),
        enabled: debouncedSearch.length >= 2,
      },
      {
        queryKey: ['header-search-products', debouncedSearch],
        queryFn: ({ signal }) =>
          api
            .get<BackendPaginated<BackendProductListItem>>('/admin/products/', {
              params: { search: debouncedSearch, page: 1, size: 4 },
              signal,
            })
            .then((response) => normalizePaginated(response.data, mapProductListItem)),
        enabled: debouncedSearch.length >= 2,
      },
      {
        queryKey: ['header-search-stores', debouncedSearch],
        queryFn: ({ signal }) =>
          api
            .get<BackendPaginated<BackendStoreListItem>>('/admin/stores/', {
              params: { search: debouncedSearch, page: 1, size: 4 },
              signal,
            })
            .then((response) => normalizePaginated(response.data, mapStoreListItem)),
        enabled: debouncedSearch.length >= 2,
      },
    ],
  })

  const [chatsResult, leadsResult, productsResult, storesResult] = searchQueries

  const searchResults = useMemo<SearchResult[]>(() => {
    if (debouncedSearch.length < 2) return []

    const chats = (chatsResult.data?.data ?? []).map<SearchResult>((chat: ChatUser) => ({
      id: chat.id,
      kind: 'chat',
      title: chat.fullName,
      subtitle: chat.username ? `@${chat.username}` : 'Chat',
      meta: truncate(chat.lastMessage, 42),
      href: `/chats?chatId=${chat.id}`,
    }))

    const leads = (leadsResult.data?.data ?? []).map<SearchResult>((lead: Lead) => ({
      id: lead.id,
      kind: 'lead',
      title: lead.fullName,
      subtitle: lead.username ? `@${lead.username}` : 'Lead',
      meta: truncate(lead.aiSummary, 42),
      href: `/leads?leadId=${lead.id}`,
    }))

    const products = (productsResult.data?.data ?? []).map<SearchResult>((product: Product) => ({
      id: product.id,
      kind: 'product',
      title: product.name,
      subtitle: product.sku,
      meta: product.category,
      href: `/products?search=${encodeURIComponent(product.name)}`,
    }))

    const stores = (storesResult.data?.data ?? []).map<SearchResult>((store: Store) => ({
      id: store.id,
      kind: 'store',
      title: store.name,
      subtitle: store.district,
      meta: truncate(store.address, 42),
      href: `/stores?search=${encodeURIComponent(store.name)}`,
    }))

    return [...chats, ...leads, ...products, ...stores].slice(0, 10)
  }, [
    chatsResult.data?.data,
    debouncedSearch,
    leadsResult.data?.data,
    productsResult.data?.data,
    storesResult.data?.data,
  ])
  const isSearchLoading = searchQueries.some((query) => query.isFetching)

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      api
        .get<BackendDashboardStatsResponse>('/admin/dashboard/stats')
        .then((response) => response.data),
  })

  const chatsNotificationsQuery = useQuery({
    queryKey: ['chats', '', 'all', null],
    queryFn: () =>
      api
        .get<BackendPaginated<BackendChatListItem>>('/admin/chats/', {
          params: { page: 1, size: 100 },
        })
        .then((response) => normalizePaginated(response.data, mapChatListItem)),
  })

  const leadNotifications = useMemo(() => {
    return (dashboardQuery.data?.recent_leads ?? [])
      .map(mapLeadListItem)
      .filter((lead) => !seenNotificationKeys.includes(`lead:${lead.id}`))
      .slice(0, 4)
  }, [dashboardQuery.data?.recent_leads, seenNotificationKeys])

  const chatNotifications = useMemo(() => {
    return (chatsNotificationsQuery.data?.data ?? [])
      .filter((chat) => !seenNotificationKeys.includes(`chat:${chat.id}`))
      .slice(0, 4)
  }, [chatsNotificationsQuery.data?.data, seenNotificationKeys])

  const notificationCount = leadNotifications.length + chatNotifications.length
  const dashboardStats = dashboardQuery.data ? mapDashboardStats(dashboardQuery.data) : null

  const createAdminMutation = useMutation({
    mutationFn: (payload: CreateAdminFormState) =>
      api.post<BackendAdminUserResponse>('/admin/auth/create-admin', {
        email: payload.email.trim(),
        password: payload.password,
        full_name: payload.fullName.trim(),
        role: payload.role,
      }),
    onSuccess: () => {
      toast.success("Yangi admin yaratildi")
      setIsCreateAdminOpen(false)
      setCreateAdminForm(INITIAL_CREATE_ADMIN_FORM)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Admin yaratib bo'lmadi")),
  })

  function handleSearchResultClick(result: SearchResult) {
    setSearch('')
    setIsSearchOpen(false)
    navigate(result.href)
  }

  function handleChatNotificationClick(chatId: string) {
    markNotificationSeen(`chat:${chatId}`)
    setIsNotificationsOpen(false)
    navigate(`/chats?chatId=${chatId}`)
  }

  function handleLeadNotificationClick(leadId: string) {
    markNotificationSeen(`lead:${leadId}`)
    setIsNotificationsOpen(false)
    navigate(`/leads?leadId=${leadId}`)
  }

  function handleCreateAdmin() {
    createAdminMutation.mutate(createAdminForm)
  }

  return (
    <header className="h-14 bg-surface border-b border-border sticky top-0 z-20 flex-shrink-0">
      <div className="h-full flex items-center justify-between gap-3 px-4 sm:px-6 max-w-content mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {isMobile ? (
            <button
              onClick={toggleMobileSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              aria-label="Menyuni ochish"
            >
              <Menu size={18} />
            </button>
          ) : null}

          <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-text-muted">KAS CRM</span>
          <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
          <span className="font-medium text-text-primary truncate">
            {segments.length === 0 ? 'Dashboard' : pageLabel}
          </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div ref={searchRef} className="relative hidden lg:block w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Lead, chat, mahsulot, magazin..."
              className="kas-input pl-9 pr-9 py-2 text-xs"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('')
                  setIsSearchOpen(false)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}

            {isSearchOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 kas-card shadow-2xl overflow-hidden">
                {debouncedSearch.length < 2 ? (
                  <div className="px-4 py-3 text-xs text-text-muted">
                    Kamida 2 ta harf yozing
                  </div>
                ) : isSearchLoading && searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-text-muted">
                    Qidirilmoqda...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-text-muted">
                    Hech narsa topilmadi
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.kind}:${result.id}`}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0">
                          {result.kind === 'chat' && <MessageSquare size={15} className="text-primary" />}
                          {result.kind === 'lead' && <Users size={15} className="text-success" />}
                          {result.kind === 'product' && <Package size={15} className="text-warning" />}
                          {result.kind === 'store' && <StoreIcon size={15} className="text-text-secondary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {result.title}
                            </p>
                            <span className="text-[11px] uppercase tracking-wide text-text-muted">
                              {result.kind}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary truncate">{result.subtitle}</p>
                          <p className="text-xs text-text-muted truncate mt-0.5">{result.meta}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <Bell size={16} />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-semibold">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-[360px] kas-card shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">
                    {dashboardStats
                      ? `Bugun ${dashboardStats.todayLeads} ta lead va ${dashboardStats.activeChats} ta faol chat`
                      : 'Yangi chatlar va leadlar'}
                  </p>
                </div>

                {notificationCount === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-muted">
                    Hozircha yangi notification yo&apos;q
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {chatNotifications.map((chat) => (
                      <button
                        key={`chat:${chat.id}`}
                        onClick={() => handleChatNotificationClick(chat.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors border-b border-border/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MessageSquare size={15} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {chat.fullName}
                            </p>
                            <span className="text-[11px] text-primary font-semibold">
                              Chat
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary truncate">
                            {truncate(chat.lastMessage, 48)}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatRelative(chat.lastMessageTime)}
                          </p>
                        </div>
                      </button>
                    ))}

                    {leadNotifications.map((lead) => (
                      <button
                        key={`lead:${lead.id}`}
                        onClick={() => handleLeadNotificationClick(lead.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Users size={15} className="text-success" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {lead.fullName}
                            </p>
                            <span className="text-[11px] text-success font-semibold">
                              Yangi lead
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary truncate">
                            {truncate(lead.aiSummary, 48)}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {formatRelative(lead.createdAt)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              {user.role === 'superadmin' && (
                <button
                  type="button"
                  className="hidden rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-2 lg:inline-flex"
                  onClick={() => setIsCreateAdminOpen(true)}
                >
                  Admin qo'shish
                </button>
              )}
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {getInitials(user.name)}
                </span>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-medium text-text-primary leading-tight">{user.name}</p>
                <p className="text-xs text-text-muted leading-tight">
                  {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalDialog
        open={isCreateAdminOpen}
        title="Yangi admin yaratish"
        description="Bu forma `/admin/auth/create-admin` endpointiga ulanadi."
        onClose={() => !createAdminMutation.isPending && setIsCreateAdminOpen(false)}
        className="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="kas-btn-secondary"
              onClick={() => setIsCreateAdminOpen(false)}
              disabled={createAdminMutation.isPending}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              className="kas-btn-primary"
              onClick={handleCreateAdmin}
              disabled={
                createAdminMutation.isPending ||
                !createAdminForm.email.trim() ||
                !createAdminForm.password.trim() ||
                !createAdminForm.fullName.trim()
              }
            >
              {createAdminMutation.isPending ? 'Yaratilmoqda...' : 'Admin yaratish'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Full name</span>
            <input
              className="kas-input"
              value={createAdminForm.fullName}
              onChange={(event) =>
                setCreateAdminForm((current) => ({ ...current, fullName: event.target.value }))
              }
              placeholder="New KAS Admin"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Email</span>
            <input
              className="kas-input"
              type="email"
              value={createAdminForm.email}
              onChange={(event) =>
                setCreateAdminForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="new-admin@kas.uz"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Password</span>
            <input
              className="kas-input"
              type="password"
              value={createAdminForm.password}
              onChange={(event) =>
                setCreateAdminForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="SecurePassword123"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Role</span>
            <select
              className="kas-input"
              value={createAdminForm.role}
              onChange={(event) =>
                setCreateAdminForm((current) => ({
                  ...current,
                  role: event.target.value as CreateAdminFormState['role'],
                }))
              }
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </label>
        </div>
      </ModalDialog>
    </header>
  )
}
