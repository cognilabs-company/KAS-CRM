import { useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  MessageSquare,
  Moon,
  Package,
  Search,
  Store as StoreIcon,
  Sun,
  Users,
  X,
} from 'lucide-react'
import api from '@shared/api/axios'
import { useAuthStore, useUIStore } from '@shared/lib/store'
import { formatRelative, getInitials, truncate } from '@shared/lib/utils'
import type { ChatUser, Lead, PaginatedResponse, Product, Store } from '@shared/types/api'

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
  | {
      id: string
      kind: 'chat'
      title: string
      subtitle: string
      meta: string
      href: string
    }
  | {
      id: string
      kind: 'lead'
      title: string
      subtitle: string
      meta: string
      href: string
    }
  | {
      id: string
      kind: 'product'
      title: string
      subtitle: string
      meta: string
      href: string
    }
  | {
      id: string
      kind: 'store'
      title: string
      subtitle: string
      meta: string
      href: string
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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const readChatIds = useUIStore((s) => s.readChatIds)
  const seenNotificationKeys = useUIStore((s) => s.seenNotificationKeys)
  const markNotificationSeen = useUIStore((s) => s.markNotificationSeen)

  const [search, setSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const deferredSearch = useDeferredValue(search.trim())

  useOutsideClick(searchRef, () => setIsSearchOpen(false), isSearchOpen)
  useOutsideClick(notificationsRef, () => setIsNotificationsOpen(false), isNotificationsOpen)

  const pageLabel = ROUTE_LABELS[pathname] ?? 'KAS CRM'
  const segments = pathname.split('/').filter(Boolean)

  const searchQueries = useQueries({
    queries: [
      {
        queryKey: ['header-search-chats', deferredSearch],
        queryFn: () =>
          api
            .get<PaginatedResponse<ChatUser>>('/chats', {
              params: { search: deferredSearch, page: 1, limit: 5 },
            })
            .then((r) => r.data),
        enabled: deferredSearch.length >= 2,
      },
      {
        queryKey: ['header-search-leads', deferredSearch],
        queryFn: () =>
          api
            .get<PaginatedResponse<Lead>>('/leads', {
              params: { search: deferredSearch, page: 1, limit: 5 },
            })
            .then((r) => r.data),
        enabled: deferredSearch.length >= 2,
      },
      {
        queryKey: ['header-search-products', deferredSearch],
        queryFn: () =>
          api
            .get<PaginatedResponse<Product>>('/products', {
              params: { search: deferredSearch, page: 1, limit: 4 },
            })
            .then((r) => r.data),
        enabled: deferredSearch.length >= 2,
      },
      {
        queryKey: ['header-search-stores', deferredSearch],
        queryFn: () =>
          api
            .get<PaginatedResponse<Store>>('/stores', {
              params: { search: deferredSearch, page: 1, limit: 4 },
            })
            .then((r) => r.data),
        enabled: deferredSearch.length >= 2,
      },
    ],
  })

  const [chatsResult, leadsResult, productsResult, storesResult] = searchQueries

  const searchResults = useMemo<SearchResult[]>(() => {
    if (deferredSearch.length < 2) return []

    const chats = (chatsResult.data?.data ?? []).map<SearchResult>((chat) => ({
      id: chat.id,
      kind: 'chat',
      title: chat.fullName,
      subtitle: chat.username ? `@${chat.username}` : 'Chat',
      meta: truncate(chat.lastMessage, 42),
      href: `/chats?userId=${chat.id}`,
    }))

    const leads = (leadsResult.data?.data ?? []).map<SearchResult>((lead) => ({
      id: lead.id,
      kind: 'lead',
      title: lead.fullName,
      subtitle: lead.username ? `@${lead.username}` : 'Lead',
      meta: truncate(lead.aiSummary, 42),
      href: `/leads?leadId=${lead.id}`,
    }))

    const products = (productsResult.data?.data ?? []).map<SearchResult>((product) => ({
      id: product.id,
      kind: 'product',
      title: product.name,
      subtitle: product.sku,
      meta: product.category,
      href: `/products?search=${encodeURIComponent(product.name)}`,
    }))

    const stores = (storesResult.data?.data ?? []).map<SearchResult>((store) => ({
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
    deferredSearch,
    leadsResult.data?.data,
    productsResult.data?.data,
    storesResult.data?.data,
  ])

  const notificationsChatsQuery = useQuery({
    queryKey: ['header-notification-chats'],
    queryFn: () =>
      api
        .get<PaginatedResponse<ChatUser>>('/chats', { params: { page: 1, limit: 100 } })
        .then((r) => r.data),
    staleTime: 30_000,
  })

  const notificationsLeadsQuery = useQuery({
    queryKey: ['header-notification-leads'],
    queryFn: () =>
      api
        .get<PaginatedResponse<Lead>>('/leads', { params: { page: 1, limit: 8 } })
        .then((r) => r.data),
    staleTime: 30_000,
  })

  const unreadChatNotifications = useMemo(() => {
    return (notificationsChatsQuery.data?.data ?? [])
      .map((chat) => ({
        ...chat,
        effectiveUnread: readChatIds.includes(chat.id) ? 0 : chat.unreadCount,
      }))
      .filter(
        (chat) =>
          chat.effectiveUnread > 0 &&
          !seenNotificationKeys.includes(`chat:${chat.id}`)
      )
      .slice(0, 5)
  }, [notificationsChatsQuery.data?.data, readChatIds, seenNotificationKeys])

  const leadNotifications = useMemo(() => {
    return (notificationsLeadsQuery.data?.data ?? [])
      .filter((lead) => !seenNotificationKeys.includes(`lead:${lead.id}`))
      .slice(0, 4)
  }, [notificationsLeadsQuery.data?.data, seenNotificationKeys])

  const notificationCount = unreadChatNotifications.length + leadNotifications.length

  function handleSearchResultClick(result: SearchResult) {
    setSearch('')
    setIsSearchOpen(false)
    navigate(result.href)
  }

  function handleChatNotificationClick(chatId: string) {
    markNotificationSeen(`chat:${chatId}`)
    setIsNotificationsOpen(false)
    navigate(`/chats?userId=${chatId}`)
  }

  function handleLeadNotificationClick(leadId: string) {
    markNotificationSeen(`lead:${leadId}`)
    setIsNotificationsOpen(false)
    navigate(`/leads?leadId=${leadId}`)
  }

  return (
    <header className="h-14 bg-surface border-b border-border sticky top-0 z-20 flex-shrink-0">
      <div className="h-full flex items-center justify-between gap-4 px-6 max-w-content mx-auto">
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-text-muted">KAS CRM</span>
          <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
          <span className="font-medium text-text-primary truncate">
            {segments.length === 0 ? 'Dashboard' : pageLabel}
          </span>
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
                {deferredSearch.length < 2 ? (
                  <div className="px-4 py-3 text-xs text-text-muted">
                    Kamida 2 ta harf yozing
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
                  <p className="text-xs text-text-muted">Yangi chatlar va leadlar</p>
                </div>

                {notificationCount === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-muted">
                    Hozircha yangi notification yo'q
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {unreadChatNotifications.map((chat) => (
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
                              {chat.effectiveUnread} ta yangi
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
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">
                  {getInitials(user.name)}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-text-primary leading-tight">{user.name}</p>
                <p className="text-xs text-text-muted leading-tight">
                  {user.role === 'super_admin' ? 'Super Admin' : 'KAS Admin'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
