import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE || '/',  // مهم للنشر على Pages
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 443 },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '')
      }
    }
  }
})
