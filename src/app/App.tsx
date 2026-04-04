import { useEffect } from 'react'
import { Providers } from './providers'
import { AppRouter } from './router'
import { useUIStore } from '@shared/lib/store'
import './styles/globals.css'

function ThemeSync() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return null
}

export function App() {
  return (
    <Providers>
      <ThemeSync />
      <AppRouter />
    </Providers>
  )
}
