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
      .catch(() => {
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
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    if (
      originalRequest._retry ||
      originalRequest.url?.includes('/admin/auth/login') ||
      originalRequest.url?.includes('/admin/auth/refresh')
    ) {
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
