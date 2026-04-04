import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
