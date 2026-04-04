import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@shared/types/api'

// ─── UI Store ─────────────────────────────────────────────────────────────────

interface UIState {
  isSidebarCollapsed: boolean
  theme: 'dark' | 'light'
  readChatIds: string[]
  seenNotificationKeys: string[]
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  toggleTheme: () => void
  markChatRead: (chatId: string) => void
  markNotificationSeen: (key: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      theme: 'dark',
      readChatIds: [],
      seenNotificationKeys: [],
      toggleSidebar: () =>
        set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      markChatRead: (chatId) =>
        set((s) => ({
          readChatIds: s.readChatIds.includes(chatId)
            ? s.readChatIds
            : [...s.readChatIds, chatId],
        })),
      markNotificationSeen: (key) =>
        set((s) => ({
          seenNotificationKeys: s.seenNotificationKeys.includes(key)
            ? s.seenNotificationKeys
            : [...s.seenNotificationKeys, key],
        })),
    }),
    {
      name: 'kas-ui',
      partialize: (s) => ({
        isSidebarCollapsed: s.isSidebarCollapsed,
        theme: s.theme,
        readChatIds: s.readChatIds,
        seenNotificationKeys: s.seenNotificationKeys,
      }),
    }
  )
)

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('kas_token', token)
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('kas_token')
        localStorage.removeItem('kas_user')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'kas-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)
