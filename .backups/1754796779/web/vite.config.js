import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/HFSys/",
  define: { 'import.meta.env.BUILD_ID': JSON.stringify(Date.now()) },
})
