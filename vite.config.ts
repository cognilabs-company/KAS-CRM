import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_PORT || 5173)
  const apiTarget = (env.VITE_API_BASE_URL || 'https://kas.api.cognilabs.org').replace(/\/$/, '')
  const hmrHost = env.VITE_HMR_HOST || undefined
  const hmrProtocol = env.VITE_HMR_PROTOCOL || undefined
  const hmrClientPort = Number(
    env.VITE_HMR_CLIENT_PORT || (hmrProtocol === 'wss' ? 443 : devPort)
  )

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: devPort,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        '/media': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
      allowedHosts: [
        'uncanonical-chantelle-winningly.ngrok-free.dev',
        'kas.api.cognilabs.org',
      ],
      hmr: hmrHost || hmrProtocol
        ? {
            host: hmrHost,
            protocol: hmrProtocol,
            clientPort: hmrClientPort,
          }
        : {
            clientPort: devPort,
          },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@app': path.resolve(__dirname, './src/app'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@widgets': path.resolve(__dirname, './src/widgets'),
        '@features': path.resolve(__dirname, './src/features'),
        '@entities': path.resolve(__dirname, './src/entities'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
  }
})
