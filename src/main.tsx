import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'

async function enableMocking() {
  if (import.meta.env.PROD) return

  const { worker } = await import('./shared/api/msw/browser')

  return worker.start({
    onUnhandledRequest: 'bypass',
  })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
