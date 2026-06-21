import { useEffect, useState } from 'react'
import { Providers } from './providers'
import { AppRouter } from './router'
import { useUIStore } from '@shared/lib/store'
import { useAuthStore } from '@shared/lib/store'
import { applyAppearance } from '@shared/lib/appearance'
import api from '@shared/api/axios'
import type { AppearanceResponse } from '@shared/types/api'
import { KasLoader } from '@shared/ui/KasLoader'
import './styles/globals.css'

function ThemeSync() {
  const appearance = useUIStore((s) => s.appearance)
  const catalog = useUIStore((s) => s.appearanceCatalog)
  const setAppearanceResponse = useUIStore((s) => s.setAppearanceResponse)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    applyAppearance(appearance, catalog)
  }, [appearance, catalog])

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    setSyncing(true)
    api.get<AppearanceResponse>('/admin/appearance')
      .then((response) => {
        if (active) setAppearanceResponse(response.data)
      })
      .finally(() => {
        if (active) setSyncing(false)
      })
    return () => { active = false }
  }, [isAuthenticated, setAppearanceResponse])

  return syncing ? <KasLoader overlay label="Ko‘rinish sozlanmoqda" /> : null
}

export function App() {
  return (
    <Providers>
      <ThemeSync />
      <AppRouter />
    </Providers>
  )
}
