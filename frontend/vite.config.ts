import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 🔥 关键：确保打包后的资源引用是相对路径
  plugins: [react()],
})
