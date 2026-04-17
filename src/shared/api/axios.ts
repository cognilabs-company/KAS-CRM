import axios, { type InternalAxiosRequestConfig } from 'axios'
import {
  ACCESS_TOKEN_STORAGE_KEY,
  API_BASE_URL,
  REFRESH_TOKEN_STORAGE_KEY,
  clearStoredAuth,
} from '@shared/api/backend'
import { useAuthStore } from '@shared/lib/store'
import type { BackendTokenResponse } from '@shared/api/backend'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

function logApiError(error: unknown, context = 'API request failed') {
  if (!axios.isAxiosError(error)) {
    console.error(`[${context}]`, error)
    return
  }

  const method = error.config?.method?.toUpperCase() ?? 'REQUEST'
  const url = error.config?.url ?? 'unknown endpoint'
  const status = error.response?.status
  const statusText = error.response?.statusText

  console.error(`[${context}] ${method} ${url}`, {
    baseURL: error.config?.baseURL,
    code: error.code,
    message: error.message,
    status,
    statusText,
    response: error.response?.data,
  })
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  if (!refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = axios
      .post<BackendTokenResponse>(`${API_BASE_URL}/admin/auth/refresh`, {
        refresh_token: refreshToken,
      })
      .then((response) => {
        const tokens = response.data
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.access_token)
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token)
        useAuthStore.getState().updateAccessToken(tokens.access_token)
        return tokens.access_token
      })
      .catch((error: unknown) => {
        logApiError(error, 'Token refresh request failed')
        useAuthStore.getState().logout()
        clearStoredAuth()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    logApiError(error, 'API request setup failed')
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined

    if (!originalRequest || error.response?.status !== 401) {
      logApiError(error)
      return Promise.reject(error)
    }

    if (
      originalRequest._retry ||
      originalRequest.url?.includes('/admin/auth/login') ||
      originalRequest.url?.includes('/admin/auth/refresh')
    ) {
      logApiError(error)
      useAuthStore.getState().logout()
      redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest._retry = true
    const nextAccessToken = await refreshAccessToken()

    if (!nextAccessToken) {
      redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
    return api.request(originalRequest)
  }
)

export default api
