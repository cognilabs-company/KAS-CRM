import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import type { ReactNode } from 'react'
import { queryClient } from '@shared/lib/queryClient'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const showDevtools = import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true'

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgb(var(--surface))',
              color: 'rgb(var(--text-primary))',
              border: '1px solid rgb(var(--border))',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: 'rgb(var(--success))', secondary: 'rgb(var(--surface))' },
            },
            error: {
              iconTheme: { primary: 'rgb(var(--danger))', secondary: 'rgb(var(--surface))' },
            },
          }}
        />
      </BrowserRouter>
      {showDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
