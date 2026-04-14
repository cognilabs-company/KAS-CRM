import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminPage, AuthSession, AuthUser } from '@shared/types/api'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  clearStoredAuth,
  normalizeAdminAvailablePages,
} from '@shared/api/backend'

interface UIState {
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  theme: 'dark' | 'light'
  readChatIds: string[]
  seenNotificationKeys: string[]
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleMobileSidebar: () => void
  toggleTheme: () => void
  markChatRead: (chatId: string) => void
  markNotificationSeen: (key: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isMobileSidebarOpen: false,
      theme: 'dark',
      readChatIds: [],
      seenNotificationKeys: [],
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ isSidebarCollapsed: value }),
      openMobileSidebar: () => set({ isMobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
      toggleMobileSidebar: () =>
        set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      markChatRead: (chatId) =>
        set((state) => ({
          readChatIds: state.readChatIds.includes(chatId)
            ? state.readChatIds
            : [...state.readChatIds, chatId],
        })),
      markNotificationSeen: (key) =>
        set((state) => ({
          seenNotificationKeys: state.seenNotificationKeys.includes(key)
            ? state.seenNotificationKeys
            : [...state.seenNotificationKeys, key],
        })),
    }),
    {
      name: 'kas-ui',
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        theme: state.theme,
        readChatIds: state.readChatIds,
        seenNotificationKeys: state.seenNotificationKeys,
      }),
    }
  )
)

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  availablePages: AdminPage[]
  setAuth: (user: AuthUser, session: AuthSession) => void
  updateAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      availablePages: [],
      setAuth: (user, session) => {
        const availablePages = normalizeAdminAvailablePages(user.role, user.availablePages)
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken)
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken)
        set({
          user: { ...user, availablePages },
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          isAuthenticated: true,
          availablePages,
        })
      },
      updateAccessToken: (token) => {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
        set({ accessToken: token })
      },
      logout: () => {
        clearStoredAuth()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          availablePages: [],
        })
      },
    }),
    {
      name: 'kas-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        availablePages: state.availablePages,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AuthState> & {
          token?: string | null
          availablePages?: AdminPage[]
          user?: (AuthUser & { availablePages?: AdminPage[] }) | null
        }) ?? {}

        const legacyToken = typeof persisted.token === 'string' ? persisted.token : null
        const accessToken = persisted.accessToken ?? legacyToken ?? currentState.accessToken
        const availablePages =
          persisted.availablePages?.length
            ? persisted.availablePages
            : persisted.user?.availablePages?.length
              ? persisted.user.availablePages
              : currentState.availablePages
        const normalizedAvailablePages = persisted.user?.role
          ? normalizeAdminAvailablePages(persisted.user.role, availablePages)
          : availablePages
        const user = persisted.user
          ? { ...persisted.user, availablePages: normalizedAvailablePages }
          : null

        if (accessToken) {
          localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
        }
        if (persisted.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, persisted.refreshToken)
        }

        return {
          ...currentState,
          ...persisted,
          user,
          accessToken,
          availablePages: normalizedAvailablePages,
        }
      },
    }
  )
)
