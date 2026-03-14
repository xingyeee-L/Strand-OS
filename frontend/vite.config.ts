import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget =
    mode === 'development'
      ? (env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8000')
      : (env.VITE_BACKEND_URL || 'http://127.0.0.1:8000')

  return {
    base: './', // 🔥 关键：确保打包后的资源引用是相对路径
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'bypass-tunnel-reminder': 'true',
          },
        },
      },
    },
  }
})
